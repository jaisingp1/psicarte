require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const {
    timeToMinutes,
    minutesToTime,
    getAvailableSpots,
    getMonthlyAvailability,
    validateBookingSlot,
    getEffectiveRoomShiftsForDate
} = require('./availability-engine');
const {
    getGoogleOAuthUrl,
    handleGoogleOAuthCallback,
    triggerMeetLinkGeneration,
    retryMeetLinkGeneration,
    updateManualMeetLink
} = require('./google-meet');
const { sendBookingConfirmationEmail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret - regenerate on --reset for security
const JWT_SECRET = process.argv.includes('--reset')
    ? crypto.randomBytes(64).toString('hex')
    : process.env.JWT_SECRET || 'psicarte_jwt_secret_fallback';

// Auth Middleware - validates JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Sesión no válida. Inicie sesión nuevamente.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Sesión expirada. Inicie sesión nuevamente.' });
        }
        req.user = user;
        next();
    });
}

// Optional Auth Middleware (sets req.user if token present)
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) req.user = user;
        next();
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static frontend files from /public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper DB Promise wrappers
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

// =====================================================
// SECTION 2: KHIPU PAYMENT GATEWAY HELPERS (API v3)
// =====================================================
const KHIPU_API_URL = process.env.KHIPU_API_URL || 'https://payment-api.khipu.com/v3';

async function callKhipuApi(method, endpoint, body = null) {
    const apiKey = process.env.KHIPU_API_KEY;
    if (!apiKey) {
        throw new Error('KHIPU_API_KEY no configurada');
    }

    const url = `${KHIPU_API_URL}${endpoint}`;
    const headers = {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const options = { method, headers };
    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Khipu API error (${response.status}): ${errorText}`);
    }

    return response.json();
}

function reconcileBookingPayment(bookingId, doneCallback = () => { }) {
    db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], async (errBk, booking) => {
        if (errBk || !booking) {
            return doneCallback(errBk || new Error('Reserva no encontrada'));
        }
        if (booking.status === 'Paid') {
            return doneCallback(null, 'Already processed');
        }

        const slotStartMin = timeToMinutes(booking.startTime);
        const slotEndMin = timeToMinutes(booking.endTime);

        try {
            // 1. Conflict check: same provider in any room
            const provBooks = await dbAll(
                "SELECT * FROM bookings WHERE providerId = ? AND date = ? AND status = 'Paid' AND id != ?",
                [booking.providerId, booking.date, bookingId]
            );
            const hasOverlappingBooking = provBooks.some(bk => {
                const bkStart = timeToMinutes(bk.startTime);
                const bkEnd = timeToMinutes(bk.endTime);
                return slotStartMin < bkEnd && bkStart < slotEndMin;
            });

            // 2. Conflict check: same room if physical
            const room = await dbGet('SELECT type FROM rooms WHERE id = ?', [booking.roomId]);
            let hasRoomConflict = false;
            if (room && room.type === 'Física') {
                const roomBooks = await dbAll(
                    "SELECT * FROM bookings WHERE roomId = ? AND date = ? AND status = 'Paid' AND id != ?",
                    [booking.roomId, booking.date, bookingId]
                );
                hasRoomConflict = roomBooks.some(bk => {
                    const bkStart = timeToMinutes(bk.startTime);
                    const bkEnd = timeToMinutes(bk.endTime);
                    return slotStartMin < bkEnd && bkStart < slotEndMin;
                });
            }

            let finalStatus = 'Paid';
            if (hasOverlappingBooking || hasRoomConflict) {
                console.error(`Conflict detected for booking ${bookingId}. Marking as Payment_Conflict.`);
                finalStatus = 'Payment_Conflict';
            }

            await dbRun('UPDATE bookings SET status = ? WHERE id = ?', [finalStatus, bookingId]);

            if (finalStatus === 'Paid') {
                // Generar Meet Link si es sala virtual con Meet activo
                triggerMeetLinkGeneration(db, bookingId).catch(meetErr => {
                    console.error(`[Google Meet Trigger] Error en reserva ${bookingId}:`, meetErr.message);
                });
                // Enviar confirmación por correo
                sendBookingConfirmationEmail(db, bookingId);
            }

            doneCallback(null, finalStatus);
        } catch (errRec) {
            console.error('Error reconciling payment:', errRec.message);
            doneCallback(errRec);
        }
    });
}

// =====================================================
// SECTION 3: AUTH ENDPOINTS
// =====================================================
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const lookupEmail = (cleanEmail === 'admin' || cleanEmail === 'admin@psicarte.cl')
        ? 'admin@centropsicarte.cl'
        : cleanEmail;

    db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [lookupEmail], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role, name: user.name },
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        });
    });
});

app.post('/api/auth/recover', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email requerido.' });
    }

    db.get('SELECT id, email FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            message: 'Si el correo existe en nuestro sistema, recibirá instrucciones para restablecer su contraseña.'
        });
    });
});

// =====================================================
// SECTION 4: USER ENDPOINTS (Admin CRUD) - PROTECTED
// =====================================================
app.get('/api/users', authenticateToken, (req, res) => {
    db.all('SELECT id, email, name, role, rut, phone, created_at FROM users', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', authenticateToken, async (req, res) => {
    const { email, password, name, role, rut, phone, specialty, bio } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = req.body.id || crypto.randomUUID();

        db.serialize(() => {
            db.run(
                'INSERT INTO users (id, email, password, name, role, rut, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, email, hashedPassword, name, role || 'usuario', rut || '', phone || ''],
                function (err) {
                    if (err) {
                        if (err.message.includes('UNIQUE')) {
                            return res.status(400).json({ error: 'El email ya está registrado.' });
                        }
                        return res.status(500).json({ error: err.message });
                    }

                    if (role === 'prestador') {
                        db.run(
                            'INSERT OR REPLACE INTO provider_profiles (userId, specialty, bio) VALUES (?, ?, ?)',
                            [userId, specialty || '', bio || '']
                        );
                    }

                    res.json({ success: true, id: userId });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    const { email, password, name, role, rut, phone, specialty, bio } = req.body;

    try {
        let updateQuery = 'UPDATE users SET email = ?, name = ?, role = ?, rut = ?, phone = ?';
        let params = [email, name, role, rut, phone];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            params.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        params.push(req.params.id);

        db.serialize(() => {
            db.run(updateQuery, params, function (err) {
                if (err) return res.status(500).json({ error: err.message });

                if (role === 'prestador') {
                    db.run(
                        'INSERT OR REPLACE INTO provider_profiles (userId, specialty, bio) VALUES (?, ?, ?)',
                        [req.params.id, specialty || '', bio || '']
                    );
                }

                res.json({ success: true });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
    db.serialize(() => {
        db.run('DELETE FROM provider_services WHERE provider_id = ?', [req.params.id]);
        db.run('DELETE FROM room_shifts WHERE provider_id = ?', [req.params.id]);
        db.run('DELETE FROM provider_vacations WHERE provider_id = ?', [req.params.id]);
        db.run('DELETE FROM provider_room_google_accounts WHERE provider_id = ?', [req.params.id]);
        db.run('DELETE FROM provider_profiles WHERE userId = ?', [req.params.id]);
        db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// =====================================================
// SECTION 5: CONTENT & COMMUNITY ARTICLES ENDPOINTS
// =====================================================
app.get('/api/content', (req, res) => {
    db.all('SELECT * FROM content', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const content = {};
        (rows || []).forEach(row => { content[row.key] = row.value; });
        res.json(content);
    });
});

app.post('/api/content', authenticateToken, (req, res) => {
    const data = req.body;
    db.serialize(() => {
        const stmt = db.prepare('INSERT OR REPLACE INTO content (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(data)) {
            stmt.run([key, typeof value === 'object' ? JSON.stringify(value) : String(value)]);
        }
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.get('/api/articles', (req, res) => {
    db.all(`
        SELECT a.*, u.name as author_name
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.status = 'published'
        ORDER BY a.published_at DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/articles/submissions', authenticateToken, (req, res) => {
    db.all(`
        SELECT a.*, u.name as author_name, u.email as author_email
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        ORDER BY a.created_at DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/articles', authenticateToken, (req, res) => {
    const { title, summary, body } = req.body;
    if (!title || !summary || !body) {
        return res.status(400).json({ error: 'Título, resumen y cuerpo son requeridos.' });
    }

    const id = crypto.randomUUID();
    const isAdmin = req.user?.role === 'administrador';
    const status = isAdmin ? 'published' : 'pending_review';
    const publishedAt = isAdmin ? new Date().toISOString() : null;

    db.run(`
        INSERT INTO articles (id, author_id, title, summary, body, status, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, req.user.id, title, summary, body, status, publishedAt], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id, status });
    });
});

app.put('/api/articles/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    if (!['pending_review', 'published', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado de artículo no válido.' });
    }

    const publishedAt = status === 'published' ? new Date().toISOString() : null;
    db.run(`
        UPDATE articles
        SET status = ?, published_at = COALESCE(published_at, ?), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [status, publishedAt, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =====================================================
// SECTION 6: ROOMS, SHIFTS, BREAKS & EXCEPTIONS
// =====================================================
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await dbAll('SELECT * FROM rooms ORDER BY name');
        const shifts = await dbAll(`
            SELECT s.*, u.name as provider_name
            FROM room_shifts s
            JOIN users u ON s.provider_id = u.id
            ORDER BY s.room_id, s.day_of_week, s.start_time
        `);
        const breaks = await dbAll('SELECT * FROM room_shift_breaks ORDER BY start_time');
        const roomServices = await dbAll('SELECT * FROM room_services');

        const breaksByShift = {};
        for (const b of breaks) {
            if (!breaksByShift[b.shift_id]) breaksByShift[b.shift_id] = [];
            breaksByShift[b.shift_id].push(b);
        }

        const shiftsByRoom = {};
        for (const s of shifts) {
            if (!shiftsByRoom[s.room_id]) shiftsByRoom[s.room_id] = [];
            shiftsByRoom[s.room_id].push({
                ...s,
                breaks: breaksByShift[s.id] || []
            });
        }

        const servicesByRoom = {};
        for (const rs of roomServices) {
            if (!servicesByRoom[rs.room_id]) servicesByRoom[rs.room_id] = [];
            servicesByRoom[rs.room_id].push(rs.service_id);
        }

        const result = rooms.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            capacity: r.type === 'Física' ? (r.capacity || 1) : 0,
            effective_capacity: 1,
            meet_enabled: r.type === 'Virtual' ? (r.meet_enabled !== 0 ? 1 : 0) : 0,
            allow_all_services: r.allow_all_services !== 0 ? 1 : 0,
            min_advance_min: r.min_advance_min || 0,
            max_advance_days: r.max_advance_days || 60,
            service_ids: servicesByRoom[r.id] || [],
            shifts: shiftsByRoom[r.id] || []
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
    const {
        id,
        name,
        type,
        capacity,
        meet_enabled,
        allow_all_services,
        min_advance_min,
        max_advance_days,
        service_ids,
        shifts
    } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: 'Nombre y tipo de sala son requeridos.' });
    }

    const roomId = id || crypto.randomUUID();
    const isVirtual = type === 'Virtual';
    const roomCapacity = isVirtual ? 1 : (Number(capacity) || 1);
    const roomMeetEnabled = isVirtual ? (meet_enabled !== undefined ? (meet_enabled ? 1 : 0) : 1) : 0;
    const roomAllowAll = allow_all_services !== undefined ? (allow_all_services ? 1 : 0) : 1;
    const minAdvance = Number(min_advance_min) || 0;
    const maxAdvance = Number(max_advance_days) || 60;

    try {
        await dbRun(`
            INSERT INTO rooms (id, name, type, capacity, meet_enabled, allow_all_services, min_advance_min, max_advance_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [roomId, name, type, roomCapacity, roomMeetEnabled, roomAllowAll, minAdvance, maxAdvance]);

        // Guardar servicios si allow_all_services === 0
        if (!roomAllowAll && Array.isArray(service_ids)) {
            for (const sId of service_ids) {
                await dbRun('INSERT OR IGNORE INTO room_services (id, room_id, service_id) VALUES (?, ?, ?)', [crypto.randomUUID(), roomId, sId]);
            }
        }

        // Guardar franjas y descansos
        if (Array.isArray(shifts)) {
            for (const s of shifts) {
                const shiftId = s.id || crypto.randomUUID();
                await dbRun(`
                    INSERT INTO room_shifts (id, room_id, day_of_week, start_time, end_time, provider_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [shiftId, roomId, s.day_of_week, s.start_time, s.end_time, s.provider_id]);

                if (Array.isArray(s.breaks)) {
                    for (const b of s.breaks) {
                        await dbRun(`
                            INSERT INTO room_shift_breaks (id, shift_id, start_time, end_time)
                            VALUES (?, ?, ?, ?)
                        `, [crypto.randomUUID(), shiftId, b.start_time, b.end_time]);
                    }
                }
            }
        }

        res.json({ success: true, id: roomId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rooms/:id', authenticateToken, async (req, res) => {
    const {
        name,
        type,
        capacity,
        meet_enabled,
        allow_all_services,
        min_advance_min,
        max_advance_days,
        service_ids,
        shifts
    } = req.body;

    const roomId = req.params.id;
    const isVirtual = type === 'Virtual';
    const roomCapacity = isVirtual ? 1 : (Number(capacity) || 1);
    const roomMeetEnabled = isVirtual ? (meet_enabled ? 1 : 0) : 0;
    const roomAllowAll = allow_all_services ? 1 : 0;
    const minAdvance = Number(min_advance_min) || 0;
    const maxAdvance = Number(max_advance_days) || 60;

    try {
        const updateRes = await dbRun(`
            UPDATE rooms
            SET name = ?, type = ?, capacity = ?, meet_enabled = ?, allow_all_services = ?,
                min_advance_min = ?, max_advance_days = ?
            WHERE id = ?
        `, [name, type, roomCapacity, roomMeetEnabled, roomAllowAll, minAdvance, maxAdvance, roomId]);

        if (updateRes.changes === 0) {
            return res.status(404).json({ error: 'Sala no encontrada.' });
        }

        // Actualizar room_services
        await dbRun('DELETE FROM room_services WHERE room_id = ?', [roomId]);
        if (!roomAllowAll && Array.isArray(service_ids)) {
            for (const sId of service_ids) {
                await dbRun('INSERT OR IGNORE INTO room_services (id, room_id, service_id) VALUES (?, ?, ?)', [crypto.randomUUID(), roomId, sId]);
            }
        }

        // Si se enviaron shifts, sincronizarlos
        if (Array.isArray(shifts)) {
            await dbRun('DELETE FROM room_shifts WHERE room_id = ?', [roomId]);
            for (const s of shifts) {
                const shiftId = s.id || crypto.randomUUID();
                await dbRun(`
                    INSERT INTO room_shifts (id, room_id, day_of_week, start_time, end_time, provider_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [shiftId, roomId, s.day_of_week, s.start_time, s.end_time, s.provider_id]);

                if (Array.isArray(s.breaks)) {
                    for (const b of s.breaks) {
                        await dbRun(`
                            INSERT INTO room_shift_breaks (id, shift_id, start_time, end_time)
                            VALUES (?, ?, ?, ?)
                        `, [crypto.randomUUID(), shiftId, b.start_time, b.end_time]);
                    }
                }
            }
        }

        res.json({ success: true, message: 'Sala actualizada con éxito.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
    try {
        await dbRun('DELETE FROM rooms WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Excepciones de Sala
app.get('/api/rooms/:roomId/exceptions', authenticateToken, async (req, res) => {
    try {
        const exceptions = await dbAll(`
            SELECT e.*, u.name as provider_name
            FROM room_exceptions e
            LEFT JOIN users u ON e.provider_id = u.id
            WHERE e.room_id = ?
            ORDER BY e.date DESC
        `, [req.params.roomId]);

        const breaks = await dbAll(`
            SELECT b.* FROM room_exception_breaks b
            JOIN room_exceptions e ON b.exception_id = e.id
            WHERE e.room_id = ?
        `, [req.params.roomId]);

        const breaksByException = {};
        for (const b of breaks) {
            if (!breaksByException[b.exception_id]) breaksByException[b.exception_id] = [];
            breaksByException[b.exception_id].push(b);
        }

        const result = exceptions.map(e => ({
            ...e,
            breaks: breaksByException[e.id] || []
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rooms/:roomId/exceptions', authenticateToken, async (req, res) => {
    const date = req.body.date || req.body.exception_date;
    const type = req.body.type || req.body.exception_type;
    const { target_shift_id, start_time, end_time, provider_id, reason, breaks } = req.body;
    if (!date || !type) {
        return res.status(400).json({ error: 'Fecha y tipo de excepción requeridos.' });
    }

    const exceptionId = crypto.randomUUID();
    try {
        await dbRun(`
            INSERT INTO room_exceptions (id, room_id, date, type, target_shift_id, start_time, end_time, provider_id, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [exceptionId, req.params.roomId, date, type, target_shift_id || null, start_time || null, end_time || null, provider_id || null, reason || '']);

        if (Array.isArray(breaks)) {
            for (const b of breaks) {
                await dbRun(`
                    INSERT INTO room_exception_breaks (id, exception_id, start_time, end_time)
                    VALUES (?, ?, ?, ?)
                `, [crypto.randomUUID(), exceptionId, b.start_time, b.end_time]);
            }
        }

        res.json({ success: true, id: exceptionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/room-exceptions/:id', authenticateToken, async (req, res) => {
    const { date, type, target_shift_id, start_time, end_time, provider_id, reason, breaks } = req.body;
    try {
        await dbRun(`
            UPDATE room_exceptions
            SET date = ?, type = ?, target_shift_id = ?, start_time = ?, end_time = ?, provider_id = ?, reason = ?
            WHERE id = ?
        `, [date, type, target_shift_id || null, start_time || null, end_time || null, provider_id || null, reason || '', req.params.id]);

        await dbRun('DELETE FROM room_exception_breaks WHERE exception_id = ?', [req.params.id]);
        if (Array.isArray(breaks)) {
            for (const b of breaks) {
                await dbRun(`
                    INSERT INTO room_exception_breaks (id, exception_id, start_time, end_time)
                    VALUES (?, ?, ?, ?)
                `, [crypto.randomUUID(), req.params.id, b.start_time, b.end_time]);
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/room-exceptions/:id', authenticateToken, async (req, res) => {
    try {
        await dbRun('DELETE FROM room_exceptions WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// SECTION 7: PROVIDERS ENDPOINT
// =====================================================
app.get('/api/providers', async (req, res) => {
    try {
        const provs = await dbAll(`
            SELECT u.id, u.name, u.email, u.role, p.specialty, p.bio
            FROM users u
            JOIN provider_profiles p ON u.id = p.userId
            WHERE u.role = 'prestador'
            ORDER BY u.name
        `);

        const provServices = await dbAll(`
            SELECT ps.*, s.name as service_name, s.description as service_desc,
                   s.allowReschedule, s.maxReschedules, s.min_advance_min, s.max_advance_days
            FROM provider_services ps
            JOIN services s ON ps.service_id = s.id
        `);

        const shifts = await dbAll(`
            SELECT s.*, r.name as room_name, r.type as room_type
            FROM room_shifts s
            JOIN rooms r ON s.room_id = r.id
        `);

        const result = provs.map(p => {
            const pServices = provServices
                .filter(ps => ps.provider_id === p.id)
                .map(ps => ({
                    id: ps.service_id,
                    service_id: ps.service_id,
                    name: ps.service_name,
                    description: ps.service_desc,
                    duration: ps.duration,
                    price: ps.price,
                    allowReschedule: ps.allowReschedule,
                    maxReschedules: ps.maxReschedules,
                    min_advance_min: ps.min_advance_min,
                    max_advance_days: ps.max_advance_days
                }));

            const pShifts = shifts.filter(s => s.provider_id === p.id);

            return {
                id: p.id,
                name: p.name,
                email: p.email,
                role: p.role,
                specialty: p.specialty || '',
                bio: p.bio || '',
                services: pServices,
                shifts: pShifts
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// SECTION 8: SERVICES (Master Catalog & Provider Pricing)
// =====================================================
app.get('/api/services', async (req, res) => {
    try {
        const services = await dbAll('SELECT * FROM services ORDER BY name');
        const provServices = await dbAll(`
            SELECT ps.*, u.name as provider_name
            FROM provider_services ps
            JOIN users u ON ps.provider_id = u.id
            ORDER BY u.name
        `);

        const result = services.map(s => {
            const providers = provServices
                .filter(ps => ps.service_id === s.id)
                .map(ps => ({
                    provider_id: ps.provider_id,
                    provider_name: ps.provider_name,
                    duration: ps.duration,
                    price: ps.price
                }));

            return {
                ...s,
                providers
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/services', authenticateToken, async (req, res) => {
    const {
        id,
        name,
        description,
        allowReschedule,
        maxReschedules,
        min_advance_min,
        max_advance_days,
        providers
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nombre de servicio requerido.' });
    }

    const serviceId = id || crypto.randomUUID();
    const allowRes = allowReschedule !== undefined ? (allowReschedule ? 1 : 0) : 1;
    const maxRes = Number(maxReschedules) || 1;
    const minAdvance = Number(min_advance_min) || 0;
    const maxAdvance = Number(max_advance_days) || 60;

    try {
        await dbRun(`
            INSERT INTO services (id, name, description, allowReschedule, maxReschedules, min_advance_min, max_advance_days)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [serviceId, name, description || '', allowRes, maxRes, minAdvance, maxAdvance]);

        if (Array.isArray(providers)) {
            for (const p of providers) {
                if (p.provider_id && p.duration) {
                    const durationVal = Math.round(Number(p.duration) / 5) * 5; // Múltiplo de 5 min
                    const priceVal = Number(p.price) || 0;
                    await dbRun(`
                        INSERT OR REPLACE INTO provider_services (id, provider_id, service_id, duration, price)
                        VALUES (?, ?, ?, ?, ?)
                    `, [crypto.randomUUID(), p.provider_id, serviceId, durationVal, priceVal]);
                }
            }
        }

        res.json({ success: true, id: serviceId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/services/:id', authenticateToken, async (req, res) => {
    const {
        name,
        description,
        allowReschedule,
        maxReschedules,
        min_advance_min,
        max_advance_days,
        providers
    } = req.body;

    const serviceId = req.params.id;
    const allowRes = allowReschedule ? 1 : 0;
    const maxRes = Number(maxReschedules) || 1;
    const minAdvance = Number(min_advance_min) || 0;
    const maxAdvance = Number(max_advance_days) || 60;

    try {
        await dbRun(`
            UPDATE services
            SET name = ?, description = ?, allowReschedule = ?, maxReschedules = ?,
                min_advance_min = ?, max_advance_days = ?
            WHERE id = ?
        `, [name, description || '', allowRes, maxRes, minAdvance, maxAdvance, serviceId]);

        if (Array.isArray(providers)) {
            await dbRun('DELETE FROM provider_services WHERE service_id = ?', [serviceId]);
            for (const p of providers) {
                if (p.provider_id && p.duration) {
                    const durationVal = Math.round(Number(p.duration) / 5) * 5;
                    const priceVal = Number(p.price) || 0;
                    await dbRun(`
                        INSERT INTO provider_services (id, provider_id, service_id, duration, price)
                        VALUES (?, ?, ?, ?, ?)
                    `, [crypto.randomUUID(), p.provider_id, serviceId, durationVal, priceVal]);
                }
            }
        }

        res.json({ success: true, message: 'Servicio actualizado correctamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/services/:id', authenticateToken, async (req, res) => {
    try {
        await dbRun('DELETE FROM services WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/services/:serviceId/providers', authenticateToken, async (req, res) => {
    try {
        const { provider_id, duration, price } = req.body;
        if (!provider_id || !duration) {
            return res.status(400).json({ error: 'Prestador y duración son requeridos.' });
        }
        const durationVal = Math.max(5, Math.round(Number(duration) / 5) * 5);
        const priceVal = Number(price) || 0;
        await dbRun(`
            INSERT OR REPLACE INTO provider_services (id, provider_id, service_id, duration, price)
            VALUES (
                COALESCE((SELECT id FROM provider_services WHERE provider_id = ? AND service_id = ?), ?),
                ?, ?, ?, ?
            )
        `, [provider_id, req.params.serviceId, crypto.randomUUID(), provider_id, req.params.serviceId, durationVal, priceVal]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/services/:serviceId/providers/:providerId', authenticateToken, async (req, res) => {
    try {
        await dbRun('DELETE FROM provider_services WHERE service_id = ? AND provider_id = ?', [req.params.serviceId, req.params.providerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// SECTION 9: PROVIDER VACATIONS
// =====================================================
app.get('/api/vacations', authenticateToken, async (req, res) => {
    try {
        let sql = `
            SELECT v.*, u.name as provider_name
            FROM provider_vacations v
            JOIN users u ON v.provider_id = u.id
        `;
        const params = [];

        // Si el usuario es prestador no-admin, solo ve sus propias vacaciones
        if (req.user.role === 'prestador') {
            sql += ' WHERE v.provider_id = ?';
            params.push(req.user.id);
        }

        sql += ' ORDER BY v.start_date DESC';
        const vacations = await dbAll(sql, params);
        res.json(vacations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vacations', authenticateToken, async (req, res) => {
    const { provider_id, start_date, end_date, start_time, end_time, reason } = req.body;
    const targetProviderId = req.user.role === 'prestador' ? req.user.id : provider_id;

    if (!targetProviderId || !start_date || !end_date) {
        return res.status(400).json({ error: 'Prestador, fecha de inicio y fecha de fin son requeridos.' });
    }

    try {
        // Verificar si el prestador tiene citas activas en el rango
        const activeBookings = await dbAll(`
            SELECT id, date, startTime, endTime, clientName, serviceName
            FROM bookings
            WHERE providerId = ?
              AND date >= ? AND date <= ?
              AND (status = 'Paid' OR status = 'Pending_Payment')
        `, [targetProviderId, start_date, end_date]);

        if (activeBookings.length > 0) {
            return res.status(400).json({
                error: `No se pueden registrar vacaciones porque existen ${activeBookings.length} cita(s) agendada(s) en ese período. Debe moverlas o cancelarlas antes.`,
                conflictingBookings: activeBookings
            });
        }

        const id = crypto.randomUUID();
        await dbRun(`
            INSERT INTO provider_vacations (id, provider_id, start_date, end_date, start_time, end_time, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, targetProviderId, start_date, end_date, start_time || '00:00', end_time || '23:59', reason || '']);

        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/vacations/:id', authenticateToken, async (req, res) => {
    try {
        let sql = 'DELETE FROM provider_vacations WHERE id = ?';
        const params = [req.params.id];
        if (req.user.role === 'prestador') {
            sql += ' AND provider_id = ?';
            params.push(req.user.id);
        }
        await dbRun(sql, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// SECTION 10: AVAILABILITY ENGINE (Public 5-Min Grid)
// =====================================================
app.get('/api/availability', async (req, res) => {
    const { serviceId, providerId, date, month, year } = req.query;

    if (!serviceId) {
        return res.status(400).json({ error: 'serviceId es requerido.' });
    }

    try {
        if (month && year) {
            // Consulta mensual de días con disponibilidad
            const availableDates = await getMonthlyAvailability(db, {
                serviceId,
                providerId: providerId || null,
                year: Number(year),
                month: Number(month)
            });
            return res.json({ availableDates });
        }

        if (date) {
            // Consulta diaria de todos los spots factibles en rejilla de 5 min
            const spots = await getAvailableSpots(db, {
                serviceId,
                providerId: providerId || null,
                date
            });
            return res.json({ spots });
        }

        return res.status(400).json({ error: 'Debe especificar date (YYYY-MM-DD) o month y year.' });
    } catch (err) {
        console.error('Error calculando disponibilidad:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// SECTION 11: ADMINISTRATIVE 5-MIN CALENDAR
// =====================================================
async function getAdminCalendarHandler(req, res) {
    const { startDate, endDate, roomId, providerId } = req.query;
    const start = startDate || new Date().toISOString().slice(0, 10);
    const end = endDate || start;

    try {
        const rooms = await dbAll('SELECT * FROM rooms');
        const providers = await dbAll("SELECT id, name, email FROM users WHERE role = 'prestador'");

        let bookingsSql = `
            SELECT b.*, u.name as provider_name, r.name as room_name
            FROM bookings b
            JOIN users u ON b.providerId = u.id
            JOIN rooms r ON b.roomId = r.id
            WHERE b.date >= ? AND b.date <= ?
              AND (b.status = 'Paid' OR b.status = 'Pending_Payment')
        `;
        const bookingsParams = [start, end];
        if (roomId) {
            bookingsSql += ' AND b.roomId = ?';
            bookingsParams.push(roomId);
        }
        if (providerId) {
            bookingsSql += ' AND b.providerId = ?';
            bookingsParams.push(providerId);
        }
        bookingsSql += ' ORDER BY b.date, b.startTime';
        const bookings = await dbAll(bookingsSql, bookingsParams);

        const vacations = await dbAll(`
            SELECT v.*, u.name as provider_name
            FROM provider_vacations v
            JOIN users u ON v.provider_id = u.id
            WHERE v.start_date <= ? AND v.end_date >= ?
        `, [end, start]);

        const exceptions = await dbAll(`
            SELECT e.*, r.name as room_name, u.name as provider_name
            FROM room_exceptions e
            JOIN rooms r ON e.room_id = r.id
            LEFT JOIN users u ON e.provider_id = u.id
            WHERE e.date >= ? AND e.date <= ?
        `, [start, end]);

        // Franjas efectivas por día
        const days = [];
        const curr = new Date(start + 'T00:00:00');
        const stop = new Date(end + 'T00:00:00');

        while (curr <= stop) {
            const dateStr = curr.toISOString().slice(0, 10);
            let effectiveShifts = await getEffectiveRoomShiftsForDate(db, dateStr);
            if (roomId) effectiveShifts = effectiveShifts.filter(s => s.roomId === roomId);
            if (providerId) effectiveShifts = effectiveShifts.filter(s => s.providerId === providerId);

            days.push({
                date: dateStr,
                shifts: effectiveShifts,
                bookings: bookings.filter(b => b.date === dateStr),
                vacations: vacations.filter(v => dateStr >= v.start_date && dateStr <= v.end_date),
                exceptions: exceptions.filter(e => e.date === dateStr)
            });
            curr.setDate(curr.getDate() + 1);
        }

        res.json({
            startDate: start,
            endDate: end,
            rooms,
            providers,
            days,
            bookings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

app.get('/api/admin/calendar', authenticateToken, getAdminCalendarHandler);
// Alias retrocompatible para evitar errores 404 (Regla R15)
app.get('/api/rooms/schedule/all', authenticateToken, getAdminCalendarHandler);

// =====================================================
// SECTION 12: BOOKINGS ENDPOINTS
// =====================================================
app.get('/api/bookings', optionalAuth, async (req, res) => {
    try {
        let sql = `
            SELECT b.*, u.name as provider_name, r.name as room_name
            FROM bookings b
            LEFT JOIN users u ON b.providerId = u.id
            LEFT JOIN rooms r ON b.roomId = r.id
            WHERE 1=1
        `;
        const params = [];

        // Filtro por rol si está autenticado
        if (req.user) {
            if (req.user.role === 'prestador') {
                sql += ' AND b.providerId = ?';
                params.push(req.user.id);
            } else if (req.user.role === 'usuario') {
                sql += ' AND (b.client_id = ? OR b.clientEmail = ?)';
                params.push(req.user.id, req.user.email);
            }
        }

        if (req.query.date) {
            sql += ' AND b.date = ?';
            params.push(req.query.date);
        }
        if (req.query.status) {
            sql += ' AND b.status = ?';
            params.push(req.query.status);
        }

        sql += ' ORDER BY b.date DESC, b.startTime DESC';
        const bookings = await dbAll(sql, params);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resumen público para pantalla de confirmación post-pago
app.get('/api/bookings/:id/public-summary', async (req, res) => {
    try {
        const booking = await dbGet(`
            SELECT id, date, startTime, endTime, timeSlot, serviceName, roomName, status,
                   meet_link, meet_status, clientName
            FROM bookings
            WHERE id = ?
        `, [req.params.id]);

        if (!booking) {
            return res.status(404).json({ error: 'Reserva no encontrada.' });
        }

        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', optionalAuth, async (req, res) => {
    const {
        serviceId,
        providerId,
        roomId,
        date,
        startTime,
        clientName,
        clientEmail,
        clientRut,
        clientPhone,
        adminMode
    } = req.body;

    if (!serviceId || !providerId || !roomId || !date || !startTime || !clientEmail || !clientName) {
        return res.status(400).json({ error: 'Faltan datos obligatorios para crear la reserva.' });
    }

    try {
        // Revalidación estricta de todas las reglas del motor
        const validation = await validateBookingSlot(db, {
            roomId,
            providerId,
            serviceId,
            date,
            startTime
        });

        if (!validation.valid) {
            return res.status(409).json({ error: validation.error });
        }

        // Buscar o crear usuario cliente
        let clientUser = await dbGet('SELECT id FROM users WHERE email = ?', [clientEmail]);
        let clientId;
        if (clientUser) {
            clientId = clientUser.id;
        } else {
            clientId = req.user?.id || 'usr-' + Date.now();
            await dbRun(`
                INSERT OR IGNORE INTO users (id, email, password, name, role, rut, phone)
                VALUES (?, ?, '', ?, 'usuario', ?, ?)
            `, [clientId, clientEmail, clientName, clientRut || '', clientPhone || '']);
        }

        const bookingId = crypto.randomUUID();
        const initialStatus = (adminMode && req.user?.role === 'administrador') ? 'Paid' : 'Pending_Payment';
        const isVirtual = validation.room.type === 'Virtual';
        const meetEnabled = isVirtual && validation.room.meet_enabled === 1;
        const initialMeetStatus = meetEnabled ? 'pending' : 'none';

        await dbRun(`
            INSERT INTO bookings (
                id, client_id, providerId, serviceId, roomId, serviceName, price, duration,
                roomName, date, startTime, endTime, timeSlot, clientEmail, clientName, clientRut, clientPhone,
                status, meet_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            bookingId,
            clientId,
            providerId,
            serviceId,
            roomId,
            validation.service.name,
            validation.price,
            validation.duration,
            validation.room.name,
            date,
            validation.startTime,
            validation.endTime,
            validation.timeSlot,
            clientEmail,
            clientName,
            clientRut || '',
            clientPhone || '',
            initialStatus,
            initialMeetStatus
        ]);

        if (initialStatus === 'Paid') {
            triggerMeetLinkGeneration(db, bookingId).catch(console.error);
            sendBookingConfirmationEmail(db, bookingId);
        }

        res.json({
            success: true,
            id: bookingId,
            booking: {
                id: bookingId,
                status: initialStatus,
                date,
                timeSlot: validation.timeSlot,
                price: validation.price
            }
        });

    } catch (err) {
        console.error('Error creando reserva:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Mover cita (Admin / Prestador)
app.post('/api/bookings/:id/move', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { newDate, newStartTime, newRoomId } = req.body;

    if (!newDate || !newStartTime) {
        return res.status(400).json({ error: 'Fecha y hora requeridas para mover la cita.' });
    }

    try {
        const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
        if (!booking) {
            return res.status(404).json({ error: 'Reserva no encontrada.' });
        }

        const targetRoomId = newRoomId || booking.roomId;

        const validation = await validateBookingSlot(db, {
            roomId: targetRoomId,
            providerId: booking.providerId,
            serviceId: booking.serviceId,
            date: newDate,
            startTime: newStartTime,
            excludeBookingId: id
        });

        if (!validation.valid) {
            return res.status(409).json({ error: validation.error });
        }

        await dbRun(`
            UPDATE bookings
            SET roomId = ?, roomName = ?, date = ?, startTime = ?, endTime = ?, timeSlot = ?
            WHERE id = ?
        `, [targetRoomId, validation.room.name, newDate, validation.startTime, validation.endTime, validation.timeSlot, id]);

        res.json({ success: true, message: 'Cita movida exitosamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reagendar cita (Usuario o Admin)
app.post('/api/bookings/:id/reschedule', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { newDate, newStartTime, newRoomId } = req.body;

    if (!newDate || !newStartTime) {
        return res.status(400).json({ error: 'Nueva fecha y hora requeridas.' });
    }

    try {
        const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
        if (booking.status !== 'Paid') return res.status(400).json({ error: 'Solo se pueden reagendar citas confirmadas y pagadas.' });

        const service = await dbGet('SELECT * FROM services WHERE id = ?', [booking.serviceId]);
        if (service && service.allowReschedule === 0) {
            return res.status(400).json({ error: 'Este servicio no permite reagendamientos.' });
        }

        const maxReschedules = service?.maxReschedules || 1;
        if ((booking.rescheduleCount || 0) >= maxReschedules) {
            return res.status(400).json({ error: `Ha alcanzado el límite de ${maxReschedules} reagendamiento(s) permitido(s).` });
        }

        const targetRoomId = newRoomId || booking.roomId;

        const validation = await validateBookingSlot(db, {
            roomId: targetRoomId,
            providerId: booking.providerId,
            serviceId: booking.serviceId,
            date: newDate,
            startTime: newStartTime,
            excludeBookingId: id
        });

        if (!validation.valid) {
            return res.status(409).json({ error: validation.error });
        }

        // Se conserva el link de Google Meet existente
        await dbRun(`
            UPDATE bookings
            SET roomId = ?, roomName = ?, date = ?, startTime = ?, endTime = ?, timeSlot = ?,
                rescheduleCount = rescheduleCount + 1
            WHERE id = ?
        `, [targetRoomId, validation.room.name, newDate, validation.startTime, validation.endTime, validation.timeSlot, id]);

        res.json({ success: true, message: 'Cita reagendada con éxito.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
    try {
        await dbRun("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bookings/:id/purge', authenticateToken, async (req, res) => {
    try {
        await dbRun('DELETE FROM bookings WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// SECTION 13: GOOGLE MEET & ADMIN ALERTS ENDPOINTS
// =====================================================
app.get('/api/google-meet/accounts', authenticateToken, async (req, res) => {
    try {
        const accounts = await dbAll(`
            SELECT a.id, a.provider_id, a.room_id, a.google_email, a.token_expiry, a.updated_at,
                   u.name as provider_name, r.name as room_name
            FROM provider_room_google_accounts a
            JOIN users u ON a.provider_id = u.id
            JOIN rooms r ON a.room_id = r.id
            ORDER BY u.name, r.name
        `);
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/google-meet/oauth/start', authenticateToken, (req, res) => {
    const { providerId, roomId } = req.query;
    const provId = req.user.role === 'prestador' ? req.user.id : providerId;

    if (!provId || !roomId) {
        return res.status(400).json({ error: 'providerId y roomId requeridos para iniciar OAuth de Google Meet.' });
    }

    try {
        const url = getGoogleOAuthUrl({ providerId: provId, roomId });
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/google-meet/oauth/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect(`/acceso.html?oauth_error=${encodeURIComponent(error)}`);
    }

    try {
        await handleGoogleOAuthCallback(db, { code, state });
        res.redirect('/acceso.html?oauth_success=1');
    } catch (err) {
        console.error('Error en OAuth callback de Google Meet:', err.message);
        res.redirect(`/acceso.html?oauth_error=${encodeURIComponent(err.message)}`);
    }
});

app.delete('/api/google-meet/accounts/:id', authenticateToken, async (req, res) => {
    try {
        await dbRun('DELETE FROM provider_room_google_accounts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id/meet-link', authenticateToken, async (req, res) => {
    const { meet_link } = req.body;
    try {
        await updateManualMeetLink(db, req.params.id, meet_link);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/bookings/:id/meet-retry', authenticateToken, async (req, res) => {
    try {
        const result = await retryMeetLinkGeneration(db, req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/alerts', authenticateToken, async (req, res) => {
    try {
        const alerts = await dbAll(`
            SELECT a.*, b.clientName, b.serviceName, b.date, b.startTime
            FROM admin_alerts a
            LEFT JOIN bookings b ON a.booking_id = b.id
            WHERE a.status = 'open'
            ORDER BY a.created_at DESC
        `);
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/alerts/:id/resolve', authenticateToken, async (req, res) => {
    try {
        await dbRun("UPDATE admin_alerts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// SECTION 14: HOLIDAYS, ACTIVITIES & CONFIG
// =====================================================
app.get('/api/holidays', authenticateToken, (req, res) => {
    db.all('SELECT * FROM holidays ORDER BY date ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/holidays', authenticateToken, (req, res) => {
    const { date, name } = req.body;
    if (!date || !name) {
        return res.status(400).json({ error: 'Fecha y nombre requeridos.' });
    }
    const id = crypto.randomUUID();
    db.run('INSERT INTO holidays (id, date, name) VALUES (?, ?, ?)', [id, date, name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
    });
});

app.delete('/api/holidays/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM holidays WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/activities', (req, res) => {
    db.all('SELECT * FROM activities', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/activities', authenticateToken, (req, res) => {
    const { id, title, date, time, location, desc, capacity } = req.body;
    const actId = id || crypto.randomUUID();
    db.run(
        'INSERT INTO activities (id, title, date, time, location, desc, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [actId, title, date, time, location, desc, capacity || 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: actId });
        }
    );
});

app.delete('/api/activities/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM activities WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/activities/enroll', (req, res) => {
    const { activityId, clientName, clientEmail, clientPhone } = req.body;
    if (!activityId || !clientName || !clientEmail) {
        return res.status(400).json({ error: 'Nombre, email y actividad requeridos.' });
    }

    db.get('SELECT capacity FROM activities WHERE id = ?', [activityId], (err, activity) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!activity) return res.status(404).json({ error: 'Actividad no encontrada.' });

        db.get('SELECT COUNT(*) as count FROM activity_enrollments WHERE activityId = ?', [activityId], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });

            if (activity.capacity > 0 && row.count >= activity.capacity) {
                return res.status(400).json({ error: 'No quedan cupos disponibles para esta actividad.' });
            }

            const id = crypto.randomUUID();
            db.run(
                'INSERT INTO activity_enrollments (id, activityId, clientName, clientEmail, clientPhone) VALUES (?, ?, ?, ?, ?)',
                [id, activityId, clientName, clientEmail, clientPhone || ''],
                function (err3) {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ success: true, id });
                }
            );
        });
    });
});

app.get('/api/activities/enrollments', authenticateToken, (req, res) => {
    db.all(`
        SELECT e.*, a.title as activity_title
        FROM activity_enrollments e
        JOIN activities a ON e.activityId = a.id
        ORDER BY e.created_at DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/activities/enrollments/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM activity_enrollments WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/config', (req, res) => {
    db.all('SELECT * FROM config', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const config = {};
        (rows || []).forEach(row => { config[row.key] = row.value; });
        res.json(config);
    });
});

app.post('/api/config', authenticateToken, (req, res) => {
    const data = req.body;
    db.serialize(() => {
        const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(data)) {
            stmt.run([key, typeof value === 'object' ? JSON.stringify(value) : String(value)]);
        }
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// =====================================================
// SECTION 15: KHIPU PAYMENTS INTEGRATION (API v3)
// =====================================================
app.post('/api/khipu/create-payment', (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) {
        return res.status(400).json({ error: 'Falta bookingId.' });
    }

    if (!process.env.KHIPU_API_KEY) {
        console.warn('WARNING: KHIPU_API_KEY no configurada en el servidor.');
        return res.status(503).json({ error: 'La pasarela de pagos Khipu no está configurada en este entorno.' });
    }

    db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], async (err, booking) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
        if (booking.status !== 'Pending_Payment') {
            return res.status(400).json({ error: 'La reserva ya fue pagada o cancelada.' });
        }

        if (booking.khipuPaymentId && booking.khipuPaymentUrl) {
            return res.json({
                success: true,
                paymentId: booking.khipuPaymentId,
                paymentUrl: booking.khipuPaymentUrl,
                reused: true
            });
        }

        try {
            const baseUrl = process.env.APP_URL || process.env.KHIPU_BASE_URL || process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
            // Expiración estricta de 30 minutos
            const expiresDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
            const params = {
                subject: `Reserva PsicArte: ${booking.serviceName}`,
                currency: 'CLP',
                amount: Number(booking.price),
                transaction_id: booking.id,
                notify_url: `${baseUrl}/api/khipu/notify`,
                notify_api_version: '3.0',
                return_url: `${baseUrl}/exito?bookingId=${booking.id}`,
                cancel_url: `${baseUrl}/cancelado?bookingId=${booking.id}`,
                payer_email: booking.clientEmail,
                payer_name: booking.clientName,
                expires_date: expiresDate
            };

            const khipuResponse = await callKhipuApi('POST', '/payments', params);

            db.run(
                'UPDATE bookings SET khipuPaymentId = ?, khipuPaymentUrl = ? WHERE id = ?',
                [khipuResponse.payment_id, khipuResponse.payment_url, booking.id],
                (errUpdate) => {
                    if (errUpdate) return res.status(500).json({ error: errUpdate.message });
                    res.json({
                        success: true,
                        paymentId: khipuResponse.payment_id,
                        paymentUrl: khipuResponse.payment_url
                    });
                }
            );
        } catch (error) {
            console.error('Error creating Khipu payment:', error.message || error);
            res.status(502).json({ error: 'Error al comunicarse con la pasarela de pagos Khipu: ' + (error.message || 'Error de conexión.') });
        }
    });
});

function handleKhipuWebhook(req, res) {
    const paymentEvent = req.body;
    const notifId = crypto.randomUUID();
    const type = 'payment_3.0';
    const headersStr = JSON.stringify(req.headers);
    const queryStr = JSON.stringify(req.query);
    const bodyStr = typeof paymentEvent === 'object' ? JSON.stringify(paymentEvent) : String(paymentEvent);
    const ipStr = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    db.run(
        'INSERT INTO khipu_notifications (id, type, headers, query_params, body, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [notifId, type, headersStr, queryStr, bodyStr, ipStr],
        (err) => {
            if (err) console.error('Error logging payment notification to database:', err.message);
        }
    );

    if (!process.env.KHIPU_API_KEY) {
        console.error('Webhook: KHIPU_API_KEY no está configurada.');
        return res.status(503).send('KHIPU_API_KEY no configurada');
    }

    const bookingId = paymentEvent?.transaction_id || paymentEvent?.data?.transaction_id;
    const paymentId = paymentEvent?.payment_id || paymentEvent?.data?.payment_id;

    if (!bookingId && !paymentId) {
        return res.status(200).send('Payload incompleto');
    }

    const lookupQuery = bookingId
        ? 'SELECT * FROM bookings WHERE id = ?'
        : 'SELECT * FROM bookings WHERE khipuPaymentId = ?';
    const lookupParam = bookingId || paymentId;

    db.get(lookupQuery, [lookupParam], async (errBk, booking) => {
        if (errBk || !booking) {
            console.error('Webhook: Booking not found:', lookupParam);
            return res.status(200).send('Booking not found');
        }

        if (booking.status === 'Paid' || booking.status === 'Payment_Conflict') {
            return res.status(200).send('Already processed');
        }

        const targetPaymentId = paymentId || booking.khipuPaymentId;
        if (!targetPaymentId) {
            return res.status(200).send('Payment ID missing');
        }

        if (booking.khipuPaymentId && paymentId && booking.khipuPaymentId !== paymentId) {
            console.error(`Webhook: Mismatch de payment_id para booking ${booking.id}`);
            return res.status(200).send('Payment ID mismatch');
        }

        try {
            const paymentDetails = await callKhipuApi('GET', `/payments/${targetPaymentId}`);
            if (paymentDetails.transaction_id && paymentDetails.transaction_id !== booking.id) {
                console.error(`Webhook: Mismatch de transaction_id en Khipu para booking ${booking.id}`);
                return res.status(200).send('Transaction ID mismatch');
            }
            if (paymentDetails.amount != null && Number(paymentDetails.amount) !== Number(booking.price)) {
                console.error(`Webhook: Monto discrepante en Khipu para booking ${booking.id}`);
                return res.status(200).send('Amount mismatch');
            }
            if (paymentDetails.status === 'done') {
                reconcileBookingPayment(booking.id, (errRec) => {
                    if (errRec) return res.status(500).send('Error updating booking');
                    return res.status(200).send('Notification received and processed');
                });
            } else {
                return res.status(200).send('Payment not done');
            }
        } catch (error) {
            console.error('Webhook: Error verificando pago con Khipu:', error.message);
            return res.status(500).send('Verification failed');
        }
    });
}

app.post('/api/khipu/notify', handleKhipuWebhook);
app.post('/api/khipu/webhook', handleKhipuWebhook);
app.post('/notificacion', handleKhipuWebhook);

// Rutas de retorno de pagos Khipu
app.get('/exito', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'pago-exito.html'));
});

app.get('/cancelado', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'pago-cancelado.html'));
});

app.get('/api/admin/khipu-notifications', authenticateToken, (req, res) => {
    db.all('SELECT * FROM khipu_notifications ORDER BY received_at DESC', (err, rows) => {
        if (err) {
            console.error('Error fetching notifications from database:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/bookings/:id/payment-status', (req, res) => {
    db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id], async (err, booking) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });

        if (booking.status === 'Pending_Payment' && booking.khipuPaymentId && process.env.KHIPU_API_KEY) {
            try {
                const paymentDetails = await callKhipuApi('GET', `/payments/${booking.khipuPaymentId}`);
                if (paymentDetails.status === 'done') {
                    return reconcileBookingPayment(booking.id, (errRec, newStatus) => {
                        if (errRec) return res.status(500).json({ error: errRec.message });
                        return res.json({ status: newStatus || 'Paid' });
                    });
                }
            } catch (_) {
                // Proceder con el estado actual
            }
        }

        res.json({ status: booking.status });
    });
});

// =====================================================
// CLEANUP SCHEDULER (Abandoned Pending Payments - 30 min)
// =====================================================
function cleanupPendingPayments() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    db.all(
        "SELECT id, khipuPaymentId FROM bookings WHERE status = 'Pending_Payment' AND created_at < ?",
        [thirtyMinutesAgo],
        async (err, bookings) => {
            if (err) {
                console.error('Cleanup error:', err.message);
                return;
            }

            if (!bookings || bookings.length === 0) return;

            for (const b of bookings) {
                if (b.khipuPaymentId && process.env.KHIPU_API_KEY) {
                    try {
                        const paymentDetails = await callKhipuApi('GET', `/payments/${b.khipuPaymentId}`);
                        if (paymentDetails.status === 'done') {
                            reconcileBookingPayment(b.id, () => {
                                console.log(`Cleanup: Booking ${b.id} was confirmed as Paid during cleanup check.`);
                            });
                            continue;
                        }
                    } catch (_) {
                        // Ignorar y proceder a eliminar reserva abandonada
                    }
                }

                db.run('DELETE FROM bookings WHERE id = ?', [b.id]);
            }
        }
    );
}

// =====================================================
// START SERVER
// =====================================================
if (require.main === module) {
    db.ready.then(() => {
        app.listen(PORT, () => {
            console.log(`PsicArte Server is running on port ${PORT}`);
            console.log(`Frontend served locally at: http://localhost:${PORT}/index.html`);

            cleanupPendingPayments();
            setInterval(cleanupPendingPayments, 15 * 60 * 1000);
        });
    }).catch((error) => {
        console.error('Database initialization failed; server not started:', error.message);
        db.close((closeError) => {
            if (closeError) {
                console.error('Error closing database after initialization failure:', closeError.message);
            }
            process.exitCode = 1;
        });
    });
}

module.exports = app;
