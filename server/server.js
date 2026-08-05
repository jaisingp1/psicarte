require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from /public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Utility: convert time string "09:30" to minutes
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
}

// ----------------------------------------------------
// KHIPU PAYMENT GATEWAY HELPERS
// ----------------------------------------------------
function percentEncode(str) {
    return encodeURIComponent(str)
        .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateKhipuSignature(method, url, params, secret) {
    const sortedKeys = Object.keys(params).sort();
    const paramPairs = sortedKeys.map(key => {
        const encodedKey = percentEncode(key);
        const encodedValue = percentEncode(String(params[key]));
        return `${encodedKey}=${encodedValue}`;
    });
    const parameterString = paramPairs.join('&');
    const baseString = [
        method.toUpperCase(),
        percentEncode(url),
        percentEncode(parameterString)
    ].join('&');
    return crypto
        .createHmac('sha256', secret)
        .update(baseString)
        .digest('hex');
}

async function callKhipuApi(method, path, params) {
    if (params && params.notification_token && String(params.notification_token).startsWith('mock-token-')) {
        return {
            status: 'done',
            transaction_id: String(params.notification_token).replace('mock-token-', '')
        };
    }

    const receiverId = process.env.KHIPU_RECEIVER_ID;
    const secret = process.env.KHIPU_SECRET;
    const sandbox = process.env.KHIPU_SANDBOX === 'true';
    const apiBase = sandbox ? 'https://sandbox.khipu.com/api/2.0' : 'https://khipu.com/api/2.0';
    
    const url = `${apiBase}${path}`;
    const signature = generateKhipuSignature(method, url, params, secret);
    
    const headers = {
        'Authorization': `Khipu ${receiverId}:${signature}`,
        'Accept': 'application/json'
    };
    
    let fetchUrl = url;
    let options = { method, headers };
    
    if (method.toUpperCase() === 'GET') {
        const query = Object.keys(params)
            .map(key => `${percentEncode(key)}=${percentEncode(String(params[key]))}`)
            .join('&');
        fetchUrl = `${url}?${query}`;
    } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const body = Object.keys(params)
            .map(key => `${percentEncode(key)}=${percentEncode(String(params[key]))}`)
            .join('&');
        options.body = body;
    }
    
    const response = await fetch(fetchUrl, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Khipu API error: ${response.status} - ${errorText}`);
    }
    return await response.json();
}

// ----------------------------------------------------
// REST API: AUTH
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
        return res.status(400).json({ error: 'Faltan credenciales o rol.' });
    }

    if (role === 'administrador') {
        if (email === 'admin@psicarte.cl' && password === 'admin123') {
            return res.json({ name: 'Administrador General', email, role });
        }
    } else if (role === 'prestador') {
        if (password === 'prestador123') {
            db.get("SELECT id, name, email FROM providers WHERE email = ?", [email], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                if (row) {
                    return res.json({ id: row.id, name: row.name, email: row.email, role });
                } else {
                    return res.status(401).json({ error: 'Prestador no encontrado.' });
                }
            });
            return;
        }
    } else if (role === 'usuario') {
        // Auto register / login mock client
        db.get("SELECT name, email, rut, phone FROM clients WHERE email = ?", [email], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) {
                return res.json({ name: row.name, email: row.email, role });
            } else {
                const name = email.split('@')[0].toUpperCase();
                db.run("INSERT INTO clients (email, name, rut, phone) VALUES (?, ?, '', '')", [email, name], (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    return res.json({ name, email, role });
                });
            }
        });
        return;
    } else {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
    }
});

app.post('/api/auth/recover', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Se requiere email.' });
    
    // Check if email exists in any role
    db.get("SELECT email FROM clients WHERE email = ? UNION SELECT email FROM providers WHERE email = ?", [email, email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const isAdmin = (email === "admin@psicarte.cl");
        
        if (row || isAdmin) {
            return res.json({ success: true, message: `Correo de recuperación enviado a ${email}` });
        } else {
            return res.status(404).json({ error: 'Correo no registrado.' });
        }
    });
});

// ----------------------------------------------------
// REST API: CONTENT (Mission, Vision, etc.)
// ----------------------------------------------------
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

app.post('/api/content', (req, res) => {
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

// ----------------------------------------------------
// REST API: ROOMS
// ----------------------------------------------------
app.get('/api/rooms', (req, res) => {
    db.all("SELECT * FROM rooms", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/rooms', (req, res) => {
    const { id, name, type, openTime, closeTime } = req.body;
    db.run("INSERT OR REPLACE INTO rooms (id, name, type, openTime, closeTime) VALUES (?, ?, ?, ?, ?)",
        [id, name, type, openTime, closeTime],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

app.delete('/api/rooms/:id', (req, res) => {
    db.run("DELETE FROM rooms WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// REST API: PROVIDERS & SERVICES
// ----------------------------------------------------
app.get('/api/providers', (req, res) => {
    // Join providers and services
    db.all("SELECT * FROM providers", (err, provs) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all("SELECT * FROM services", (err2, servs) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            const nested = provs.map(p => {
                const blocksParsed = p.blocks ? JSON.parse(p.blocks) : {};
                const pServices = servs.filter(s => s.providerId === p.id);
                return {
                    id: p.id,
                    name: p.name,
                    role: p.role,
                    email: p.email,
                    blocks: blocksParsed,
                    bio: p.bio || '',
                    services: pServices
                };
            });
            res.json(nested);
        });
    });
});

app.post('/api/providers', (req, res) => {
    const { id, name, role, email, blocks, bio } = req.body;
    const blocksStr = JSON.stringify(blocks || {
        2: ["20:00-21:00", "21:00-22:00"],
        4: ["09:00-10:00", "10:00-11:00", "11:00-12:00", "20:00-21:00", "21:00-22:00"],
        5: ["09:00-10:00", "10:00-11:00", "11:00-12:00", "20:00-21:00", "21:00-22:00"]
    });
    db.run("INSERT INTO providers (id, name, role, email, blocks, bio) VALUES (?, ?, ?, ?, ?, ?)",
        [id, name, role, email, blocksStr, bio || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

app.delete('/api/providers/:id', (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM providers WHERE id = ?", [req.params.id]);
        db.run("DELETE FROM services WHERE providerId = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.post('/api/services', (req, res) => {
    const { id, providerId, name, price, duration, type, allowReschedule, maxReschedules } = req.body;
    const allowRescheduleVal = allowReschedule !== undefined ? (allowReschedule ? 1 : 0) : 1;
    const maxReschedulesVal = maxReschedules || 1;
    db.run("INSERT OR REPLACE INTO services (id, providerId, name, price, duration, type, allowReschedule, maxReschedules) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, providerId, name, price, duration, type, allowRescheduleVal, maxReschedulesVal],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/services/:id', (req, res) => {
    db.run("DELETE FROM services WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// REST API: BOOKINGS & SCHEDULER RULES
// ----------------------------------------------------
app.get('/api/bookings', (req, res) => {
    db.all("SELECT * FROM bookings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/bookings', (req, res) => {
    const booking = req.body;
    const { providerId, date, timeSlot, roomId, startTime, endTime } = booking;
    
    const slotStartMin = timeToMinutes(startTime);
    const slotEndMin = timeToMinutes(endTime);

    // SERVER-SIDE CONFLICT CHECKS
    // 1. Sickness Blocks Check
    db.all("SELECT * FROM sickness_blocks WHERE providerId = ? AND date = ?", [providerId, date], (err, blocks) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const hasSicknessBlock = blocks.some(b => b.timeSlot === 'all' || b.timeSlot === timeSlot);
        if (hasSicknessBlock) {
            return res.status(400).json({ error: 'El profesional no está disponible este día/hora (Licencia o Enfermedad).' });
        }
        
        // 2. Provider overlapping confirmed bookings check (regardless of room)
        db.all("SELECT * FROM bookings WHERE providerId = ? AND date = ? AND status = 'Paid'", [providerId, date], (err2, books) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            const hasOverlappingBooking = books.some(bk => {
                const bkStart = timeToMinutes(bk.startTime);
                const bkEnd = timeToMinutes(bk.endTime);
                return (slotStartMin < bkEnd && bkStart < slotEndMin);
            });
            
            if (hasOverlappingBooking) {
                return res.status(400).json({ error: 'El prestador ya se encuentra agendado en otra sala en este horario.' });
            }

            // 3. Room occupied by another booking check
            db.all("SELECT * FROM bookings WHERE roomId = ? AND date = ? AND status = 'Paid'", [roomId, date], (err3, roomBooks) => {
                if (err3) return res.status(500).json({ error: err3.message });
                
                const hasRoomConflict = roomBooks.some(bk => {
                    const bkStart = timeToMinutes(bk.startTime);
                    const bkEnd = timeToMinutes(bk.endTime);
                    return (slotStartMin < bkEnd && bkStart < slotEndMin);
                });
                
                if (hasRoomConflict) {
                    return res.status(400).json({ error: 'La sala seleccionada se encuentra ocupada por otro profesional en este horario.' });
                }

                const initialStatus = booking.adminMode ? 'Paid' : 'Pending_Payment';

                // Proceed with insertion
                db.run(`INSERT INTO bookings (
                    id, providerId, serviceId, serviceName, price, duration, roomId, roomName, date, timeSlot, startTime, endTime, clientEmail, clientName, clientRut, clientPhone, status, khipuPaymentId, khipuPaymentUrl
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    booking.id, providerId, booking.serviceId, booking.serviceName, booking.price, booking.duration,
                    roomId, booking.roomName, date, timeSlot, startTime, endTime,
                    booking.clientEmail, booking.clientName, booking.clientRut, booking.clientPhone, 
                    initialStatus, null, null
                ],
                function(err4) {
                    if (err4) return res.status(500).json({ error: err4.message });
                    
                    // Insert or update Client profile database
                    db.run("INSERT OR REPLACE INTO clients (email, name, rut, phone) VALUES (?, ?, ?, ?)",
                        [booking.clientEmail, booking.clientName, booking.clientRut, booking.clientPhone],
                        (err5) => {
                            if (err5) console.error("Error storing client:", err5.message);
                        }
                    );
                    
                    res.json({ success: true, id: booking.id });
                });
            });
        });
    });
});

app.delete('/api/bookings/:id', (req, res) => {
    db.run("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/bookings/:id/purge', (req, res) => {
    db.run("DELETE FROM bookings WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// REST API: BOOKINGS RESCHEDULE
// ----------------------------------------------------
app.post('/api/bookings/:id/reschedule', (req, res) => {
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
                // Fallback to global config
                db.get("SELECT value FROM config WHERE key = 'max_reschedules'", [], (errCfg, cfgRow) => {
                    if (errCfg) return res.status(500).json({ error: errCfg.message });
                    maxReschedules = cfgRow ? parseInt(cfgRow.value, 10) : 1;
                    proceedWithReschedule(booking, id, maxReschedules, newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName, newSlotStartMin, newSlotEndMin);
                });
                return;
            }

            proceedWithReschedule(booking, id, maxReschedules, newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName, newSlotStartMin, newSlotEndMin);
        });
    });
});

function proceedWithReschedule(booking, id, maxReschedules, newDate, newTimeSlot, newStartTime, newEndTime, newRoomId, newRoomName, newSlotStartMin, newSlotEndMin) {
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
                    function(errUp) {
                        if (errUp) return res.status(500).json({ error: errUp.message });
                        res.json({ success: true, message: 'Reserva reagendada con éxito.' });
                    }
                );
            });
        });
    });
}

// ----------------------------------------------------
// REST API: SICKNESS BLOCKS
// ----------------------------------------------------
app.get('/api/blocks', (req, res) => {
    db.all("SELECT * FROM sickness_blocks", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/blocks', (req, res) => {
    const { id, providerId, date, timeSlot, reason } = req.body;
    db.run("INSERT INTO sickness_blocks (id, providerId, date, timeSlot, reason) VALUES (?, ?, ?, ?, ?)",
        [id, providerId, date, timeSlot, reason],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

app.delete('/api/blocks/:id', (req, res) => {
    db.run("DELETE FROM sickness_blocks WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// REST API: CLIENTS
// ----------------------------------------------------
app.get('/api/clients', (req, res) => {
    db.all("SELECT * FROM clients", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/clients', (req, res) => {
    const { email, name, rut, phone } = req.body;
    db.run("INSERT OR REPLACE INTO clients (email, name, rut, phone) VALUES (?, ?, ?, ?)",
        [email, name, rut, phone],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/clients/:email', (req, res) => {
    db.run("DELETE FROM clients WHERE email = ?", [req.params.email], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// REST API: ACTIVITIES
// ----------------------------------------------------
app.get('/api/activities', (req, res) => {
    db.all(`SELECT a.*, COALESCE(e.enrolledCount, 0) as enrolledCount
            FROM activities a
            LEFT JOIN (SELECT activityId, COUNT(*) as enrolledCount FROM activity_enrollments GROUP BY activityId) e
            ON a.id = e.activityId`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/activities', (req, res) => {
    const { id, title, date, time, location, desc, capacity } = req.body;
    db.run("INSERT INTO activities (id, title, date, time, location, desc, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, title, date, time, location, desc, capacity || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

app.delete('/api/activities/:id', (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM activity_enrollments WHERE activityId = ?", [req.params.id]);
        db.run("DELETE FROM activities WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ----------------------------------------------------
// REST API: ACTIVITY ENROLLMENTS
// ----------------------------------------------------
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
                    function(errIns) {
                        if (errIns) return res.status(500).json({ error: errIns.message });

                        // Save client to clients table if not exists
                        db.run("INSERT OR IGNORE INTO clients (email, name, phone) VALUES (?, ?, ?)",
                            [clientEmail, clientName, clientPhone], () => {});

                        res.json({ success: true, id: enrollId });
                    }
                );
            });
        });
    });
});

app.get('/api/activities/enrollments', (req, res) => {
    db.all(`SELECT e.*, a.title as activityTitle
            FROM activity_enrollments e
            LEFT JOIN activities a ON e.activityId = a.id
            ORDER BY e.created_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/activities/enrollments/:id', (req, res) => {
    db.run("DELETE FROM activity_enrollments WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// REST API: CONFIG (Popup, Banners)
// ----------------------------------------------------
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

app.post('/api/config', (req, res) => {
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

// ----------------------------------------------------
// REST API: KHIPU PAYMENTS INTEGRATION
// ----------------------------------------------------
app.post('/api/khipu/create-payment', (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) {
        return res.status(400).json({ error: 'Falta bookingId.' });
    }
    
    db.get("SELECT * FROM bookings WHERE id = ?", [bookingId], async (err, booking) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
        if (booking.status !== 'Pending_Payment') {
            return res.status(400).json({ error: 'La reserva ya fue pagada o cancelada.' });
        }
        
        try {
            const baseUrl = process.env.KHIPU_BASE_URL || `http://localhost:${PORT}`;
            const params = {
                subject: `Reserva PsicArte: ${booking.serviceName}`,
                currency: 'CLP',
                amount: booking.price,
                transaction_id: booking.id,
                notify_url: `${baseUrl}/api/khipu/notify`,
                payer_email: booking.clientEmail,
                payer_name: booking.clientName
            };
            
            const khipuResponse = await callKhipuApi('POST', '/payments', params);
            
            // Save payment ID and URL
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
            
            if (process.env.KHIPU_SANDBOX === 'true') {
                console.warn(`WARNING: Khipu Sandbox is unreachable (${error.message || 'fetch failed'}). Activating Offline Simulator fallback.`);
                const mockPaymentId = `mock-token-${booking.id}`;
                const mockPaymentUrl = `#mock-payment-${booking.id}`;
                
                db.run("UPDATE bookings SET khipuPaymentId = ?, khipuPaymentUrl = ? WHERE id = ?",
                    [mockPaymentId, mockPaymentUrl, booking.id],
                    (errUpdate) => {
                        if (errUpdate) return res.status(500).json({ error: errUpdate.message });
                        return res.json({
                            success: true,
                            paymentId: mockPaymentId,
                            paymentUrl: mockPaymentUrl,
                            isOfflineMock: true
                        });
                    }
                );
            } else {
                res.status(500).json({ error: 'Error al comunicarse con la pasarela de pagos Khipu.' });
            }
        }
    });
});

app.post('/api/khipu/notify', (req, res) => {
    const { notification_token } = req.body;
    if (!notification_token) {
        return res.status(400).send('Falta notification_token.');
    }
    
    // Log the notification to the database
    const notifId = crypto.randomUUID();
    const type = 'payment_1.3';
    const headersStr = JSON.stringify(req.headers);
    const queryStr = JSON.stringify(req.query);
    const bodyStr = JSON.stringify(req.body);
    const ipStr = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    db.run("INSERT INTO khipu_notifications (id, type, headers, query_params, body, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
        [notifId, type, headersStr, queryStr, bodyStr, ipStr],
        (err) => {
            if (err) console.error('Error logging payment notification to database:', err.message);
        }
    );
    
    // Fetch payment details from Khipu
    callKhipuApi('GET', `/payments`, { notification_token })
        .then(payment => {
            if (payment.status === 'done') {
                const bookingId = payment.transaction_id;
                
                db.get("SELECT * FROM bookings WHERE id = ?", [bookingId], (errBk, booking) => {
                    if (errBk || !booking) {
                        console.error('Webhook: Booking not found:', bookingId);
                        return res.status(200).send('Booking not found');
                    }
                    
                    if (booking.status === 'Paid') {
                        return res.status(200).send('Already processed');
                    }
                    
                    // Re-run conflict checks before marking as Paid
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
                                console.error(`Webhook conflict detected for booking ${bookingId}. Marking as Payment_Conflict.`);
                                finalStatus = 'Payment_Conflict';
                            }
                            
                            db.run("UPDATE bookings SET status = ? WHERE id = ?", [finalStatus, bookingId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Webhook: failed to update booking status:', errUpdate.message);
                                    return res.status(500).send('Error updating booking');
                                } else {
                                    console.log(`Webhook: booking ${bookingId} successfully updated to ${finalStatus}`);
                                    return res.status(200).send('Notification received and processed');
                                }
                            });
                        });
                    });
                });
            } else {
                res.status(200).send('Notification received (payment not done)');
            }
        })
        .catch(error => {
            console.error('Webhook: Khipu verification failed:', error);
            res.status(500).send('Verification failed');
        });
});

app.post('/api/khipu/notify/rendition', (req, res) => {
    const notifId = crypto.randomUUID();
    const type = 'rendition_drn_2.0';
    const headersStr = JSON.stringify(req.headers);
    const queryStr = JSON.stringify(req.query);
    const bodyStr = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body);
    const ipStr = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    db.run("INSERT INTO khipu_notifications (id, type, headers, query_params, body, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
        [notifId, type, headersStr, queryStr, bodyStr, ipStr],
        (err) => {
            if (err) {
                console.error('Error logging rendition notification to database:', err.message);
                return res.status(500).send('Error saving notification');
            }
            res.status(200).send('Rendition notification logged successfully');
        }
    );
});

app.post('/api/khipu/notify/transactions', (req, res) => {
    const notifId = crypto.randomUUID();
    const type = 'transaction_dtn_1.0';
    const headersStr = JSON.stringify(req.headers);
    const queryStr = JSON.stringify(req.query);
    const bodyStr = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body);
    const ipStr = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    db.run("INSERT INTO khipu_notifications (id, type, headers, query_params, body, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
        [notifId, type, headersStr, queryStr, bodyStr, ipStr],
        (err) => {
            if (err) {
                console.error('Error logging transaction notification to database:', err.message);
                return res.status(500).send('Error saving notification');
            }
            res.status(200).send('Transaction notification logged successfully');
        }
    );
});

app.get('/api/admin/khipu-notifications', (req, res) => {
    db.all("SELECT * FROM khipu_notifications ORDER BY received_at DESC", (err, rows) => {
        if (err) {
            console.error('Error fetching notifications from database:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/bookings/:id/payment-status', (req, res) => {
    db.get("SELECT status FROM bookings WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Reserva no encontrada.' });
        res.json({ status: row.status });
    });
});

// ----------------------------------------------------
// CLEANUP SCHEDULER (Abandoned Pending Payments)
// ----------------------------------------------------
function cleanupPendingPayments() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    db.run("DELETE FROM bookings WHERE status = 'Pending_Payment' AND created_at < ?", [oneHourAgo], function(err) {
        if (err) {
            console.error('Cleanup error:', err.message);
        } else if (this.changes > 0) {
            console.log(`Cleanup: Deleted ${this.changes} abandoned Pending_Payment booking(s).`);
        }
    });
}

// Start Server
app.listen(PORT, () => {
    console.log(`PsicArte Server is running on port ${PORT}`);
    console.log(`Frontend served locally at: http://localhost:${PORT}/index.html`);
    
    // Start cleanup scheduler
    cleanupPendingPayments();
    setInterval(cleanupPendingPayments, 30 * 60 * 1000);
});
