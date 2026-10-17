// spot-generator.js
// Core engine for generating spots from agendas with full validation logic
const { rrulestr } = require('rrule');

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ISO day of week: 1=Monday ... 7=Sunday
function jsDayToISO(jsDay) {
    return jsDay === 0 ? 7 : jsDay;
}

class SpotGenerator {
    constructor(db) {
        this.db = db;
    }

    generate(agenda, callback) {
        const agendaId = agenda.id;
        const serviceId = agenda.service_id;
        const providerId = agenda.provider_id;
        const roomId = agenda.room_id;

        // Step 0: Delete existing spots for this agenda FIRST (before conflict check)
        this.db.run('DELETE FROM spots WHERE agenda_id = ?', [agendaId], (errDel) => {
            if (errDel) return callback({ spotsGenerated: 0, conflicts: 0, errors: [errDel.message] });

            // Step 1: Get service duration
            this.db.get('SELECT duration FROM services WHERE id = ?', [serviceId], (err, service) => {
            if (err || !service) {
                return callback({ spotsGenerated: 0, conflicts: 0, errors: ['Servicio no encontrado'] });
            }

            const durationMin = service.duration;

            // Step 2: Get room schedules
            this.db.all('SELECT * FROM room_schedules WHERE room_id = ? ORDER BY day_of_week, start_time', [roomId], (err2, schedules) => {
                if (err2) return callback({ spotsGenerated: 0, conflicts: 0, errors: [err2.message] });

                if (!schedules || schedules.length === 0) {
                    return callback({ spotsGenerated: 0, conflicts: 0, errors: ['La sala no tiene horarios configurados'] });
                }

                // Build schedule map: day_of_week -> [{start_time, end_time}]
                const scheduleMap = {};
                for (const s of schedules) {
                    if (!scheduleMap[s.day_of_week]) scheduleMap[s.day_of_week] = [];
                    scheduleMap[s.day_of_week].push({ start: timeToMinutes(s.start_time), end: timeToMinutes(s.end_time) });
                }

                // Step 3: Determine dates from agenda
                const dates = this._resolveDates(agenda);

                if (dates.length === 0) {
                    return callback({ spotsGenerated: 0, conflicts: 0, errors: ['No se encontraron fechas para la agenda'] });
                }

                // Step 4: For each date, get time ranges and generate spots
                this._generateForDates(agenda, durationMin, scheduleMap, dates, callback);
            });
        });
        }); // closes db.run DELETE
    }

    _resolveDates(agenda) {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (agenda.type === 'punctual') {
            const d = new Date(agenda.specific_date + 'T00:00:00');
            if (d >= today) dates.push(d);
            return dates;
        }

        // Recurrent: use rrule
        try {
            const rule = JSON.parse(agenda.recurrence_rule);
            const byweekday = rule.byweekday || [];
            const dtstart = new Date(rule.dtstart + 'T00:00:00');
            // Horizonte máximo de 3 meses para generación de spots recurrentes
            const MAX_HORIZON_MONTHS = 3;
            const horizonEnd = new Date(today);
            horizonEnd.setMonth(horizonEnd.getMonth() + MAX_HORIZON_MONTHS);

            // Usar end_date de la agenda, o el horizonte máximo (lo que sea antes)
            let effectiveUntil = agenda.end_date ? new Date(agenda.end_date + 'T00:00:00') : horizonEnd;
            if (effectiveUntil > horizonEnd) effectiveUntil = horizonEnd;

            // Build rrule string
            const freqMap = { 'DAILY': 'DAILY', 'WEEKLY': 'WEEKLY', 'MONTHLY': 'MONTHLY' };
            const freq = freqMap[(rule.freq || 'WEEKLY').toUpperCase()] || 'WEEKLY';
            const interval = rule.interval || 1;

            // Convert ISO day numbers to rrule day constants
            const dayMap = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA', 7: 'SU' };
            const bydayStr = byweekday.map(d => dayMap[d] || dayMap[Number(d)]).filter(Boolean);

            let rruleStr = `FREQ=${freq};INTERVAL=${interval}`;
            if (bydayStr.length > 0) {
                rruleStr += `;BYDAY=${bydayStr.join(',')}`;
            }
            rruleStr += `;DTSTART=${rule.dtstart.replace(/-/g, '')}T000000`;

            // Siempre incluir UNTIL para evitar generación infinita
            const untilStr = effectiveUntil.getFullYear() +
                String(effectiveUntil.getMonth() + 1).padStart(2, '0') +
                String(effectiveUntil.getDate()).padStart(2, '0') + 'T235959';
            rruleStr += `;UNTIL=${untilStr}`;

            const parsed = rrulestr(rruleStr);
            const generated = parsed.all();

            for (const d of generated) {
                if (d >= today) {
                    dates.push(d);
                }
            }
        } catch (e) {
            console.error('Error parsing recurrence rule:', e.message);
        }

        return dates;
    }

    _generateForDates(agenda, durationMin, scheduleMap, dates, callback) {
        const agendaId = agenda.id;
        const providerId = agenda.provider_id;
        const serviceId = agenda.service_id;
        const roomId = agenda.room_id;
        const allSpots = [];
        let conflicts = 0;
        let processed = 0;
        const totalDates = dates.length;

        if (totalDates === 0) {
            return callback({ spotsGenerated: 0, conflicts: 0, errors: [] });
        }

        // Collect all dates upfront, then batch query holidays and conflicts
        const dateStrs = dates.map(d => formatDateStr(d));

        // Query holidays for all dates at once
        const holidayPlaceholders = dateStrs.map(() => '?').join(',');
        this.db.all(
            `SELECT date FROM holidays WHERE date IN (${holidayPlaceholders})`,
            dateStrs, (errHol, holidays) => {
                if (errHol) {
                    return callback({ spotsGenerated: 0, conflicts: 0, errors: [errHol.message] });
                }

                const holidaySet = new Set((holidays || []).map(h => h.date));

                // Query existing spots for the same provider (excluding this agenda) across ALL dates
                this.db.all(
                    `SELECT date, start_time, end_time FROM spots WHERE provider_id = ? AND agenda_id != ? AND status IN ('available', 'reserved', 'booked')`,
                    [providerId, agendaId], (errProv, providerSpots) => {
                        if (errProv) {
                            return callback({ spotsGenerated: 0, conflicts: 0, errors: [errProv.message] });
                        }

                        // Build conflict map: date -> [{start_min, end_min}]
                        const providerConflictMap = {};
                        for (const ps of (providerSpots || [])) {
                            if (!providerConflictMap[ps.date]) providerConflictMap[ps.date] = [];
                            providerConflictMap[ps.date].push({
                                start: timeToMinutes(ps.start_time),
                                end: timeToMinutes(ps.end_time)
                            });
                        }

                        // Query existing bookings (Paid or Pending_Payment) for the same room across ALL dates
                        this.db.all(
                            `SELECT date, startTime, endTime FROM bookings WHERE roomId = ? AND status IN ('Paid', 'Pending_Payment')`,
                            [roomId], (errBook, bookings) => {
                                if (errBook) {
                                    return callback({ spotsGenerated: 0, conflicts: 0, errors: [errBook.message] });
                                }

                                // Build booking conflict map: date -> [{start_min, end_min}]
                                const bookingConflictMap = {};
                                for (const b of (bookings || [])) {
                                    if (!bookingConflictMap[b.date]) bookingConflictMap[b.date] = [];
                                    bookingConflictMap[b.date].push({
                                        start: timeToMinutes(b.startTime),
                                        end: timeToMinutes(b.endTime)
                                    });
                                }

                                // Now generate spots for each date
                                for (const date of dates) {
                                    const dateStr = formatDateStr(date);
                                    const isoDay = jsDayToISO(date.getDay());

                                    // Skip holidays
                                    if (holidaySet.has(dateStr)) {
                                        processed++;
                                        if (processed === totalDates) this._saveSpots(agendaId, allSpots, conflicts, callback);
                                        continue;
                                    }

                                    // Get room schedules for this day
                                    const daySchedules = scheduleMap[isoDay];
                                    if (!daySchedules || daySchedules.length === 0) {
                                        processed++;
                                        if (processed === totalDates) this._saveSpots(agendaId, allSpots, conflicts, callback);
                                        continue;
                                    }

                                    // Get agenda time ranges for this day
                                    const agendaTimeRanges = this._getAgendaTimeRanges(agenda, isoDay);

                                    // Get conflicts for this date
                                    const provConflicts = providerConflictMap[dateStr] || [];
                                    const bookConflicts = bookingConflictMap[dateStr] || [];

                                    // Generate spots for each schedule block
                                    for (const block of daySchedules) {
                                        for (const agendaRange of agendaTimeRanges) {
                                            // Intersect agenda range with room schedule block
                                            const rangeStart = Math.max(agendaRange.start, block.start);
                                            const rangeEnd = Math.min(agendaRange.end, block.end);

                                            if (rangeStart >= rangeEnd) continue;

                                            // Generate individual spots within this range
                                            let current = rangeStart;
                                            while (current + durationMin <= rangeEnd) {
                                                const spotStart = current;
                                                const spotEnd = current + durationMin;

                                                // Check provider conflict (same prestador, any room)
                                                const hasProviderConflict = provConflicts.some(c =>
                                                    spotStart < c.end && spotEnd > c.start
                                                );

                                                // Check room booking conflict (any prestador, same room)
                                                const hasBookingConflict = bookConflicts.some(c =>
                                                    spotStart < c.end && spotEnd > c.start
                                                );

                                                if (hasProviderConflict || hasBookingConflict) {
                                                    conflicts++;
                                                } else {
                                                    allSpots.push({
                                                        id: 'spot-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                                                        agenda_id: agendaId,
                                                        provider_id: providerId,
                                                        service_id: serviceId,
                                                        room_id: roomId,
                                                        date: dateStr,
                                                        start_time: minutesToTime(spotStart),
                                                        end_time: minutesToTime(spotEnd),
                                                        status: 'available'
                                                    });
                                                }

                                                current = spotEnd;
                                            }
                                        }
                                    }

                                    processed++;
                                    if (processed === totalDates) {
                                        this._saveSpots(agendaId, allSpots, conflicts, callback);
                                    }
                                }
                            }
                        );
                    }
                );
            }
        );
    }

    _getAgendaTimeRanges(agenda, isoDay) {
        if (agenda.type === 'punctual') {
            return [{
                start: timeToMinutes(agenda.start_time),
                end: timeToMinutes(agenda.end_time)
            }];
        }

        // Recurrent: parse recurrence_rule for time_ranges
        try {
            const rule = JSON.parse(agenda.recurrence_rule);
            const timeRanges = rule.time_ranges || {};
            const dayRange = timeRanges[String(isoDay)];

            if (dayRange) {
                return [{
                    start: timeToMinutes(dayRange.start),
                    end: timeToMinutes(dayRange.end)
                }];
            }

            // Fallback: use agenda start_time/end_time
            return [{
                start: timeToMinutes(agenda.start_time),
                end: timeToMinutes(agenda.end_time)
            }];
        } catch (e) {
            return [{
                start: timeToMinutes(agenda.start_time),
                end: timeToMinutes(agenda.end_time)
            }];
        }
    }

    _saveSpots(agendaId, spots, conflicts, callback) {
        if (spots.length === 0) {
            return callback({ spotsGenerated: 0, conflicts, errors: [] });
        }

        const stmt = this.db.prepare(
            'INSERT INTO spots (id, agenda_id, provider_id, service_id, room_id, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        for (const spot of spots) {
            stmt.run(spot.id, spot.agenda_id, spot.provider_id, spot.service_id, spot.room_id, spot.date, spot.start_time, spot.end_time, spot.status);
        }

        stmt.finalize((err2) => {
            if (err2) {
                return callback({ spotsGenerated: 0, conflicts: 0, errors: [err2.message] });
            }
            callback({ spotsGenerated: spots.length, conflicts, errors: [] });
        });
    }
}

module.exports = { SpotGenerator, timeToMinutes, minutesToTime, formatDateStr, jsDayToISO };
// Default export for require('./spot-generator')
module.exports.SpotGenerator = SpotGenerator;
module.exports.default = SpotGenerator;
