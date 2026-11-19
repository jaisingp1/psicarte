// server/availability-engine.js
// Motor de Disponibilidad en Rejilla de 5 Minutos para Centro Integral PsicArte

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getDayOfWeek(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay();
    return day === 0 ? 7 : day; // ISO: 1=Lunes ... 7=Domingo
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

/**
 * Obtiene las franjas efectivas de atención para una fecha específica,
 * resolviendo feriados nacionales y excepciones de sala (close_day, delete_shift, modify_shift, add_shift).
 */
async function getEffectiveRoomShiftsForDate(db, dateStr) {
    const dayOfWeek = getDayOfWeek(dateStr);

    const holiday = await dbGet(db, 'SELECT * FROM holidays WHERE date = ?', [dateStr]);
    const isHoliday = !!holiday;

    const baseShifts = await dbAll(db, `
        SELECT s.*, r.name as room_name, r.type as room_type, r.capacity as room_capacity,
               r.meet_enabled as room_meet_enabled, r.allow_all_services as room_allow_all_services,
               r.min_advance_min as room_min_advance_min, r.max_advance_days as room_max_advance_days,
               u.name as provider_name
        FROM room_shifts s
        JOIN rooms r ON s.room_id = r.id
        JOIN users u ON s.provider_id = u.id
        WHERE s.day_of_week = ?
        ORDER BY s.room_id, s.start_time
    `, [dayOfWeek]);

    const shiftBreaks = await dbAll(db, `
        SELECT b.*
        FROM room_shift_breaks b
        JOIN room_shifts s ON b.shift_id = s.id
        WHERE s.day_of_week = ?
        ORDER BY b.start_time
    `, [dayOfWeek]);

    const breaksByShift = {};
    for (const brk of shiftBreaks) {
        if (!breaksByShift[brk.shift_id]) breaksByShift[brk.shift_id] = [];
        breaksByShift[brk.shift_id].push({
            startTime: brk.start_time,
            endTime: brk.end_time,
            startMins: timeToMinutes(brk.start_time),
            endMins: timeToMinutes(brk.end_time)
        });
    }

    const allRooms = await dbAll(db, 'SELECT * FROM rooms');
    const roomsMap = {};
    for (const r of allRooms) {
        roomsMap[r.id] = r;
    }

    const exceptions = await dbAll(db, `
        SELECT e.*, u.name as provider_name
        FROM room_exceptions e
        LEFT JOIN users u ON e.provider_id = u.id
        WHERE e.date = ?
    `, [dateStr]);

    const exceptionBreaks = await dbAll(db, `
        SELECT b.*
        FROM room_exception_breaks b
        JOIN room_exceptions e ON b.exception_id = e.id
        WHERE e.date = ?
        ORDER BY b.start_time
    `, [dateStr]);

    const breaksByException = {};
    for (const brk of exceptionBreaks) {
        if (!breaksByException[brk.exception_id]) breaksByException[brk.exception_id] = [];
        breaksByException[brk.exception_id].push({
            startTime: brk.start_time,
            endTime: brk.end_time,
            startMins: timeToMinutes(brk.start_time),
            endMins: timeToMinutes(brk.end_time)
        });
    }

    const exceptionsByRoom = {};
    for (const ex of exceptions) {
        if (!exceptionsByRoom[ex.room_id]) exceptionsByRoom[ex.room_id] = [];
        exceptionsByRoom[ex.room_id].push(ex);
    }

    const effectiveShifts = [];

    for (const room of allRooms) {
        const roomExceptions = exceptionsByRoom[room.id] || [];
        const hasCloseDay = roomExceptions.some(e => e.type === 'close_day');

        if (hasCloseDay) {
            continue;
        }

        let shiftsForRoom;

        if (isHoliday) {
            // En feriados la sala está cerrada por defecto a menos que tenga excepciones de apertura (add_shift)
            shiftsForRoom = [];
        } else {
            shiftsForRoom = baseShifts
                .filter(s => s.room_id === room.id)
                .map(s => ({
                    id: s.id,
                    roomId: s.room_id,
                    roomName: s.room_name,
                    roomType: s.room_type,
                    roomCapacity: s.room_capacity,
                    roomMeetEnabled: s.room_meet_enabled,
                    roomAllowAllServices: s.room_allow_all_services,
                    roomMinAdvanceMin: s.room_min_advance_min,
                    roomMaxAdvanceDays: s.room_max_advance_days,
                    dayOfWeek: s.day_of_week,
                    startTime: s.start_time,
                    endTime: s.end_time,
                    startMins: timeToMinutes(s.start_time),
                    endMins: timeToMinutes(s.end_time),
                    providerId: s.provider_id,
                    providerName: s.provider_name,
                    breaks: breaksByShift[s.id] || []
                }));
        }

        // Aplicar delete_shift
        for (const ex of roomExceptions.filter(e => e.type === 'delete_shift')) {
            shiftsForRoom = shiftsForRoom.filter(s => s.id !== ex.target_shift_id);
        }

        // Aplicar modify_shift
        for (const ex of roomExceptions.filter(e => e.type === 'modify_shift')) {
            const idx = shiftsForRoom.findIndex(s => s.id === ex.target_shift_id);
            if (idx !== -1) {
                const provId = ex.provider_id || shiftsForRoom[idx].providerId;
                const provName = ex.provider_name || shiftsForRoom[idx].providerName;
                shiftsForRoom[idx] = {
                    ...shiftsForRoom[idx],
                    startTime: ex.start_time,
                    endTime: ex.end_time,
                    startMins: timeToMinutes(ex.start_time),
                    endMins: timeToMinutes(ex.end_time),
                    providerId: provId,
                    providerName: provName,
                    breaks: breaksByException[ex.id] || []
                };
            }
        }

        // Aplicar add_shift
        for (const ex of roomExceptions.filter(e => e.type === 'add_shift')) {
            shiftsForRoom.push({
                id: ex.id,
                roomId: room.id,
                roomName: room.name,
                roomType: room.type,
                roomCapacity: room.capacity,
                roomMeetEnabled: room.meet_enabled,
                roomAllowAllServices: room.allow_all_services,
                roomMinAdvanceMin: room.min_advance_min,
                roomMaxAdvanceDays: room.max_advance_days,
                dayOfWeek,
                startTime: ex.start_time,
                endTime: ex.end_time,
                startMins: timeToMinutes(ex.start_time),
                endMins: timeToMinutes(ex.end_time),
                providerId: ex.provider_id,
                providerName: ex.provider_name,
                breaks: breaksByException[ex.id] || []
            });
        }

        effectiveShifts.push(...shiftsForRoom);
    }

    return effectiveShifts;
}

/**
 * Une franjas contiguas de un mismo prestador en una misma sala.
 * Permite que citas largas crucen franjas contiguas sin superar apertura ni cierre.
 */
function buildContiguousWindows(shifts) {
    const grouped = {};
    for (const shift of shifts) {
        const key = `${shift.roomId}__${shift.providerId}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(shift);
    }

    const windows = [];

    for (const key of Object.keys(grouped)) {
        const list = grouped[key].sort((a, b) => a.startMins - b.startMins);
        let currentWindow = null;

        for (const shift of list) {
            if (!currentWindow) {
                currentWindow = {
                    roomId: shift.roomId,
                    roomName: shift.roomName,
                    roomType: shift.roomType,
                    roomCapacity: shift.roomCapacity,
                    roomMeetEnabled: shift.roomMeetEnabled,
                    roomAllowAllServices: shift.roomAllowAllServices,
                    roomMinAdvanceMin: shift.roomMinAdvanceMin,
                    roomMaxAdvanceDays: shift.roomMaxAdvanceDays,
                    providerId: shift.providerId,
                    providerName: shift.providerName,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    startMins: shift.startMins,
                    endMins: shift.endMins,
                    breaks: [...shift.breaks]
                };
            } else if (currentWindow.endMins === shift.startMins) {
                // Fusión contigua
                currentWindow.endMins = shift.endMins;
                currentWindow.endTime = shift.endTime;
                currentWindow.breaks.push(...shift.breaks);
            } else {
                windows.push(currentWindow);
                currentWindow = {
                    roomId: shift.roomId,
                    roomName: shift.roomName,
                    roomType: shift.roomType,
                    roomCapacity: shift.roomCapacity,
                    roomMeetEnabled: shift.roomMeetEnabled,
                    roomAllowAllServices: shift.roomAllowAllServices,
                    roomMinAdvanceMin: shift.roomMinAdvanceMin,
                    roomMaxAdvanceDays: shift.roomMaxAdvanceDays,
                    providerId: shift.providerId,
                    providerName: shift.providerName,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    startMins: shift.startMins,
                    endMins: shift.endMins,
                    breaks: [...shift.breaks]
                };
            }
        }
        if (currentWindow) windows.push(currentWindow);
    }

    return windows;
}

/**
 * Valida la regla de descanso para un spot propuesto [spotStartMins, spotEndMins]:
 * - No puede empezar dentro del descanso.
 * - Si empieza antes del descanso, puede terminar como máximo 10 minutos después del inicio del descanso.
 * - No puede sobrepasar el fin del descanso.
 */
function checkBreakRule(spotStartMins, spotEndMins, breaks) {
    for (const b of breaks) {
        if (spotStartMins < b.endMins && spotEndMins > b.startMins) {
            // Hay solapamiento con el descanso
            if (spotStartMins >= b.startMins) {
                return false; // Prohibido empezar dentro del descanso
            }
            if (spotEndMins > b.startMins + 10) {
                return false; // No puede terminar más de 10 minutos después del inicio
            }
            if (spotEndMins > b.endMins) {
                return false; // No puede extenderse más allá del descanso
            }
        }
    }
    return true;
}

/**
 * Verifica si el prestador está de vacaciones en la fecha y rango horario.
 */
function isProviderOnVacation(vacations, dateStr, spotStartMins, spotEndMins) {
    for (const v of vacations) {
        if (dateStr >= v.start_date && dateStr <= v.end_date) {
            const vStartMins = v.start_time ? timeToMinutes(v.start_time) : 0;
            const vEndMins = v.end_time ? timeToMinutes(v.end_time) : 1439;

            const effectiveStart = (dateStr === v.start_date) ? vStartMins : 0;
            const effectiveEnd = (dateStr === v.end_date) ? vEndMins : 1439;

            if (spotStartMins < effectiveEnd && spotEndMins > effectiveStart) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Valida límites de antelación mínima y máxima.
 */
function checkAdvanceLimits(dateStr, spotStartMins, minAdvanceMin, maxAdvanceDays, now = new Date()) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const spotHours = Math.floor(spotStartMins / 60);
    const spotMinutes = spotStartMins % 60;
    const appointmentDate = new Date(y, m - 1, d, spotHours, spotMinutes, 0, 0);

    const nowMs = now.getTime();
    const appMs = appointmentDate.getTime();

    const minAdvanceMs = (minAdvanceMin || 0) * 60 * 1000;
    const maxAdvanceMs = (maxAdvanceDays || 60) * 24 * 60 * 60 * 1000;

    if (appMs < nowMs + minAdvanceMs) return false;
    if (appMs > nowMs + maxAdvanceMs) return false;
    return true;
}

/**
 * Calcula la fragmentación (número de huecos libres > 0 min) y el tiempo ocioso acumulado
 * en las ventanas operativas del prestador para ese día al simular la nueva cita.
 */
function calculateProviderMetricsForDay(providerWindows, existingBookings, candidateSpot, durationMins) {
    const allOccupied = [
        ...existingBookings.map(b => ({
            startMins: timeToMinutes(b.startTime),
            endMins: timeToMinutes(b.endTime)
        })),
        {
            startMins: candidateSpot.spotStartMins,
            endMins: candidateSpot.spotEndMins
        }
    ].sort((a, b) => a.startMins - b.startMins);

    let freeGapsCount = 0;
    let idleMinutes = 0;

    for (const win of providerWindows) {
        // Filtrar citas que caen dentro de esta ventana operativa
        const inWindow = allOccupied.filter(
            o => o.startMins >= win.startMins && o.endMins <= win.endMins
        );

        let cursor = win.startMins;

        for (const occ of inWindow) {
            if (occ.startMins > cursor) {
                const gapLength = occ.startMins - cursor;
                if (gapLength > 0) {
                    freeGapsCount++;
                    // Ocioso si está entre citas o si es menor que la duración del servicio (tiempo muerto)
                    const isBetweenAppointments = (cursor > win.startMins);
                    if (isBetweenAppointments || gapLength < durationMins) {
                        idleMinutes += gapLength;
                    }
                }
            }
            cursor = Math.max(cursor, occ.endMins);
        }

        if (win.endMins > cursor) {
            const gapLength = win.endMins - cursor;
            if (gapLength > 0) {
                freeGapsCount++;
                if (gapLength < durationMins) {
                    idleMinutes += gapLength;
                }
            }
        }
    }

    return {
        fragmentation: freeGapsCount,
        idleTime: idleMinutes
    };
}

/**
 * Obtiene todos los spots factibles en rejilla de 5 minutos para una fecha dada.
 */
async function getAvailableSpots(db, { serviceId, providerId = null, date, now = new Date() }) {
    if (!serviceId || !date) {
        throw new Error('serviceId y date son obligatorios');
    }

    const service = await dbGet(db, 'SELECT * FROM services WHERE id = ?', [serviceId]);
    if (!service) {
        throw new Error('Servicio no encontrado');
    }

    // Prestadores que ofrecen este servicio
    let provQuery = 'SELECT ps.*, u.name as provider_name FROM provider_services ps JOIN users u ON ps.provider_id = u.id WHERE ps.service_id = ?';
    const provParams = [serviceId];
    if (providerId) {
        provQuery += ' AND ps.provider_id = ?';
        provParams.push(providerId);
    }
    const providerServices = await dbAll(db, provQuery, provParams);
    if (providerServices.length === 0) {
        return [];
    }

    const effectiveShifts = await getEffectiveRoomShiftsForDate(db, date);
    if (effectiveShifts.length === 0) {
        return [];
    }

    // Salas permitidas por servicio
    const roomRestrictions = await dbAll(db, 'SELECT * FROM room_services WHERE service_id = ?', [serviceId]);
    const restrictedRoomIds = roomRestrictions.map(r => r.room_id);

    // Vacaciones activas para esa fecha
    const providerIds = providerServices.map(p => p.provider_id);
    const placeholders = providerIds.map(() => '?').join(',');
    const vacations = await dbAll(db, `
        SELECT * FROM provider_vacations
        WHERE provider_id IN (${placeholders})
          AND start_date <= ? AND end_date >= ?
    `, [...providerIds, date, date]);

    // Citas activas para esa fecha: Paid o Pending_Payment < 30 minutos
    const activeBookings = await dbAll(db, `
        SELECT id, roomId, providerId, startTime, endTime
        FROM bookings
        WHERE date = ?
          AND (
            status = 'Paid'
            OR (status = 'Pending_Payment' AND created_at > datetime('now', '-30 minutes'))
          )
    `, [date]);

    // Generar ventanas contiguas por sala y prestador
    const windows = buildContiguousWindows(effectiveShifts);

    const candidateSpots = [];

    for (const ps of providerServices) {
        const provId = ps.provider_id;
        const durationMins = ps.duration;
        const price = ps.price;

        // Ventanas del prestador
        const provWindows = windows.filter(w => w.providerId === provId);
        const provBookings = activeBookings.filter(b => b.providerId === provId);
        const provVacations = vacations.filter(v => v.provider_id === provId);

        for (const win of provWindows) {
            // Verificar si la sala permite el servicio
            if (win.roomAllowAllServices === 0 && !restrictedRoomIds.includes(win.roomId)) {
                continue;
            }

            const effectiveMinAdvance = Math.max(win.roomMinAdvanceMin || 0, service.min_advance_min || 0);
            const effectiveMaxAdvance = Math.min(win.roomMaxAdvanceDays || 60, service.max_advance_days || 60);

            // Rejilla de 5 minutos desde startMins hasta endMins - durationMins
            for (let m = win.startMins; m + durationMins <= win.endMins; m += 5) {
                const spotStartMins = m;
                const spotEndMins = m + durationMins;

                // 1. Antelación
                if (!checkAdvanceLimits(date, spotStartMins, effectiveMinAdvance, effectiveMaxAdvance, now)) {
                    continue;
                }

                // 2. Regla de descansos
                if (!checkBreakRule(spotStartMins, spotEndMins, win.breaks)) {
                    continue;
                }

                // 3. Vacaciones
                if (isProviderOnVacation(provVacations, date, spotStartMins, spotEndMins)) {
                    continue;
                }

                // 4. No solapamiento con citas del mismo prestador
                const provCollision = provBookings.some(
                    b => spotStartMins < timeToMinutes(b.endTime) && spotEndMins > timeToMinutes(b.startTime)
                );
                if (provCollision) continue;

                // 5. No solapamiento en la misma sala (si es sala física, cupo efectivo 1)
                const isPhysicalRoom = win.roomType === 'Física';
                if (isPhysicalRoom) {
                    const roomCollision = activeBookings.some(
                        b => b.roomId === win.roomId &&
                             spotStartMins < timeToMinutes(b.endTime) &&
                             spotEndMins > timeToMinutes(b.startTime)
                    );
                    if (roomCollision) continue;
                }

                // Spot factible
                const spotCandidate = {
                    roomId: win.roomId,
                    roomName: win.roomName,
                    roomType: win.roomType,
                    roomMeetEnabled: win.roomMeetEnabled,
                    providerId: provId,
                    providerName: ps.provider_name,
                    serviceId: service.id,
                    serviceName: service.name,
                    date,
                    startTime: minutesToTime(spotStartMins),
                    endTime: minutesToTime(spotEndMins),
                    timeSlot: `${minutesToTime(spotStartMins)} - ${minutesToTime(spotEndMins)}`,
                    duration: durationMins,
                    price,
                    spotStartMins,
                    spotEndMins
                };

                // Calcular fragmentación y tiempo ocioso del prestador en el día
                const metrics = calculateProviderMetricsForDay(provWindows, provBookings, spotCandidate, durationMins);
                spotCandidate.fragmentation = metrics.fragmentation;
                spotCandidate.idleTime = metrics.idleTime;

                candidateSpots.push(spotCandidate);
            }
        }
    }

    // Ordenamiento: 1. hora más temprana (spots más tempranos primero para el cliente),
    // 2. menor fragmentación del prestador (desempate entre opciones a la misma hora), 3. menor tiempo ocioso
    candidateSpots.sort((a, b) => {
        if (a.spotStartMins !== b.spotStartMins) {
            return a.spotStartMins - b.spotStartMins;
        }
        if (a.fragmentation !== b.fragmentation) {
            return a.fragmentation - b.fragmentation;
        }
        return a.idleTime - b.idleTime;
    });

    return candidateSpots;
}

/**
 * Consulta la disponibilidad de días en un mes específico para pintar el calendario.
 */
async function getMonthlyAvailability(db, { serviceId, providerId = null, year, month, now = new Date() }) {
    if (!serviceId || !year || !month) {
        throw new Error('serviceId, year y month son requeridos');
    }

    const numDays = new Date(year, month, 0).getDate();
    const availableDates = [];

    for (let day = 1; day <= numDays; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const spots = await getAvailableSpots(db, {
            serviceId,
            providerId,
            date: dateStr,
            now
        });
        if (spots.length > 0) {
            availableDates.push(dateStr);
        }
    }

    return availableDates;
}

/**
 * Revalida estrictamente un slot de reserva (creación, confirmación, reprogramación o mover cita).
 */
async function validateBookingSlot(db, {
    roomId,
    providerId,
    serviceId,
    date,
    startTime,
    excludeBookingId = null,
    now = new Date()
}) {
    if (!roomId || !providerId || !serviceId || !date || !startTime) {
        return { valid: false, error: 'Parámetros incompletos para validar la reserva.' };
    }

    const service = await dbGet(db, 'SELECT * FROM services WHERE id = ?', [serviceId]);
    if (!service) {
        return { valid: false, error: 'Servicio no encontrado.' };
    }

    const room = await dbGet(db, 'SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!room) {
        return { valid: false, error: 'Sala no encontrada.' };
    }

    const provider = await dbGet(db, 'SELECT * FROM users WHERE id = ? AND role = \'prestador\'', [providerId]);
    if (!provider) {
        return { valid: false, error: 'Prestador no encontrado.' };
    }

    const provService = await dbGet(db, `
        SELECT * FROM provider_services WHERE provider_id = ? AND service_id = ?
    `, [providerId, serviceId]);
    if (!provService) {
        return { valid: false, error: 'El prestador seleccionado no ofrece este servicio.' };
    }

    const durationMins = provService.duration;
    const price = provService.price;
    const spotStartMins = timeToMinutes(startTime);
    const spotEndMins = spotStartMins + durationMins;
    const endTime = minutesToTime(spotEndMins);
    const timeSlot = `${startTime} - ${endTime}`;

    // Verificación de sala por servicio
    if (room.allow_all_services === 0) {
        const allowed = await dbGet(db, 'SELECT 1 FROM room_services WHERE room_id = ? AND service_id = ?', [roomId, serviceId]);
        if (!allowed) {
            return { valid: false, error: 'Esta sala no permite el servicio seleccionado.' };
        }
    }

    // Antelación
    const effectiveMinAdvance = Math.max(room.min_advance_min || 0, service.min_advance_min || 0);
    const effectiveMaxAdvance = Math.min(room.max_advance_days || 60, service.max_advance_days || 60);
    if (!checkAdvanceLimits(date, spotStartMins, effectiveMinAdvance, effectiveMaxAdvance, now)) {
        return { valid: false, error: 'La hora seleccionada no cumple con la antelación mínima o máxima permitida.' };
    }

    // Franjas efectivas
    const effectiveShifts = await getEffectiveRoomShiftsForDate(db, date);
    const roomProvShifts = effectiveShifts.filter(s => s.roomId === roomId && s.providerId === providerId);
    if (roomProvShifts.length === 0) {
        return { valid: false, error: 'El prestador no tiene franjas asignadas en esta sala para la fecha indicada.' };
    }

    // Ventanas contiguas
    const windows = buildContiguousWindows(roomProvShifts);
    const matchingWindow = windows.find(w => spotStartMins >= w.startMins && spotEndMins <= w.endMins);
    if (!matchingWindow) {
        return { valid: false, error: 'La cita no cabe completa dentro del horario de atención de la sala o franjas contiguas.' };
    }

    // Regla de descansos
    if (!checkBreakRule(spotStartMins, spotEndMins, matchingWindow.breaks)) {
        return { valid: false, error: 'El horario seleccionado interfiere con el descanso programado de la sala.' };
    }

    // Vacaciones del prestador
    const vacations = await dbAll(db, `
        SELECT * FROM provider_vacations
        WHERE provider_id = ? AND start_date <= ? AND end_date >= ?
    `, [providerId, date, date]);
    if (isProviderOnVacation(vacations, date, spotStartMins, spotEndMins)) {
        return { valid: false, error: 'El prestador se encuentra de vacaciones o con bloqueo en el horario seleccionado.' };
    }

    // No solapamiento con citas activas
    let activeBookingsSql = `
        SELECT id, roomId, providerId, startTime, endTime
        FROM bookings
        WHERE date = ?
          AND (
            status = 'Paid'
            OR (status = 'Pending_Payment' AND created_at > datetime('now', '-30 minutes'))
          )
    `;
    const params = [date];
    if (excludeBookingId) {
        activeBookingsSql += ' AND id != ?';
        params.push(excludeBookingId);
    }
    const activeBookings = await dbAll(db, activeBookingsSql, params);

    // Mismo prestador
    const provCollision = activeBookings.some(
        b => b.providerId === providerId &&
             spotStartMins < timeToMinutes(b.endTime) &&
             spotEndMins > timeToMinutes(b.startTime)
    );
    if (provCollision) {
        return { valid: false, error: 'El prestador ya tiene otra cita agendada en ese horario.' };
    }

    // Misma sala física
    if (room.type === 'Física') {
        const roomCollision = activeBookings.some(
            b => b.roomId === roomId &&
                 spotStartMins < timeToMinutes(b.endTime) &&
                 spotEndMins > timeToMinutes(b.startTime)
        );
        if (roomCollision) {
            return { valid: false, error: 'La sala física ya está ocupada en ese horario (cupo efectivo 1).' };
        }
    }

    return {
        valid: true,
        service,
        provider,
        room,
        duration: durationMins,
        price,
        startTime,
        endTime,
        timeSlot
    };
}

module.exports = {
    timeToMinutes,
    minutesToTime,
    getDayOfWeek,
    getEffectiveRoomShiftsForDate,
    buildContiguousWindows,
    checkBreakRule,
    isProviderOnVacation,
    checkAdvanceLimits,
    calculateProviderMetricsForDay,
    getAvailableSpots,
    getMonthlyAvailability,
    validateBookingSlot
};
