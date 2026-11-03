require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { SpotGenerator, timeToMinutes, minutesToTime } = require('./spot-generator');
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

// Middleware
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl && (
            req.originalUrl.startsWith('/api/khipu/notify') ||
            req.originalUrl.startsWith('/api/khipu/webhook') ||
            req.originalUrl.startsWith('/notificacion')
        )) {
            req.rawBody = buf;
        }
    }
}));

// Serve static frontend files from /public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// =====================================================
// SECTION 1: UTILITY FUNCTIONS
// =====================================================

// Legacy spot generator (kept for internal use only)
function generateSpotsLegacy(durationMin, rangeStart, rangeEnd, existingBookings) {
    const spots = [];
    let current = timeToMinutes(rangeStart);
    const end = timeToMinutes(rangeEnd);

    while (current + durationMin <= end) {
        const spotStart = minutesToTime(current);
        const spotEnd = minutesToTime(current + durationMin);

        const hasConflict = existingBookings.some(b => {
            const bStart = timeToMinutes(b.startTime);
            const bEnd = timeToMinutes(b.endTime);
            return current < bEnd && (current + durationMin) > bStart;
        });

        spots.push({
            startTime: spotStart,
            endTime: spotEnd,
            available: !hasConflict
        });

        current += durationMin;
    }
    return spots;
}

function normalizeAgendaRecurrenceRule(value) {
    let rule;
    try {
        rule = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
        return { error: 'La regla de recurrencia debe ser JSON válido.' };
    }

    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
        return { error: 'La regla de recurrencia no es válida.' };
    }

    if (rule.byweekday !== undefined &&
        (!Array.isArray(rule.byweekday) ||
            rule.byweekday.some(day => !Number.isInteger(Number(day)) || Number(day) < 1 || Number(day) > 7))) {
        return { error: 'Los días recurrentes deben usar valores ISO entre 1 (lunes) y 7 (domingo).' };
    }

    const timeRanges = rule.time_ranges;
    if (timeRanges !== undefined) {
        if (!timeRanges || typeof timeRanges !== 'object' || Array.isArray(timeRanges)) {
            return { error: 'Los intervalos horarios por día no son válidos.' };
        }

        const normalizedRanges = {};
        for (const [day, configuredRanges] of Object.entries(timeRanges)) {
            if (!/^[1-7]$/.test(day)) {
                return { error: 'Cada intervalo debe corresponder a un día ISO entre 1 y 7.' };
            }

            const ranges = Array.isArray(configuredRanges) ? configuredRanges : [configuredRanges];
            if (!ranges.length) return { error: `Agregue al menos un intervalo para el día ${day}.` };

            const parsedRanges = [];
            for (const range of ranges) {
                if (!range || typeof range.start !== 'string' || typeof range.end !== 'string' ||
                    !/^([01]\d|2[0-3]):[0-5]\d$/.test(range.start) ||
                    !/^([01]\d|2[0-3]):[0-5]\d$/.test(range.end) ||
                    range.start >= range.end) {
                    return { error: `Revise los intervalos horarios del día ${day}.` };
                }
                parsedRanges.push({ start: range.start, end: range.end });
            }

            parsedRanges.sort((a, b) => a.start.localeCompare(b.start));
            for (let index = 1; index < parsedRanges.length; index += 1) {
                if (parsedRanges[index].start < parsedRanges[index - 1].end) {
                    return { error: `Los intervalos del día ${day} no pueden superponerse.` };
                }
            }
            normalizedRanges[day] = parsedRanges;
        }

        rule.time_ranges = normalizedRanges;
    }

    return { value: JSON.stringify(rule) };
}

// =====================================================
// SECTION 2: KHIPU PAYMENT GATEWAY HELPERS (API v3)
// =====================================================
function verifyKhipuSignature(rawBody, signatureHeader, secret) {
    if (!rawBody || !signatureHeader || !secret) return false;
    try {
        const parts = signatureHeader.split(',');
        let tValue = null;
        let sValue = null;
        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx === -1) continue;
            const key = part.slice(0, eqIdx).trim();
            const val = part.slice(eqIdx + 1).trim();
            if (key === 't') tValue = val;
            if (key === 's') sValue = val;
        }
        if (!tValue || !sValue) return false;

        // Mitigación de replay attacks: validar frescura del timestamp (tolerancia de 5 minutos)
        const tNum = Number(tValue);
        if (!Number.isNaN(tNum)) {
            const timestampMs = tNum < 1e11 ? tNum * 1000 : tNum;
            const ageMs = Math.abs(Date.now() - timestampMs);
            if (ageMs > 5 * 60 * 1000) {
                console.warn(`Webhook: timestamp expirado o desfasado (${ageMs}ms de diferencia).`);
                return false;
            }
        }

        const toHash = `${tValue}.${rawBody.toString('utf8')}`;
        const computedSig = crypto.createHmac('sha256', secret).update(toHash).digest('base64');

        const sigBuffer = Buffer.from(sValue);
        const computedBuffer = Buffer.from(computedSig);
        if (sigBuffer.length !== computedBuffer.length) return false;
        return crypto.timingSafeEqual(sigBuffer, computedBuffer);
    } catch (e) {
        console.error('Error verifying Khipu signature:', e.message);
        return false;
    }
}

async function callKhipuApi(method, path, body = null) {
    const apiKey = process.env.KHIPU_API_KEY;
    if (!apiKey) {
        throw new Error('KHIPU_API_KEY no está configurada.');
    }

    const apiBase = process.env.KHIPU_API_URL || 'https://payment-api.khipu.com/v3';
    const url = `${apiBase}${path}`;
    const headers = {
        'x-api-key': apiKey,
        'Accept': 'application/json'
    };

    const options = {
        method: method.toUpperCase(),
        headers,
        signal: AbortSignal.timeout(10000)
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Khipu API error: ${response.status} - ${errorText}`);
    }
    return await response.json();
}

function reconcileBookingPayment(bookingId, doneCallback) {
    db.get("SELECT * FROM bookings WHERE id = ?", [bookingId], (errBk, booking) => {
        if (errBk || !booking) {
            return doneCallback ? doneCallback(new Error('Reserva no encontrada')) : null;
        }
        if (booking.status === 'Paid') {
            return doneCallback ? doneCallback(null, 'Already processed') : null;
        }

        const slotStartMin = timeToMinutes(booking.startTime);
        const slotEndMin = timeToMinutes(booking.endTime);

        db.all("SELECT * FROM bookings WHERE providerId = ? AND date = ? AND status = 'Paid'", [booking.providerId, booking.date], (err2, books) => {
            const hasOverlappingBooking = !err2 && books.some(bk => {
                const bkStart = timeToMinutes(bk.startTime);
                const bkEnd = timeToMinutes(bk.endTime);
                return (slotStartMin < bkEnd && bkStart < slotEndMin);
            });

            db.all("SELECT * FROM bookings WHERE roomId = ? AND date = ? AND status = 'Paid'", [booking.roomId, booking.date], (err3, roomBooks) => {
                const hasRoomConflict = !err3 && roomBooks.some(bk => {
                    const bkStart = timeToMinutes(bk.startTime);
                    const bkEnd = timeToMinutes(bk.endTime);
                    return (slotStartMin < bkEnd && bkStart < slotEndMin);
                });

                let finalStatus = 'Paid';
                if (hasOverlappingBooking || hasRoomConflict) {
                    console.error(`Conflict detected for booking ${bookingId}. Marking as Payment_Conflict.`);
                    finalStatus = 'Payment_Conflict';
                }

                db.run("UPDATE bookings SET status = ? WHERE id = ?", [finalStatus, bookingId], (errUp) => {
                    if (errUp) {
                        return doneCallback ? doneCallback(errUp) : null;
                    }
                    if (finalStatus === 'Paid') {
                        sendBookingConfirmationEmail(db, bookingId);
                    }
                    if (finalStatus === 'Paid' && booking.spot_id) {
                        db.run("UPDATE spots SET status = 'booked', booking_id = ? WHERE id = ?", [bookingId, booking.spot_id], (errSpot) => {
                            if (errSpot) console.error('Failed to update spot status:', errSpot.message);
                            if (doneCallback) doneCallback(null, finalStatus);
                        });
                    } else {
                        if (doneCallback) doneCallback(null, finalStatus);
                    }
                });
            });
        });
    });
}

// =====================================================
// SECTION 3: AUTH ENDPOINTS
// =====================================================
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan credenciales.' });
    }

    db.get("SELECT id, email, password, name, role FROM users WHERE email = ?", [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (user) {
            bcrypt.compare(password, user.password, (err2, isMatch) => {
                if (err2) return res.status(500).json({ error: err2.message });
                if (!isMatch) {
                    return res.status(401).json({ error: 'Contraseña incorrecta.' });
                }
                const dbRole = user.role === 'admin' ? 'administrador' : user.role;
                const tokenPayload = { id: user.id, email: user.email, role: dbRole };
                const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ ...tokenPayload, name: user.name, token });
            });
            return;
        }

        return res.status(401).json({ error: 'Usuario no encontrado.' });
    });
});

app.post('/api/auth/recover', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Se requiere email.' });

    db.get("SELECT email FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            return res.json({ success: true, message: `Correo de recuperación enviado a ${email}` });
        } else {
            return res.status(404).json({ error: 'Correo no registrado.' });
        }
    });
});

// =====================================================
// SECTION 4: USER ENDPOINTS (Admin CRUD) - PROTECTED
// =====================================================
app.get('/api/users', authenticateToken, (req, res) => {
    db.all(`
        SELECT u.id, u.email, u.name, u.role, u.rut, u.phone, u.created_at, p.specialty, p.bio
        FROM users u
        LEFT JOIN provider_profiles p ON u.id = p.userId
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', authenticateToken, (req, res) => {
    const { email, password, name, role, rut, phone, specialty, bio } = req.body;
    if (!email || !password || !name || !role) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: err.message });
        const id = 'user-' + Date.now();
        db.run("INSERT INTO users (id, email, password, name, role, rut, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, email, hash, name, role, rut || '', phone || ''],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                if (role === 'prestador') {
                    const defaultBlocks = JSON.stringify({
                        2: ["20:00-21:00", "21:00-22:00"],
                        4: ["09:00-10:00", "10:00-11:00", "11:00-12:00", "20:00-21:00", "21:00-22:00"],
                        5: ["09:00-10:00", "10:00-11:00", "11:00-12:00", "20:00-21:00", "21:00-22:00"]
                    });
                    db.run("INSERT INTO provider_profiles (userId, specialty, blocks, bio) VALUES (?, ?, ?, ?)",
                        [id, specialty || '', defaultBlocks, bio || ''], (err3) => {
                            if (err3) return res.status(500).json({ error: err3.message });
                            res.json({ success: true, id });
                        }
                    );
                } else {
                    res.json({ success: true, id });
                }
            }
        );
    });
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
    const { email, name, role, password, rut, phone, specialty, bio } = req.body;
    const { id } = req.params;
    if (!email || !name || !role) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    const finalizeUpdate = (hash) => {
        const query = hash
            ? "UPDATE users SET email = ?, name = ?, role = ?, password = ?, rut = ?, phone = ? WHERE id = ?"
            : "UPDATE users SET email = ?, name = ?, role = ?, rut = ?, phone = ? WHERE id = ?";
        const params = hash
            ? [email, name, role, hash, rut || '', phone || '', id]
            : [email, name, role, rut || '', phone || '', id];

        db.run(query, params, function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            if (role === 'prestador' && (specialty !== undefined || bio !== undefined)) {
                db.get("SELECT userId, specialty, blocks, bio FROM provider_profiles WHERE userId = ?", [id], (errProf, existingProf) => {
                    if (errProf) return res.status(500).json({ error: errProf.message });
                    const nextSpecialty = specialty !== undefined ? specialty : (existingProf?.specialty || '');
                    const nextBio = bio !== undefined ? bio : (existingProf?.bio || '');
                    const nextBlocks = existingProf?.blocks || '{}';
                    db.run(
                        "INSERT OR REPLACE INTO provider_profiles (userId, specialty, blocks, bio) VALUES (?, ?, ?, ?)",
                        [id, nextSpecialty, nextBlocks, nextBio],
                        (errSaveProf) => {
                            if (errSaveProf) return res.status(500).json({ error: errSaveProf.message });
                            res.json({ success: true });
                        }
                    );
                });
            } else {
                res.json({ success: true });
            }
        });
    };

    if (password) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: err.message });
            finalizeUpdate(hash);
        });
    } else {
        finalizeUpdate(null);
    }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
    db.get("SELECT email, role FROM users WHERE id = ?", [req.params.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        if (user.role === 'usuario') {
            db.get("SELECT COUNT(*) as count FROM bookings WHERE clientEmail = ?", [user.email], (err2, row) => {
                if (err2) return res.status(500).json({ error: err2.message });
                if (row.count > 0) {
                    return res.status(400).json({ error: 'No se puede eliminar el usuario/cliente porque tiene reservas asociadas.' });
                }

                db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err3) {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ success: true });
                });
            });
        } else if (user.role === 'prestador') {
            db.serialize(() => {
                db.run("DELETE FROM provider_profiles WHERE userId = ?", [req.params.id]);
                db.run("DELETE FROM services WHERE providerId = ?", [req.params.id]);
                db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ success: true });
                });
            });
        } else {
            db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
        }
    });
});

// =====================================================
// SECTION 5: CONTENT ENDPOINTS (Mission, Vision, etc.)
// =====================================================
app.get('/api/content', (req, res) => {
    db.all("SELECT * FROM content", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const data = {};
        rows.forEach(r => {
            data[r.key] = r.value;
        });
        res.json(data);
    });
});

app.post('/api/content', authenticateToken, (req, res) => {
    const data = req.body;
    db.serialize(() => {
        const stmt = db.prepare("INSERT OR REPLACE INTO content (key, value) VALUES (?, ?)");
        Object.keys(data).forEach(k => {
            stmt.run(k, data[k]);
        });
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.get('/api/articles', (req, res) => {
    db.all(`SELECT id, title, summary, body, created_at, published_at
        FROM articles WHERE status = 'published'
        ORDER BY published_at DESC, created_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/articles/submissions', authenticateToken, (req, res) => {
    const isAdmin = req.user.role === 'administrador';
    const query = isAdmin
        ? `SELECT a.id, a.title, a.summary, a.body, a.status, a.created_at, u.name AS author_name
            FROM articles a LEFT JOIN users u ON u.id = a.author_id
            WHERE a.status = 'pending_review' ORDER BY a.created_at ASC`
        : `SELECT id, title, summary, body, status, created_at
            FROM articles WHERE author_id = ? ORDER BY created_at DESC`;
    const params = isAdmin ? [] : [req.user.id];
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/articles', authenticateToken, (req, res) => {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const summary = typeof req.body.summary === 'string' ? req.body.summary.trim() : '';
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!title || title.length > 120 || !summary || summary.length > 300 || !body || body.length > 10000) {
        return res.status(400).json({ error: 'Revise el título (máx. 120), resumen (máx. 300) y artículo (máx. 10.000 caracteres).' });
    }

    const id = crypto.randomUUID();
    const isAdmin = req.user.role === 'administrador';
    const initialStatus = isAdmin ? 'published' : 'pending_review';
    const query = isAdmin
        ? `INSERT INTO articles (id, author_id, title, summary, body, status, published_at)
           VALUES (?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)`
        : `INSERT INTO articles (id, author_id, title, summary, body, status)
           VALUES (?, ?, ?, ?, ?, 'pending_review')`;

    db.run(
        query,
        [id, req.user.id, title, summary, body],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ success: true, id, status: initialStatus });
        }
    );
});

app.put('/api/articles/:id/status', authenticateToken, (req, res) => {
    if (req.user.role !== 'administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede revisar y publicar artículos.' });
    }
    const { status } = req.body;
    if (!['published', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado de revisión no válido.' });
    }
    db.run(
        `UPDATE articles
         SET status = ?, updated_at = CURRENT_TIMESTAMP,
             published_at = CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE id = ? AND status = 'pending_review'`,
        [status, status, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Artículo pendiente no encontrado.' });
            res.json({ success: true, status });
        }
    );
});

// =====================================================
// SECTION 6: ROOMS ENDPOINTS
// =====================================================
app.get('/api/rooms', (req, res) => {
    db.all(`
        SELECT r.*,
            (SELECT json_group_array(json_object('id', rs.id, 'day_of_week', rs.day_of_week, 'start_time', rs.start_time, 'end_time', rs.end_time))
             FROM room_schedules rs WHERE rs.room_id = r.id) as schedules
        FROM rooms r
        ORDER BY r.name
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = (rows || []).map(r => {
            let parsedSchedules;
            try {
                parsedSchedules = JSON.parse(r.schedules || '[]');
            } catch (err) {
                parsedSchedules = [];
            }
            let openTime = '08:30';
            let closeTime = '18:30';
            if (parsedSchedules && parsedSchedules.length > 0) {
                const startTimes = parsedSchedules.map(s => s.start_time).filter(Boolean).sort();
                const endTimes = parsedSchedules.map(s => s.end_time).filter(Boolean).sort();
                if (startTimes.length > 0) openTime = startTimes[0];
                if (endTimes.length > 0) closeTime = endTimes[endTimes.length - 1];
            }
            return {
                id: r.id,
                name: r.name,
                type: r.type,
                meeting_link: r.meeting_link || '',
                openTime,
                closeTime,
                schedules: parsedSchedules
            };
        });
        res.json(result);
    });
});

app.post('/api/rooms', authenticateToken, (req, res) => {
    const { id, name, type, openTime, closeTime, meeting_link } = req.body;
    if (!id || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos: id, name.' });
    }
    const start = openTime || '08:30';
    const end = closeTime || '18:30';
    const meetingLinkVal = typeof meeting_link === 'string' ? meeting_link.trim() : '';

    db.serialize(() => {
        db.run(`INSERT INTO rooms (id, name, type, meeting_link) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, type = excluded.type, meeting_link = excluded.meeting_link`,
            [id, name, type || 'consultorio', meetingLinkVal],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                db.get("SELECT COUNT(*) as count FROM room_schedules WHERE room_id = ?", [id], (errCount, row) => {
                    if (errCount) return res.status(500).json({ error: errCount.message });

                    if (row.count === 0) {
                        const stmt = db.prepare("INSERT INTO room_schedules (id, room_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)");
                        const daysToCreate = type === 'Virtual' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
                        daysToCreate.forEach(day => {
                            stmt.run([`rs-${id}-${day}`, id, day, start, end]);
                        });
                        stmt.finalize((errFinal) => {
                            if (errFinal) return res.status(500).json({ error: errFinal.message });
                            res.json({ success: true, id });
                        });
                    } else {
                        res.json({ success: true, id });
                    }
                });
            }
        );
    });
});

app.put('/api/rooms/:id', authenticateToken, (req, res) => {
    const { name, type, openTime, closeTime, meeting_link } = req.body;
    if (!name || !type || !openTime || !closeTime || openTime >= closeTime) {
        return res.status(400).json({ error: 'Revise el nombre, tipo y rango horario de la sala.' });
    }
    const meetingLinkVal = typeof meeting_link === 'string' ? meeting_link.trim() : '';

    db.run('UPDATE rooms SET name = ?, type = ?, meeting_link = ? WHERE id = ?', [name, type, meetingLinkVal, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Sala no encontrada.' });

        db.all(
            'SELECT DISTINCT day_of_week FROM room_schedules WHERE room_id = ? ORDER BY day_of_week',
            [req.params.id],
            (scheduleErr, dayRows) => {
                if (scheduleErr) return res.status(500).json({ error: scheduleErr.message });

                const daysToConfigure = (dayRows && dayRows.length > 0)
                    ? dayRows.map(r => r.day_of_week)
                    : (type === 'Virtual' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]);

                db.serialize(() => {
                    db.run('DELETE FROM room_schedules WHERE room_id = ?', [req.params.id], (delErr) => {
                        if (delErr) return res.status(500).json({ error: delErr.message });
                        const stmt = db.prepare('INSERT INTO room_schedules (id, room_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
                        daysToConfigure.forEach(day => {
                            stmt.run([`rs-${req.params.id}-${day}`, req.params.id, day, openTime, closeTime]);
                        });
                        stmt.finalize(updateErr => {
                            if (updateErr) return res.status(500).json({ error: updateErr.message });
                            res.json({ success: true, scheduleUpdated: true, message: 'Sala y horario de funcionamiento actualizados correctamente.' });
                        });
                    });
                });
            }
        );
    });
});

app.delete('/api/rooms/:id', authenticateToken, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM room_schedules WHERE room_id = ?", [req.params.id]);
        db.run("DELETE FROM service_rooms WHERE room_id = ?", [req.params.id]);
        db.run("DELETE FROM rooms WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// =====================================================
// SECTION 7: ROOM SCHEDULES ENDPOINTS (all require auth)
// =====================================================
app.get('/api/room-schedules', authenticateToken, (req, res) => {
    db.all(`SELECT rs.*, r.name as room_name FROM room_schedules rs JOIN rooms r ON rs.room_id = r.id ORDER BY rs.room_id, rs.day_of_week, rs.start_time`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/rooms/:roomId/schedules', authenticateToken, (req, res) => {
    db.all('SELECT * FROM room_schedules WHERE room_id = ? ORDER BY day_of_week, start_time', [req.params.roomId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/room-schedules', authenticateToken, (req, res) => {
    const { id, room_id, day_of_week, start_time, end_time } = req.body;

    if (!room_id || !day_of_week || !start_time || !end_time) {
        return res.status(400).json({ error: 'Faltan campos requeridos: room_id, day_of_week, start_time, end_time.' });
    }

    if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
        return res.status(400).json({ error: 'start_time debe ser menor que end_time.' });
    }

    // Check overlap: new block [start_time, end_time] must not overlap any existing block for same room + day_of_week
    db.all('SELECT * FROM room_schedules WHERE room_id = ? AND day_of_week = ?', [room_id, day_of_week], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });

        const newStart = timeToMinutes(start_time);
        const newEnd = timeToMinutes(end_time);
        const hasOverlap = (existing || []).some(s => {
            return timeToMinutes(s.start_time) < newEnd && newStart < timeToMinutes(s.end_time);
        });

        if (hasOverlap) {
            return res.status(400).json({ error: 'El bloque horario se solapa con un bloque existente para este día.' });
        }

        const scheduleId = id || crypto.randomUUID();
        db.run(
            'INSERT OR REPLACE INTO room_schedules (id, room_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [scheduleId, room_id, day_of_week, start_time, end_time],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true, id: scheduleId });
            }
        );
    });
});

app.put('/api/room-schedules/:id', authenticateToken, (req, res) => {
    const { room_id, day_of_week, start_time, end_time } = req.body;

    if (!room_id || !day_of_week || !start_time || !end_time) {
        return res.status(400).json({ error: 'Faltan campos requeridos: room_id, day_of_week, start_time, end_time.' });
    }

    if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
        return res.status(400).json({ error: 'start_time debe ser menor que end_time.' });
    }

    // Check overlap excluding current record
    db.all('SELECT * FROM room_schedules WHERE room_id = ? AND day_of_week = ? AND id != ?', [room_id, day_of_week, req.params.id], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });

        const newStart = timeToMinutes(start_time);
        const newEnd = timeToMinutes(end_time);
        const hasOverlap = (existing || []).some(s => {
            return timeToMinutes(s.start_time) < newEnd && newStart < timeToMinutes(s.end_time);
        });

        if (hasOverlap) {
            return res.status(400).json({ error: 'El bloque horario se solapa con un bloque existente para este día.' });
        }

        db.run(
            'UPDATE room_schedules SET room_id = ?, day_of_week = ?, start_time = ?, end_time = ? WHERE id = ?',
            [room_id, day_of_week, start_time, end_time, req.params.id],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            }
        );
    });
});

app.delete('/api/room-schedules/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM room_schedules WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =====================================================
// SECTION 8: PROVIDERS ENDPOINT (updated to use service_rooms)
// =====================================================
app.get('/api/providers', (req, res) => {
    db.all(`
        SELECT u.id, u.name, u.email, u.role, p.specialty, p.blocks, p.bio
        FROM users u
        JOIN provider_profiles p ON u.id = p.userId
        WHERE u.role = 'prestador'
    `, (err, provs) => {
        if (err) return res.status(500).json({ error: err.message });

        // Get services with their room associations via service_rooms
        db.all(`
            SELECT s.*, sr.room_id
            FROM services s
            LEFT JOIN service_rooms sr ON s.id = sr.service_id
        `, (err2, servRows) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // Get room names
            db.all('SELECT id, name FROM rooms', (err3, rooms) => {
                if (err3) return res.status(500).json({ error: err3.message });

                const roomMap = {};
                (rooms || []).forEach(r => { roomMap[r.id] = r.name; });

                // Build service list with room info
                const serviceMap = {};
                (servRows || []).forEach(sr => {
                    if (!serviceMap[sr.id]) {
                        serviceMap[sr.id] = {
                            id: sr.id,
                            providerId: sr.providerId,
                            name: sr.name,
                            price: sr.price,
                            duration: sr.duration,
                            type: sr.type,
                            allowReschedule: sr.allowReschedule,
                            maxReschedules: sr.maxReschedules,
                            roomIds: [],
                            roomNames: []
                        };
                    }
                    if (sr.room_id) {
                        serviceMap[sr.id].roomIds.push(sr.room_id);
                        if (roomMap[sr.room_id]) {
                            serviceMap[sr.id].roomNames.push(roomMap[sr.room_id]);
                        }
                    }
                });

                const allServices = Object.values(serviceMap);

                const nested = (provs || []).map(p => {
                    const blocksParsed = p.blocks ? JSON.parse(p.blocks) : {};
                    const pServices = allServices.filter(s => s.providerId === p.id);
                    return {
                        id: p.id,
                        name: p.name,
                        role: p.role,
                        specialty: p.specialty || p.role,
                        email: p.email,
                        blocks: blocksParsed,
                        bio: p.bio || '',
                        services: pServices.map(s => ({ ...s, roomId: s.roomIds?.[0] || '' }))
                    };
                });
                res.json(nested);
            });
        });
    });
});

app.delete('/api/providers/:id', authenticateToken, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM provider_profiles WHERE userId = ?", [req.params.id]);
        db.run("DELETE FROM service_rooms WHERE service_id IN (SELECT id FROM services WHERE providerId = ?)", [req.params.id]);
        db.run("DELETE FROM services WHERE providerId = ?", [req.params.id]);
        db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// =====================================================
// SECTION 9: SERVICES ENDPOINTS
// =====================================================
app.post('/api/services', authenticateToken, (req, res) => {
    const { id, providerId, name, price, duration, type, allowReschedule, maxReschedules, agendaConfig } = req.body;

    if (!id || !providerId || !name || !duration) {
        return res.status(400).json({ error: 'Faltan campos requeridos: id, providerId, name, duration.' });
    }

    const allowRescheduleVal = allowReschedule !== undefined ? (allowReschedule ? 1 : 0) : 1;
    const maxReschedulesVal = maxReschedules || 1;

    db.run(`INSERT INTO services (id, providerId, name, price, duration, type, allowReschedule, maxReschedules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            providerId = excluded.providerId,
            name = excluded.name,
            price = excluded.price,
            duration = excluded.duration,
            type = excluded.type,
            allowReschedule = excluded.allowReschedule,
            maxReschedules = excluded.maxReschedules`,
        [id, providerId, name, price || 0, duration, type || 'sesion', allowRescheduleVal, maxReschedulesVal],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            if (!agendaConfig || !Array.isArray(agendaConfig.roomIds) || agendaConfig.roomIds.length === 0) {
                return res.json({ success: true, id });
            }

            let normalizedRecurrenceRule = null;
            if (agendaConfig.recurrence === 'weekly') {
                const normalized = normalizeAgendaRecurrenceRule(agendaConfig.recurrenceRule);
                if (normalized.error) {
                    return res.status(400).json({ error: normalized.error });
                }
                normalizedRecurrenceRule = normalized.value;
            }

            const targetRoomId = agendaConfig.roomIds[0];
            db.serialize(() => {
                db.run('DELETE FROM service_rooms WHERE service_id = ?', [id]);
                db.run('INSERT OR IGNORE INTO service_rooms (id, service_id, room_id) VALUES (?, ?, ?)', [crypto.randomUUID(), id, targetRoomId]);
                db.run("DELETE FROM spots WHERE service_id = ? AND status = 'available'", [id]);
                db.run('DELETE FROM agendas WHERE service_id = ?', [id], (delAgErr) => {
                    if (delAgErr) return res.status(500).json({ error: delAgErr.message });

                    const newAgendaId = crypto.randomUUID();
                    const agendaType = agendaConfig.recurrence === 'weekly' ? 'recurrent' : 'punctual';
                    db.run(
                        `INSERT INTO agendas (id, provider_id, service_id, room_id, type, recurrence_rule, specific_date, start_time, end_time, start_date, end_date, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
                        [
                            newAgendaId,
                            providerId,
                            id,
                            targetRoomId,
                            agendaType,
                            normalizedRecurrenceRule,
                            agendaConfig.specificDate || null,
                            agendaConfig.startTime,
                            agendaConfig.endTime,
                            agendaConfig.startDate || null,
                            agendaConfig.endDate || null
                        ],
                        (insAgErr) => {
                            if (insAgErr) return res.status(500).json({ error: insAgErr.message });
                            db.get('SELECT * FROM agendas WHERE id = ?', [newAgendaId], (getAgErr, agendaRow) => {
                                if (getAgErr || !agendaRow) return res.status(500).json({ error: getAgErr?.message || 'Error leyendo agenda actualizada.' });
                                const generator = new SpotGenerator(db);
                                generator.generate(agendaRow, (genResult) => {
                                    res.json({
                                        success: true,
                                        id,
                                        spotsGenerated: genResult.spotsGenerated || 0,
                                        message: `Servicio y horarios actualizados (${genResult.spotsGenerated || 0} bloques disponibles generados).`
                                    });
                                });
                            });
                        }
                    );
                });
            });
        }
    );
});

app.delete('/api/services/:id', authenticateToken, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM service_rooms WHERE service_id = ?", [req.params.id]);
        db.run("DELETE FROM services WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.get('/api/services/:id/rooms', authenticateToken, (req, res) => {
    db.all(`
        SELECT sr.id, sr.room_id, r.name as room_name
        FROM service_rooms sr
        JOIN rooms r ON sr.room_id = r.id
        WHERE sr.service_id = ?
    `, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/services/:id/rooms', authenticateToken, (req, res) => {
    const { room_id } = req.body;
    if (!room_id) {
        return res.status(400).json({ error: 'Faltan campo requerido: room_id.' });
    }

    // Check service exists
    db.get('SELECT id FROM services WHERE id = ?', [req.params.id], (err, svc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!svc) return res.status(404).json({ error: 'Servicio no encontrado.' });

        // Check room exists
        db.get('SELECT id FROM rooms WHERE id = ?', [room_id], (err2, room) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });

            const assocId = crypto.randomUUID();
            db.run(
                'INSERT OR IGNORE INTO service_rooms (id, service_id, room_id) VALUES (?, ?, ?)',
                [assocId, req.params.id, room_id],
                function (err3) {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ success: true, id: assocId });
                }
            );
        });
    });
});

app.delete('/api/services/:id/rooms/:roomId', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM service_rooms WHERE service_id = ? AND room_id = ?',
        [req.params.id, req.params.roomId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.get('/api/services/without-rooms', authenticateToken, (req, res) => {
    db.all(`
        SELECT s.* FROM services s
        WHERE s.id NOT IN (SELECT DISTINCT service_id FROM service_rooms)
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

function regenerateAgendas(agendas, res) {
    const totals = { agendasProcessed: 0, spotsGenerated: 0, conflicts: 0, errors: [] };
    const generator = new SpotGenerator(db);
    const processNext = index => {
        if (index >= agendas.length) return res.json(totals);
        generator.generate(agendas[index], result => {
            totals.agendasProcessed += 1;
            totals.spotsGenerated += result.spotsGenerated || 0;
            totals.conflicts += result.conflicts || 0;
            totals.errors.push(...(result.errors || []));
            processNext(index + 1);
        });
    };
    processNext(0);
}

app.post('/api/services/:id/generate-spots', authenticateToken, (req, res) => {
    db.all('SELECT * FROM agendas WHERE service_id = ? ORDER BY created_at, id', [req.params.id], (err, agendas) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!agendas || agendas.length === 0) {
            return res.status(404).json({ error: 'El servicio no tiene agendas configuradas.' });
        }
        regenerateAgendas(agendas, res);
    });
});

app.post('/api/services/generate-all-spots', authenticateToken, (req, res) => {
    db.all('SELECT * FROM agendas ORDER BY created_at, id', (err, agendas) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!agendas || agendas.length === 0) {
            return res.status(404).json({ error: 'No hay agendas configuradas.' });
        }
        regenerateAgendas(agendas, res);
    });
});

// =====================================================
// SECTION 10: BOOKINGS ENDPOINTS
// =====================================================
app.get('/api/bookings', (req, res) => {
    db.all("SELECT * FROM bookings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/bookings', (req, res) => {
    const booking = req.body;

    if (!booking.spot_id) {
        return res.status(400).json({ error: 'Se requiere spot_id para crear una reserva.' });
    }

    // Get the spot
    db.get('SELECT * FROM spots WHERE id = ?', [booking.spot_id], (err, spot) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!spot) return res.status(404).json({ error: 'Spot no encontrado.' });

        if (spot.status !== 'available') {
            if (spot.status === 'reserved' && spot.booking_id) {
                return db.get('SELECT * FROM bookings WHERE id = ? AND status = ?', [spot.booking_id, 'Pending_Payment'], (errB, existingBooking) => {
                    if (!errB && existingBooking && (existingBooking.clientEmail === booking.clientEmail || !booking.clientEmail)) {
                        return res.json({ id: existingBooking.id, status: existingBooking.status, reused: true });
                    }
                    return res.status(409).json({ error: 'El horario seleccionado ya no está disponible.' });
                });
            }
            return res.status(409).json({ error: 'El horario seleccionado ya no está disponible.' });
        }

        // Get service and provider info
        db.get('SELECT s.*, u.name as providerName FROM services s JOIN users u ON s.providerId = u.id WHERE s.id = ?', [spot.service_id], (err2, service) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });

            db.get('SELECT * FROM rooms WHERE id = ?', [spot.room_id], (err3, room) => {
                if (err3) return res.status(500).json({ error: err3.message });

                // Get agenda
                db.get('SELECT * FROM agendas WHERE id = ?', [spot.agenda_id], (err4, agenda) => {
                    if (err4) return res.status(500).json({ error: err4.message });

                    const initialStatus = booking.adminMode ? 'Paid' : 'Pending_Payment';
                    const bookingId = booking.id || crypto.randomUUID();

                    db.run(
                        `INSERT INTO bookings (id, spot_id, client_id, providerId, serviceId, agendaId, serviceName, price, duration, roomId, roomName, date, timeSlot, startTime, endTime, clientEmail, clientName, clientRut, clientPhone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            bookingId, spot.id, booking.client_id || req.user?.id || null,
                            spot.provider_id, spot.service_id, spot.agenda_id,
                            service.name, service.price, service.duration,
                            spot.room_id, room ? room.name : '', spot.date,
                            `${spot.start_time}-${spot.end_time}`, spot.start_time, spot.end_time,
                            booking.clientEmail, booking.clientName, booking.clientRut, booking.clientPhone,
                            initialStatus
                        ], function (err5) {
                            if (err5) return res.status(500).json({ error: err5.message });

                            // Mark spot as booked/reserved
                            db.run(
                                'UPDATE spots SET status = ?, booking_id = ? WHERE id = ?',
                                [initialStatus === 'Paid' ? 'booked' : 'reserved', bookingId, spot.id]
                            );

                            // Auto-register client user if not exists
                            if (booking.clientEmail) {
                                db.get("SELECT id FROM users WHERE email = ?", [booking.clientEmail], (err6, existingUser) => {
                                    if (!existingUser) {
                                        const clientUserId = booking.client_id || 'usr-' + Date.now();
                                        db.run("INSERT OR IGNORE INTO users (id, email, password, name, role, rut, phone) VALUES (?, ?, '', ?, 'usuario', ?, ?)",
                                            [clientUserId, booking.clientEmail, booking.clientName || booking.clientEmail.split('@')[0], booking.clientRut || '', booking.clientPhone || '']);
                                    }
                                });
                            }

                            if (initialStatus === 'Paid') {
                                sendBookingConfirmationEmail(db, bookingId);
                            }

                            res.json({ success: true, id: bookingId });
                        }
                    );
                });
            });
        });
    });
});

app.delete('/api/bookings/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id], (err, booking) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });

        db.serialize(() => {
            db.run("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [req.params.id]);
            // Free the associated spot
            if (booking.spot_id) {
                db.run("UPDATE spots SET status = 'available', booking_id = NULL WHERE id = ?", [booking.spot_id]);
            }
            res.json({ success: true });
        });
    });
});

app.delete('/api/bookings/:id/purge', authenticateToken, (req, res) => {
    db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id], (err, booking) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });

        db.serialize(() => {
            // Free the associated spot before deleting
            if (booking.spot_id) {
                db.run("UPDATE spots SET status = 'available', booking_id = NULL WHERE id = ?", [booking.spot_id]);
            }
            db.run("DELETE FROM bookings WHERE id = ?", [req.params.id], function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
        });
    });
});

// =====================================================
// SECTION 11: HOLIDAYS ENDPOINTS (all require auth)
// =====================================================
app.get('/api/holidays', authenticateToken, (req, res) => {
    const { year } = req.query;
    let query = 'SELECT * FROM holidays';
    const params = [];

    if (year) {
        query += ' WHERE date LIKE ?';
        params.push(`${year}%`);
    }

    query += ' ORDER BY date';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/holidays', authenticateToken, (req, res) => {
    const { id, date, name } = req.body;

    if (!date || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos: date, name.' });
    }

    const holidayId = id || crypto.randomUUID();
    db.run('INSERT OR REPLACE INTO holidays (id, date, name) VALUES (?, ?, ?)',
        [holidayId, date, name],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: holidayId });
        }
    );
});

app.delete('/api/holidays/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM holidays WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =====================================================
// SECTION 12: AGENDAS ENDPOINTS (all require auth)
// =====================================================
app.get('/api/agendas', authenticateToken, (req, res) => {
    const { service_id } = req.query;
    const whereClause = service_id ? 'WHERE a.service_id = ?' : '';
    const params = service_id ? [service_id] : [];
    db.all(`
        SELECT a.*,
            u.name as provider_name,
            s.name as service_name,
            r.name as room_name,
            (SELECT COUNT(*) FROM spots sp WHERE sp.agenda_id = a.id AND sp.status = 'available') as available_spots,
            (SELECT COUNT(*) FROM spots sp WHERE sp.agenda_id = a.id AND sp.status IN ('reserved', 'booked')) as booked_spots,
            (SELECT COUNT(*) FROM spots sp WHERE sp.agenda_id = a.id) as total_spots
        FROM agendas a
        JOIN users u ON a.provider_id = u.id
        JOIN services s ON a.service_id = s.id
        JOIN rooms r ON a.room_id = r.id
        ${whereClause}
        ORDER BY a.created_at DESC
    `, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/agendas/:id', authenticateToken, (req, res) => {
    db.get(`
        SELECT a.*,
            u.name as provider_name,
            s.name as service_name, s.duration as service_duration,
            r.name as room_name
        FROM agendas a
        JOIN users u ON a.provider_id = u.id
        JOIN services s ON a.service_id = s.id
        JOIN rooms r ON a.room_id = r.id
        WHERE a.id = ?
    `, [req.params.id], (err, agenda) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!agenda) return res.status(404).json({ error: 'Agenda no encontrada.' });

        // Get spots for this agenda
        db.all('SELECT * FROM spots WHERE agenda_id = ? ORDER BY date, start_time', [req.params.id], (err2, spots) => {
            if (err2) return res.status(500).json({ error: err2.message });
            agenda.spots = spots || [];
            res.json(agenda);
        });
    });
});

app.post('/api/agendas', authenticateToken, (req, res) => {
    const { provider_id, service_id, room_id, type, recurrence_rule, specific_date, start_time, end_time, start_date, end_date, status } = req.body;

    if (!provider_id || !service_id || !room_id || !type || !start_time || !end_time) {
        return res.status(400).json({ error: 'Faltan datos requeridos: provider_id, service_id, room_id, type, start_time, end_time.' });
    }
    if (!['punctual', 'recurrent'].includes(type) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(end_time) ||
        start_time >= end_time) {
        return res.status(400).json({ error: 'El tipo o rango horario de la agenda no es válido.' });
    }

    if (type === 'punctual' && !specific_date) {
        return res.status(400).json({ error: 'Agenda puntual requiere specific_date.' });
    }

    if (type === 'recurrent' && !recurrence_rule) {
        return res.status(400).json({ error: 'Agenda recurrente requiere recurrence_rule.' });
    }
    let recurrenceRule = recurrence_rule || null;
    if (type === 'recurrent') {
        const normalized = normalizeAgendaRecurrenceRule(recurrence_rule);
        if (normalized.error) return res.status(400).json({ error: normalized.error });
        recurrenceRule = normalized.value;
        const rule = JSON.parse(recurrenceRule);
        if (typeof rule.dtstart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rule.dtstart) ||
            Number.isNaN(Date.parse(`${rule.dtstart}T00:00:00Z`))) {
            return res.status(400).json({ error: 'La agenda recurrente requiere una fecha de inicio válida en dtstart.' });
        }
        if (end_date && end_date < rule.dtstart) {
            return res.status(400).json({ error: 'La fecha de término debe ser posterior al inicio.' });
        }
    }

    // Validate service exists
    db.get('SELECT id FROM services WHERE id = ?', [service_id], (errSvc, svc) => {
        if (errSvc) return res.status(500).json({ error: errSvc.message });
        if (!svc) return res.status(400).json({ error: 'Servicio no encontrado.' });

        // Validate room exists
        db.get('SELECT id FROM rooms WHERE id = ?', [room_id], (errRoom, room) => {
            if (errRoom) return res.status(500).json({ error: errRoom.message });
            if (!room) return res.status(400).json({ error: 'Sala no encontrada.' });

            // Validate service-room association
            db.get('SELECT * FROM service_rooms WHERE service_id = ? AND room_id = ?', [service_id, room_id], (err, assoc) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!assoc) return res.status(400).json({ error: 'El servicio no está asociado a la sala seleccionada.' });

                const agendaId = crypto.randomUUID();

                db.run(
                    `INSERT INTO agendas (id, provider_id, service_id, room_id, type, recurrence_rule, specific_date, start_time, end_time, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [agendaId, provider_id, service_id, room_id, type, recurrenceRule, specific_date || null, start_time, end_time, start_date || null, end_date || null, status || 'draft'],
                    function (err2) {
                        if (err2) return res.status(500).json({ error: err2.message });

                        // Generate spots
                        db.get('SELECT * FROM agendas WHERE id = ?', [agendaId], (err3, agenda) => {
                            if (err3) return res.status(500).json({ error: err3.message });

                            const generator = new SpotGenerator(db);
                            generator.generate(agenda, (result) => {
                                const response = {
                                    success: true,
                                    id: agendaId,
                                    spotsGenerated: result.spotsGenerated,
                                    conflicts: result.conflicts
                                };

                                if (result.conflicts > 0) {
                                    response.warning = `${result.conflicts} spots no fueron generados por conflictos con agendas o bookings existentes del prestador/sala.`;
                                }

                                if (result.errors && result.errors.length > 0) {
                                    response.errors = result.errors;
                                }

                                res.json(response);
                            });
                        });
                    }
                );
            });
        });
    });
});

app.put('/api/agendas/:id', authenticateToken, (req, res) => {
    const agendaId = req.params.id;
    const { provider_id, service_id, room_id, type, recurrence_rule, specific_date, start_time, end_time, start_date, end_date, status } = req.body;

    if (!provider_id || !service_id || !room_id || !type || !start_time || !end_time) {
        return res.status(400).json({ error: 'Faltan datos requeridos: provider_id, service_id, room_id, type, start_time, end_time.' });
    }
    if (!['punctual', 'recurrent'].includes(type) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(end_time) ||
        start_time >= end_time) {
        return res.status(400).json({ error: 'El tipo o rango horario de la agenda no es válido.' });
    }

    if (type === 'punctual' && !specific_date) {
        return res.status(400).json({ error: 'Agenda puntual requiere specific_date.' });
    }

    if (type === 'recurrent' && !recurrence_rule) {
        return res.status(400).json({ error: 'Agenda recurrente requiere recurrence_rule.' });
    }
    let recurrenceRule = recurrence_rule || null;
    if (type === 'recurrent') {
        const normalized = normalizeAgendaRecurrenceRule(recurrence_rule);
        if (normalized.error) return res.status(400).json({ error: normalized.error });
        recurrenceRule = normalized.value;
        const rule = JSON.parse(recurrenceRule);
        if (typeof rule.dtstart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rule.dtstart) ||
            Number.isNaN(Date.parse(`${rule.dtstart}T00:00:00Z`))) {
            return res.status(400).json({ error: 'La agenda recurrente requiere una fecha de inicio válida en dtstart.' });
        }
        if (end_date && end_date < rule.dtstart) {
            return res.status(400).json({ error: 'La fecha de término debe ser posterior al inicio.' });
        }
    }

    // Validate service-room association
    db.get('SELECT * FROM service_rooms WHERE service_id = ? AND room_id = ?', [service_id, room_id], (err, assoc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!assoc) return res.status(400).json({ error: 'El servicio no está asociado a la sala seleccionada.' });

        db.run(
            `UPDATE agendas SET provider_id = ?, service_id = ?, room_id = ?, type = ?, recurrence_rule = ?, specific_date = ?, start_time = ?, end_time = ?, start_date = ?, end_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [provider_id, service_id, room_id, type, recurrenceRule, specific_date || null, start_time, end_time, start_date || null, end_date || null, status || 'draft', agendaId],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                // Re-generate spots after update
                db.get('SELECT * FROM agendas WHERE id = ?', [agendaId], (err3, agenda) => {
                    if (err3) return res.status(500).json({ error: err3.message });

                    const generator = new SpotGenerator(db);
                    generator.generate(agenda, (result) => {
                        const response = {
                            success: true,
                            id: agendaId,
                            spotsGenerated: result.spotsGenerated,
                            conflicts: result.conflicts
                        };

                        if (result.conflicts > 0) {
                            response.warning = `${result.conflicts} spots no fueron generados por conflictos con agendas o bookings existentes del prestador/sala.`;
                        }

                        if (result.errors && result.errors.length > 0) {
                            response.errors = result.errors;
                        }

                        res.json(response);
                    });
                });
            }
        );
    });
});

app.delete('/api/agendas/:id', authenticateToken, (req, res) => {
    const agendaId = req.params.id;

    // Get the agenda
    db.get('SELECT * FROM agendas WHERE id = ?', [agendaId], (err, agenda) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!agenda) return res.status(404).json({ error: 'Agenda no encontrada.' });

        // Get all spots for this agenda
        db.all('SELECT * FROM spots WHERE agenda_id = ?', [agendaId], (err2, spots) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const spotIds = (spots || []).map(s => s.id);
            const bookedSpotIds = (spots || []).filter(s => s.status === 'booked').map(s => s.id);
            const reservedSpotIds = (spots || []).filter(s => s.status === 'reserved').map(s => s.id);

            // Check for Paid bookings on associated booked spots
            if (bookedSpotIds.length > 0) {
                const placeholders = bookedSpotIds.map(() => '?').join(',');
                db.all(`SELECT id FROM bookings WHERE spot_id IN (${placeholders}) AND status = 'Paid'`, bookedSpotIds, (err3, paidBookings) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    if (paidBookings && paidBookings.length > 0) {
                        return res.status(400).json({ error: 'No se puede eliminar la agenda porque tiene reservas pagadas asociadas.' });
                    }

                    proceedDeleteAgenda();
                });
            } else {
                proceedDeleteAgenda();
            }

            function proceedDeleteAgenda() {
                db.serialize(() => {
                    // Auto-cancel Pending_Payment bookings on reserved spots
                    if (reservedSpotIds.length > 0) {
                        const resPlaceholders = reservedSpotIds.map(() => '?').join(',');
                        db.run(`UPDATE bookings SET status = 'Cancelled' WHERE spot_id IN (${resPlaceholders}) AND status = 'Pending_Payment'`, reservedSpotIds);
                    }

                    // Delete all spots for this agenda
                    db.run('DELETE FROM spots WHERE agenda_id = ?', [agendaId]);

                    // Delete the agenda
                    db.run('DELETE FROM agendas WHERE id = ?', [agendaId], function (err4) {
                        if (err4) return res.status(500).json({ error: err4.message });
                        res.json({ success: true });
                    });
                });
            }
        });
    });
});

app.post('/api/agendas/:id/publish', authenticateToken, (req, res) => {
    db.run("UPDATE agendas SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Re-generate spots on publish
        db.get('SELECT * FROM agendas WHERE id = ?', [req.params.id], (err2, agenda) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!agenda) return res.json({ success: true });

            const generator = new SpotGenerator(db);
            generator.generate(agenda, (result) => {
                res.json({
                    success: true,
                    spotsGenerated: result.spotsGenerated,
                    conflicts: result.conflicts
                });
            });
        });
    });
});

app.post('/api/agendas/:id/unpublish', authenticateToken, (req, res) => {
    db.run("UPDATE agendas SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =====================================================
// SECTION 13: CLIENT-FACING AVAILABLE SPOTS ENDPOINT
// =====================================================
app.get('/api/spots/available', (req, res) => {
    const { date, providerId, serviceId, roomId, from, to } = req.query;

    let query = `
        SELECT sp.id, sp.agenda_id, sp.provider_id, sp.service_id, sp.room_id,
            sp.date, sp.start_time, sp.end_time, sp.status,
            u.name as provider_name,
            s.name as service_name, s.price as service_price, s.duration as service_duration,
            r.name as room_name
        FROM spots sp
        JOIN agendas a ON sp.agenda_id = a.id
        JOIN users u ON sp.provider_id = u.id
        JOIN services s ON sp.service_id = s.id
        JOIN rooms r ON sp.room_id = r.id
        WHERE sp.status = 'available'
            AND a.status = 'published'
    `;

    const params = [];

    if (date) {
        query += ' AND sp.date = ?';
        params.push(date);
    }
    if (providerId) {
        query += ' AND sp.provider_id = ?';
        params.push(providerId);
    }
    if (serviceId) {
        query += ' AND sp.service_id = ?';
        params.push(serviceId);
    }
    if (roomId) {
        query += ' AND sp.room_id = ?';
        params.push(roomId);
    }
    if (from) {
        query += ' AND sp.date >= ?';
        params.push(from);
    }
    if (to) {
        query += ' AND sp.date <= ?';
        params.push(to);
    }

    query += ' ORDER BY sp.date, sp.start_time';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =====================================================
// SECTION 14: REMAINING ENDPOINTS (unchanged)
// =====================================================

// --- BOOKING MOVE ---
app.post('/api/bookings/:id/move', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { newRoomId, newDate, newStartTime, moveAll } = req.body;

    if (!newRoomId || !newDate || !newStartTime) {
        return res.status(400).json({ error: 'Faltan datos para mover la reserva.' });
    }

    // Obtener el booking actual
    db.get("SELECT * FROM bookings WHERE id = ?", [id], (err, booking) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });

        // Calcular nueva hora de fin
        const newEndTime = minutesToTime(timeToMinutes(newStartTime) + booking.duration);

        // Obtener nombre de la nueva sala
        db.get("SELECT name FROM rooms WHERE id = ?", [newRoomId], (err2, room) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });

            const newRoomName = room.name;

            // Verificar conflictos en nueva sala
            db.all("SELECT * FROM bookings WHERE roomId = ? AND date = ? AND status = 'Paid' AND id != ?",
                [newRoomId, newDate, id], (err3, existingBookings) => {
                    if (err3) return res.status(500).json({ error: err3.message });

                    const hasConflict = existingBookings.some(b => {
                        const bStart = timeToMinutes(b.startTime);
                        const bEnd = timeToMinutes(b.endTime);
                        const newStart = timeToMinutes(newStartTime);
                        const newEnd = timeToMinutes(newEndTime);
                        return newStart < bEnd && bStart < newEnd;
                    });

                    if (hasConflict) {
                        return res.status(400).json({ error: 'La sala tiene un conflicto de horario en ese momento.' });
                    }

                    // Verificar que el prestador no tenga conflicto
                    db.all("SELECT * FROM bookings WHERE providerId = ? AND date = ? AND status = 'Paid' AND id != ?",
                        [booking.providerId, newDate, id], (err4, providerBookings) => {
                            if (err4) return res.status(500).json({ error: err4.message });

                            const hasProviderConflict = providerBookings.some(b => {
                                const bStart = timeToMinutes(b.startTime);
                                const bEnd = timeToMinutes(b.endTime);
                                const newStart = timeToMinutes(newStartTime);
                                const newEnd = timeToMinutes(newEndTime);
                                return newStart < bEnd && bStart < newEnd;
                            });

                            if (hasProviderConflict) {
                                return res.status(400).json({ error: 'El prestador ya tiene una reserva en ese horario.' });
                            }

                            if (moveAll) {
                                db.run(`UPDATE bookings
                            SET roomId = ?, roomName = ?, date = ?, startTime = ?, endTime = ?
                            WHERE serviceId = ? AND providerId = ? AND date = ? AND status = 'Paid'`,
                                    [newRoomId, newRoomName, newDate, newStartTime, newEndTime,
                                        booking.serviceId, booking.providerId, booking.date],
                                    function (err5) {
                                        if (err5) return res.status(500).json({ error: err5.message });
                                        res.json({ success: true, message: 'Todas las instancias movidas exitosamente.', moved: this.changes });
                                    }
                                );
                            } else {
                                db.run(`UPDATE bookings
                            SET roomId = ?, roomName = ?, date = ?, startTime = ?, endTime = ?
                            WHERE id = ?`,
                                    [newRoomId, newRoomName, newDate, newStartTime, newEndTime, id],
                                    function (err5) {
                                        if (err5) return res.status(500).json({ error: err5.message });
                                        res.json({ success: true, message: 'Reserva movida exitosamente.', moved: 1 });
                                    }
                                );
                            }
                        });
                });
        });
    });
});

// --- BOOKING RESCHEDULE ---
app.post('/api/bookings/:id/reschedule', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName } = req.body;

    if (!newDate || !newTimeSlot || !newStartTime || !newEndTime || !newRoomId || !newRoomName) {
        return res.status(400).json({ error: 'Faltan datos para el reagendamiento.' });
    }

    const newSlotStartMin = timeToMinutes(newStartTime);
    const newSlotEndMin = timeToMinutes(newEndTime);

    // 1. Get the booking
    db.get("SELECT * FROM bookings WHERE id = ?", [id], (errBk, booking) => {
        if (errBk) return res.status(500).json({ error: errBk.message });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
        if (booking.status !== 'Paid') return res.status(400).json({ error: 'Solo se pueden reagendar reservas pagadas.' });

        // 2. Get the service to check reschedule config
        db.get("SELECT * FROM services WHERE id = ?", [booking.serviceId], (errSvc, service) => {
            if (errSvc) return res.status(500).json({ error: errSvc.message });

            // 3. Validate if service allows reschedules
            const serviceAllowsReschedule = service ? service.allowReschedule !== 0 : true;
            if (!serviceAllowsReschedule) {
                return res.status(400).json({ error: 'Este servicio no permite reagendamientos.' });
            }

            // 4. Get max_reschedules from service (fallback to global config)
            let maxReschedules;
            if (service && service.maxReschedules) {
                maxReschedules = service.maxReschedules;
            } else {
                db.get("SELECT value FROM config WHERE key = 'max_reschedules'", [], (errCfg, cfgRow) => {
                    if (errCfg) return res.status(500).json({ error: errCfg.message });
                    maxReschedules = cfgRow ? parseInt(cfgRow.value, 10) : 1;
                    proceedWithReschedule(res, booking, id, maxReschedules, newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName, newSlotStartMin, newSlotEndMin);
                });
                return;
            }

            proceedWithReschedule(res, booking, id, maxReschedules, newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName, newSlotStartMin, newSlotEndMin);
        });
    });
});

function proceedWithReschedule(res, booking, id, maxReschedules, newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName, newSlotStartMin, newSlotEndMin) {
    const rescheduleCount = booking.rescheduleCount || 0;
    if (rescheduleCount >= maxReschedules) {
        return res.status(400).json({ error: `Ha alcanzado el límite de ${maxReschedules} reagendamiento(s) para esta reserva.` });
    }

    // 5. Sickness blocks check for new date/time
    db.all("SELECT * FROM sickness_blocks WHERE providerId = ? AND date = ?", [booking.providerId, newDate], (errSb, blocks) => {
        if (errSb) return res.status(500).json({ error: errSb.message });

        const hasSicknessBlock = blocks.some(b => b.timeSlot === 'all' || b.timeSlot === newTimeSlot);
        if (hasSicknessBlock) {
            return res.status(400).json({ error: 'El profesional no está disponible en la nueva fecha/hora seleccionada.' });
        }

        // 6. Provider overlap check (exclude current booking)
        db.all("SELECT * FROM bookings WHERE providerId = ? AND date = ? AND status = 'Paid' AND id != ?", [booking.providerId, newDate, id], (errOb, overlapBooks) => {
            if (errOb) return res.status(500).json({ error: errOb.message });

            const hasOverlap = overlapBooks.some(bk => {
                const bkStart = timeToMinutes(bk.startTime);
                const bkEnd = timeToMinutes(bk.endTime);
                return (newSlotStartMin < bkEnd && bkStart < newSlotEndMin);
            });

            if (hasOverlap) {
                return res.status(400).json({ error: 'El prestador ya se encuentra agendado en otra sala en este horario.' });
            }

            // 7. Room conflict check (exclude current booking)
            db.all("SELECT * FROM bookings WHERE roomId = ? AND date = ? AND status = 'Paid' AND id != ?", [newRoomId, newDate, id], (errRc, roomBooks) => {
                if (errRc) return res.status(500).json({ error: errRc.message });

                const hasRoomConflict = roomBooks.some(bk => {
                    const bkStart = timeToMinutes(bk.startTime);
                    const bkEnd = timeToMinutes(bk.endTime);
                    return (newSlotStartMin < bkEnd && bkStart < newSlotEndMin);
                });

                if (hasRoomConflict) {
                    return res.status(400).json({ error: 'La sala seleccionada se encuentra ocupada por otro profesional en este horario.' });
                }

                // 8. Update the booking
                db.run(`UPDATE bookings
                    SET date = ?, timeSlot = ?, startTime = ?, endTime = ?, roomId = ?, roomName = ?, rescheduleCount = rescheduleCount + 1
                    WHERE id = ?`,
                    [newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName, id],
                    function (errUp) {
                        if (errUp) return res.status(500).json({ error: errUp.message });
                        res.json({ success: true, message: 'Reserva reagendada con éxito.' });
                    }
                );
            });
        });
    });
}

// --- SICKNESS BLOCKS ---
app.get('/api/blocks', authenticateToken, (req, res) => {
    db.all("SELECT * FROM sickness_blocks", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/blocks', authenticateToken, (req, res) => {
    const { id, providerId, date, timeSlot, reason } = req.body;
    db.run("INSERT INTO sickness_blocks (id, providerId, date, timeSlot, reason) VALUES (?, ?, ?, ?, ?)",
        [id, providerId, date, timeSlot, reason],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

app.delete('/api/blocks/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM sickness_blocks WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- CLIENTS (ahora consultan la tabla users) ---
app.get('/api/clients', authenticateToken, (req, res) => {
    db.all("SELECT id, email, name, rut, phone FROM users WHERE role = 'usuario'", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/clients', authenticateToken, (req, res) => {
    const { email, name, rut, phone } = req.body;
    const userId = 'usr-' + Date.now();
    db.run("INSERT OR REPLACE INTO users (id, email, password, name, role, rut, phone) VALUES (?, ?, '', ?, 'usuario', ?, ?)",
        [userId, email, name, rut || '', phone || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/clients/:email', authenticateToken, (req, res) => {
    db.run("DELETE FROM users WHERE email = ? AND role = 'usuario'", [req.params.email], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- ACTIVITIES ---
app.get('/api/activities', (req, res) => {
    db.all(`SELECT a.*, COALESCE(e.enrolledCount, 0) as enrolledCount
            FROM activities a
            LEFT JOIN (SELECT activityId, COUNT(*) as enrolledCount FROM activity_enrollments GROUP BY activityId) e
            ON a.id = e.activityId`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/activities', authenticateToken, (req, res) => {
    const { id, title, date, time, location, desc, capacity } = req.body;
    db.run("INSERT INTO activities (id, title, date, time, location, desc, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, title, date, time, location, desc, capacity || 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

app.delete('/api/activities/:id', authenticateToken, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM activity_enrollments WHERE activityId = ?", [req.params.id]);
        db.run("DELETE FROM activities WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// --- ACTIVITY ENROLLMENTS ---
app.post('/api/activities/enroll', (req, res) => {
    const { activityId, clientName, clientEmail, clientPhone } = req.body;

    if (!activityId || !clientName || !clientEmail || !clientPhone) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    // Check capacity
    db.get("SELECT capacity FROM activities WHERE id = ?", [activityId], (errAct, act) => {
        if (errAct) return res.status(500).json({ error: errAct.message });
        if (!act) return res.status(404).json({ error: 'Actividad no encontrada.' });

        db.get("SELECT COUNT(*) as cnt FROM activity_enrollments WHERE activityId = ?", [activityId], (errCount, countRow) => {
            if (errCount) return res.status(500).json({ error: errCount.message });

            if (act.capacity > 0 && countRow.cnt >= act.capacity) {
                return res.status(400).json({ error: 'No hay cupos disponibles para esta actividad.' });
            }

            // Check duplicate email
            db.get("SELECT id FROM activity_enrollments WHERE activityId = ? AND clientEmail = ?", [activityId, clientEmail], (errDup, dup) => {
                if (errDup) return res.status(500).json({ error: errDup.message });
                if (dup) return res.status(400).json({ error: 'Ya estás inscrito/a en esta actividad con este correo.' });

                const enrollId = "enr-" + Date.now();
                db.run("INSERT INTO activity_enrollments (id, activityId, clientName, clientEmail, clientPhone) VALUES (?, ?, ?, ?, ?)",
                    [enrollId, activityId, clientName, clientEmail, clientPhone],
                    function (errIns) {
                        if (errIns) return res.status(500).json({ error: errIns.message });
                        res.json({ success: true, id: enrollId });
                    }
                );
            });
        });
    });
});

app.get('/api/activities/enrollments', authenticateToken, (req, res) => {
    db.all(`SELECT e.*, a.title as activityTitle
            FROM activity_enrollments e
            LEFT JOIN activities a ON e.activityId = a.id
            ORDER BY e.created_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/activities/enrollments/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM activity_enrollments WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- CONFIG (Popup, Banners) ---
app.get('/api/config', (req, res) => {
    db.all("SELECT * FROM config", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const config = {};
        rows.forEach(r => {
            config[r.key] = r.value;
        });
        res.json(config);
    });
});

app.post('/api/config', authenticateToken, (req, res) => {
    const data = req.body;
    db.serialize(() => {
        const stmt = db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)");
        Object.keys(data).forEach(k => {
            stmt.run(k, String(data[k]));
        });
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// --- KHIPU PAYMENTS INTEGRATION (API v3) ---
app.post('/api/khipu/create-payment', (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) {
        return res.status(400).json({ error: 'Falta bookingId.' });
    }

    if (!process.env.KHIPU_API_KEY) {
        console.warn('WARNING: KHIPU_API_KEY no configurada en el servidor.');
        return res.status(503).json({ error: 'La pasarela de pagos Khipu no está configurada en este entorno.' });
    }

    db.get("SELECT * FROM bookings WHERE id = ?", [bookingId], async (err, booking) => {
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
            const expiresDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
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

            db.run("UPDATE bookings SET khipuPaymentId = ?, khipuPaymentUrl = ? WHERE id = ?",
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
            res.status(502).json({ error: 'Error al comunicarse con la pasarela de pagos Khipu.' });
        }
    });
});

function handleKhipuWebhook(req, res) {
    const signatureHeader = req.headers['x-khipu-signature'];
    const webhookSecret = process.env.KHIPU_SECRET;

    if (!webhookSecret) {
        console.error('Webhook: KHIPU_SECRET no está configurada.');
        return res.status(503).send('Webhook no configurado');
    }

    if (!verifyKhipuSignature(req.rawBody, signatureHeader, webhookSecret)) {
        console.warn('Webhook: Firma x-khipu-signature inválida o faltante.');
        return res.status(401).send('Firma inválida');
    }

    const paymentEvent = req.body;
    const notifId = crypto.randomUUID();
    const type = 'payment_3.0';
    const headersStr = JSON.stringify(req.headers);
    const queryStr = JSON.stringify(req.query);
    const bodyStr = typeof paymentEvent === 'object' ? JSON.stringify(paymentEvent) : String(paymentEvent);
    const ipStr = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    db.run("INSERT INTO khipu_notifications (id, type, headers, query_params, body, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
        [notifId, type, headersStr, queryStr, bodyStr, ipStr],
        (err) => {
            if (err) console.error('Error logging payment notification to database:', err.message);
        }
    );

    const bookingId = paymentEvent?.transaction_id || paymentEvent?.data?.transaction_id;
    const paymentId = paymentEvent?.payment_id || paymentEvent?.data?.payment_id;

    if (!bookingId || !paymentId) {
        return res.status(200).send('Payload incompleto');
    }

    db.get("SELECT * FROM bookings WHERE id = ?", [bookingId], async (errBk, booking) => {
        if (errBk || !booking) {
            console.error('Webhook: Booking not found:', bookingId);
            return res.status(200).send('Booking not found');
        }

        if (booking.status === 'Paid' || booking.status === 'Payment_Conflict') {
            return res.status(200).send('Already processed');
        }

        if (booking.khipuPaymentId && booking.khipuPaymentId !== paymentId) {
            console.error(`Webhook: Mismatch de payment_id para booking ${bookingId}`);
            return res.status(200).send('Payment ID mismatch');
        }

        const eventAmount = paymentEvent?.amount != null ? paymentEvent.amount : paymentEvent?.data?.amount;
        if (eventAmount != null && Number(eventAmount) !== Number(booking.price)) {
            console.error(`Webhook: Monto discrepante para booking ${bookingId}`);
            return res.status(200).send('Amount mismatch');
        }

        try {
            const paymentDetails = await callKhipuApi('GET', `/payments/${paymentId}`);
            if (paymentDetails.status === 'done') {
                reconcileBookingPayment(bookingId, (errRec) => {
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
    db.all("SELECT * FROM khipu_notifications ORDER BY received_at DESC", (err, rows) => {
        if (err) {
            console.error('Error fetching notifications from database:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/bookings/:id/payment-status', (req, res) => {
    db.get("SELECT * FROM bookings WHERE id = ?", [req.params.id], async (err, booking) => {
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
            } catch (errApi) {
                // If call fails (network or pending), proceed to return current status
            }
        }

        res.json({ status: booking.status });
    });
});

// =====================================================
// CLEANUP SCHEDULER (Abandoned Pending Payments)
// =====================================================
function cleanupPendingPayments() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    db.all("SELECT id, spot_id, khipuPaymentId FROM bookings WHERE status = 'Pending_Payment' AND created_at < ?", [oneHourAgo], async (err, bookings) => {
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
                } catch (_err) {
                    // Ignore API errors and proceed with normal cleanup
                }
            }

            db.serialize(() => {
                if (b.spot_id) {
                    db.run("UPDATE spots SET status = 'available', booking_id = NULL WHERE id = ?", [b.spot_id]);
                }
                db.run("DELETE FROM bookings WHERE id = ?", [b.id]);
            });
        }
    });
}

// =====================================================
// START SERVER
// =====================================================
db.ready.then(() => {
    app.listen(PORT, () => {
        console.log(`PsicArte Server is running on port ${PORT}`);
        console.log(`Frontend served locally at: http://localhost:${PORT}/index.html`);

        cleanupPendingPayments();
        setInterval(cleanupPendingPayments, 30 * 60 * 1000);
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
