// server/google-meet.js
// Integración con Google Meet mediante OAuth 2.0 y Google Calendar API v3

const crypto = require('crypto');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-meet/oauth/callback';

const CALENDAR_API_ENDPOINT = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Genera la URL de autorización OAuth 2.0 para conectar la cuenta de Google del prestador.
 */
function getGoogleOAuthUrl({ providerId, roomId }) {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID no configurado en variables de entorno.');
    }
    const state = JSON.stringify({ providerId, roomId, nonce: crypto.randomUUID() });
    const encodedState = Buffer.from(state).toString('base64url');

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
        access_type: 'offline',
        prompt: 'consent',
        state: encodedState
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Procesa el callback OAuth 2.0 e intercambia el código por tokens.
 */
async function handleGoogleOAuthCallback(db, { code, state }) {
    if (!code || !state) {
        throw new Error('Código o estado faltante en callback OAuth.');
    }

    let parsedState;
    try {
        const decoded = Buffer.from(state, 'base64url').toString('utf8');
        parsedState = JSON.parse(decoded);
    } catch (err) {
        throw new Error('Estado OAuth inválido o corrupto.', { cause: err });
    }

    const { providerId, roomId } = parsedState;
    if (!providerId || !roomId) {
        throw new Error('providerId o roomId faltantes en estado OAuth.');
    }

    const tokenParams = new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
    });

    const tokenRes = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
    });

    if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Error canjeando token de Google: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = Number(tokenData.expires_in) || 3600;
    const tokenExpiry = Date.now() + expiresIn * 1000;

    // Obtener email de Google
    let googleEmail = 'cuenta-conectada@google.com';
    try {
        const userRes = await fetch(USERINFO_ENDPOINT, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.email) googleEmail = userData.email;
        }
    } catch (_) {
        // Fallback a placeholder si la llamada falla
    }

    // Guardar o actualizar en provider_room_google_accounts
    const existing = await dbGet(db, 'SELECT id, refresh_token FROM provider_room_google_accounts WHERE provider_id = ? AND room_id = ?', [providerId, roomId]);
    const finalRefreshToken = refreshToken || (existing ? existing.refresh_token : null);

    if (existing) {
        await dbRun(db, `
            UPDATE provider_room_google_accounts
            SET google_email = ?, access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [googleEmail, accessToken, finalRefreshToken, tokenExpiry, existing.id]);
    } else {
        const id = crypto.randomUUID();
        await dbRun(db, `
            INSERT INTO provider_room_google_accounts (id, provider_id, room_id, google_email, access_token, refresh_token, token_expiry)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, providerId, roomId, googleEmail, accessToken, finalRefreshToken, tokenExpiry]);
    }

    return { providerId, roomId, googleEmail };
}

/**
 * Refresca el access_token usando el refresh_token.
 */
async function refreshAccessToken(refreshToken) {
    if (!refreshToken) throw new Error('refresh_token no disponible');

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
    });

    const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Fallo al refrescar token de Google: ${errText}`);
    }

    const data = await res.json();
    const expiresIn = Number(data.expires_in) || 3600;
    return {
        accessToken: data.access_token,
        tokenExpiry: Date.now() + expiresIn * 1000
    };
}

/**
 * Obtiene un access_token válido para el par prestador-sala, refrescándolo si está por expirar.
 */
async function ensureValidAccessToken(db, providerId, roomId) {
    const account = await dbGet(db, `
        SELECT * FROM provider_room_google_accounts
        WHERE provider_id = ? AND room_id = ?
    `, [providerId, roomId]);

    if (!account) return null;

    // Si expira en menos de 2 minutos y hay refresh_token, refrescar
    if (Date.now() >= (account.token_expiry - 120000) && account.refresh_token) {
        try {
            const refreshed = await refreshAccessToken(account.refresh_token);
            await dbRun(db, `
                UPDATE provider_room_google_accounts
                SET access_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [refreshed.accessToken, refreshed.tokenExpiry, account.id]);
            return refreshed.accessToken;
        } catch (err) {
            console.error('Error refrescando access_token de Google:', err.message);
            return account.access_token;
        }
    }

    return account.access_token;
}

/**
 * Crea el evento en Google Calendar con enlace Hangouts Meet adjunto.
 */
async function createGoogleCalendarMeeting({ accessToken, summary, description, startDateTime, endDateTime, requestId }) {
    const eventBody = {
        summary: summary || 'Sesión PsicArte',
        description: description || 'Sesión agendada a través de Centro Integral PsicArte',
        start: {
            dateTime: startDateTime,
            timeZone: 'America/Santiago'
        },
        end: {
            dateTime: endDateTime,
            timeZone: 'America/Santiago'
        },
        conferenceData: {
            createRequest: {
                requestId: requestId || crypto.randomUUID(),
                conferenceSolutionKey: {
                    type: 'hangoutsMeet'
                }
            }
        }
    };

    const res = await fetch(CALENDAR_API_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
    }

    const event = await res.json();
    let meetLink = event.hangoutLink;
    if (!meetLink && event.conferenceData?.entryPoints) {
        const videoEntry = event.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
        if (videoEntry) meetLink = videoEntry.uri;
    }

    if (!meetLink) {
        throw new Error('Google Calendar no retornó un enlace de Google Meet en conferenceData.');
    }

    return meetLink;
}

/**
 * Disparador de generación de link de Google Meet.
 * Invocado únicamente después de que el pago de la cita sea exitoso ('Paid').
 * Realiza hasta 3 reintentos con espera progresiva (5s, 15s, 45s).
 */
async function triggerMeetLinkGeneration(db, bookingId, attempt = 1) {
    try {
        const booking = await dbGet(db, `
            SELECT b.*, r.type as room_type, r.meet_enabled as room_meet_enabled, u.name as provider_name
            FROM bookings b
            JOIN rooms r ON b.roomId = r.id
            JOIN users u ON b.providerId = u.id
            WHERE b.id = ?
        `, [bookingId]);

        if (!booking) return { status: 'not_found' };

        // Solo aplica a salas virtuales con meet_enabled = 1
        if (booking.room_type !== 'Virtual' || booking.room_meet_enabled !== 1) {
            await dbRun(db, 'UPDATE bookings SET meet_status = \'none\' WHERE id = ?', [bookingId]);
            return { status: 'none' };
        }

        // Si ya tiene meet_link (ej. conservado al reprogramar), mantenerlo
        if (booking.meet_link && booking.meet_link.trim() !== '') {
            await dbRun(db, 'UPDATE bookings SET meet_status = \'ready\' WHERE id = ?', [bookingId]);
            return { status: 'ready', meetLink: booking.meet_link };
        }

        // Verificar si existe cuenta configurada para prestador-sala
        const account = await dbGet(db, `
            SELECT * FROM provider_room_google_accounts
            WHERE provider_id = ? AND room_id = ?
        `, [booking.providerId, booking.roomId]);

        if (!account) {
            // Sin cuenta configurada: link pendiente + alerta admin
            await dbRun(db, `
                UPDATE bookings
                SET meet_status = 'pending', meet_last_error = 'Cuenta Google no configurada para prestador-sala'
                WHERE id = ?
            `, [bookingId]);

            const alertExists = await dbGet(db, `
                SELECT id FROM admin_alerts
                WHERE booking_id = ? AND type = 'meet_missing_account' AND status = 'open'
            `, [bookingId]);

            if (!alertExists) {
                const alertId = crypto.randomUUID();
                const alertMsg = `La reserva ${booking.id} (${booking.serviceName}) quedó pagada y confirmada con link pendiente porque no hay cuenta de Google vinculada para el prestador ${booking.provider_name} en la sala ${booking.roomName}.`;
                await dbRun(db, `
                    INSERT INTO admin_alerts (id, type, booking_id, provider_id, room_id, message, status)
                    VALUES (?, 'meet_missing_account', ?, ?, ?, ?, 'open')
                `, [alertId, bookingId, booking.providerId, booking.roomId, alertMsg]);
            }

            return { status: 'pending', error: 'missing_account' };
        }

        // Intentar generación con Google Calendar API
        const accessToken = await ensureValidAccessToken(db, booking.providerId, booking.roomId);
        if (!accessToken) {
            throw new Error('No se pudo obtener un access_token válido de Google.');
        }

        const startDateTime = `${booking.date}T${booking.startTime}:00`;
        const endDateTime = `${booking.date}T${booking.endTime}:00`;
        const summary = `${booking.serviceName} - ${booking.clientName}`;
        const description = `Sesión de atención en línea Centro Integral PsicArte.\nProfesional: ${booking.provider_name}\nPaciente: ${booking.clientName}\nCódigo: ${booking.id}`;

        const meetLink = await createGoogleCalendarMeeting({
            accessToken,
            summary,
            description,
            startDateTime,
            endDateTime,
            requestId: `meet-${booking.id}-${attempt}`
        });

        // Éxito: guardar link y marcar como ready
        await dbRun(db, `
            UPDATE bookings
            SET meet_link = ?, meet_status = 'ready', meet_retries = ?, meet_last_error = NULL
            WHERE id = ?
        `, [meetLink, attempt - 1, bookingId]);

        // Resolver alertas abiertas de esta reserva
        await dbRun(db, `
            UPDATE admin_alerts
            SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
            WHERE booking_id = ? AND status = 'open'
        `, [bookingId]);

        return { status: 'ready', meetLink };

    } catch (err) {
        console.error(`[Google Meet] Intento ${attempt} fallido para reserva ${bookingId}:`, err.message);

        const retryDelays = [5000, 15000, 45000];

        if (attempt < 3) {
            const delay = retryDelays[attempt - 1] || 45000;
            await dbRun(db, `
                UPDATE bookings
                SET meet_status = 'pending', meet_retries = ?, meet_last_error = ?
                WHERE id = ?
            `, [attempt, err.message, bookingId]);

            setTimeout(() => {
                triggerMeetLinkGeneration(db, bookingId, attempt + 1).catch(console.error);
            }, delay);

            return { status: 'pending', error: err.message, retryScheduledInMs: delay };
        } else {
            // Agotó 3 reintentos: generar alerta administrativa
            await dbRun(db, `
                UPDATE bookings
                SET meet_status = 'pending', meet_retries = 3, meet_last_error = ?
                WHERE id = ?
            `, [err.message, bookingId]);

            const alertExists = await dbGet(db, `
                SELECT id FROM admin_alerts
                WHERE booking_id = ? AND type = 'meet_generation_failed' AND status = 'open'
            `, [bookingId]);

            if (!alertExists) {
                const alertId = crypto.randomUUID();
                const alertMsg = `Falló la generación automática del link de Google Meet para la reserva ${bookingId} tras 3 intentos. Detalle: ${err.message}`;
                await dbRun(db, `
                    INSERT INTO admin_alerts (id, type, booking_id, message, status)
                    VALUES (?, 'meet_generation_failed', ?, ?, 'open')
                `, [alertId, bookingId, alertMsg]);
            }

            return { status: 'pending', error: err.message, maxRetriesReached: true };
        }
    }
}

/**
 * Reintento manual de generación de Google Meet solicitado por admin o prestador.
 */
async function retryMeetLinkGeneration(db, bookingId) {
    return triggerMeetLinkGeneration(db, bookingId, 1);
}

/**
 * Permite al administrador o prestador actualizar manualmente el link de Google Meet.
 */
async function updateManualMeetLink(db, bookingId, newLink) {
    const trimmed = (newLink || '').trim();
    if (!trimmed) {
        throw new Error('El enlace de Google Meet no puede estar vacío.');
    }
    await dbRun(db, `
        UPDATE bookings
        SET meet_link = ?, meet_status = 'ready', meet_last_error = NULL
        WHERE id = ?
    `, [trimmed, bookingId]);

    await dbRun(db, `
        UPDATE admin_alerts
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
        WHERE booking_id = ? AND status = 'open'
    `, [bookingId]);

    return { success: true, meetLink: trimmed };
}

module.exports = {
    getGoogleOAuthUrl,
    handleGoogleOAuthCallback,
    refreshAccessToken,
    ensureValidAccessToken,
    createGoogleCalendarMeeting,
    triggerMeetLinkGeneration,
    retryMeetLinkGeneration,
    updateManualMeetLink
};
