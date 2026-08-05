const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');

// Check if database reset is requested via CLI argument or environment variable
if (process.argv.includes('--reset') || process.env.RESET_DB === 'true') {
    try {
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log("Database reset requested. Deleted existing database.sqlite file.");
        }
    } catch (e) {
        console.error("Error deleting database file during reset:", e.message);
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

// Helper functions for spot generation
function timeToMinutes(time) {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function generateSpots(durationMin, rangeStart, rangeEnd, existingBookings) {
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

function generateSpotsForDate(serviceId, providerId, roomId, duration, date, rangeStart, rangeEnd) {
    db.all("SELECT * FROM bookings WHERE roomId = ? AND date = ? AND status = 'Paid'", [roomId, date], (err, bookings) => {
        if (err) {
            console.error('Error getting bookings for spot generation:', err.message);
            return;
        }
        
        const spots = generateSpots(duration, rangeStart, rangeEnd, bookings || []);
        console.log(`  Generated ${spots.length} spots for ${date}`);
        
        db.run("DELETE FROM service_schedules WHERE serviceId = ? AND roomId = ? AND date = ?", [serviceId, roomId, date], (err2) => {
            if (err2) console.error('Error cleaning spots:', err2.message);
            
            const stmt = db.prepare("INSERT INTO service_schedules (id, serviceId, roomId, providerId, date, startTime, endTime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            spots.forEach(spot => {
                const spotId = 'spot-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                stmt.run(spotId, serviceId, roomId, providerId, date, spot.startTime, spot.endTime, spot.available ? 'available' : 'blocked');
            });
            stmt.finalize();
        });
    });
}

function initializeDatabase() {
    db.serialize(() => {
        try {
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            
            db.exec(schemaSql, (err) => {
                if (err) {
                    console.error("Error executing schema.sql:", err.message);
                    return;
                }
                console.log("Database schema initialized successfully.");
                
                db.get("SELECT COUNT(*) as count FROM content", (err2, row) => {
                    if (err2) {
                        console.error('Error checking content count:', err2.message);
                        return;
                    }
                    
                    if (row.count === 0) {
                        console.log("Database empty. Seeding initial values from SQL file...");
                        const seedPath = path.join(__dirname, '..', 'database', 'valores_iniciales.sql');
                        const seedSql = fs.readFileSync(seedPath, 'utf8');
                        
                        db.exec(seedSql, (err3) => {
                            if (err3) {
                                console.error("Error executing values seed SQL:", err3.message);
                            } else {
                                console.log("Database seeded successfully from SQL file.");
                                
                                db.all("SELECT * FROM services WHERE roomId IS NOT NULL AND recurrenceStartDate IS NOT NULL", (err4, services) => {
                                    if (err4) {
                                        console.error("Error getting services for spot generation:", err4.message);
                                        return;
                                    }
                                    
                                    if (services && services.length > 0) {
                                        console.log(`Generating spots for ${services.length} services...`);
                                        
                                        services.forEach(service => {
                                            db.get("SELECT * FROM rooms WHERE id = ?", [service.roomId], (err5, room) => {
                                                if (err5 || !room) return;
                                                
                                                const rangeStart = service.recurrenceStartTime || room.openTime;
                                                const rangeEnd = service.recurrenceEndTime || room.closeTime;
                                                
                                                if (service.recurrence === 'weekly' && service.recurrenceDay !== null) {
                                                    const start = new Date(service.recurrenceStartDate + 'T00:00:00');
                                                    const end = service.recurrenceEndDate ? new Date(service.recurrenceEndDate + 'T00:00:00') : new Date(start);
                                                    if (!service.recurrenceEndDate) end.setDate(end.getDate() + 84);
                                                    
                                                    const current = new Date(start);
                                                    while (current <= end) {
                                                        if (current.getDay() === service.recurrenceDay) {
                                                            const dateStr = formatDateStr(current);
                                                            generateSpotsForDate(service.id, service.providerId, service.roomId, service.duration, dateStr, rangeStart, rangeEnd);
                                                        }
                                                        current.setDate(current.getDate() + 1);
                                                    }
                                                } else if (service.recurrence === 'single' && service.recurrenceStartDate) {
                                                    generateSpotsForDate(service.id, service.providerId, service.roomId, service.duration, service.recurrenceStartDate, rangeStart, rangeEnd);
                                                }
                                            });
                                        });
                                        
                                        console.log("Spot generation initiated for all services.");
                                    }
                                });
                            }
                        });
                    } else {
                        console.log("Database already initialized. Skipping seeding.");
                    }
                });
            });
        } catch (e) {
            console.error("Failed to read SQL initialization files:", e.message);
        }
    });
}

module.exports = db;
