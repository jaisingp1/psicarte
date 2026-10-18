const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');

if (process.argv.includes('--reset') || process.env.RESET_DB === 'true') {
    try {
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    } catch (e) {
        console.error('Error deleting database file during reset:', e.message);
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        db.get('PRAGMA journal_mode = WAL', (pragmaErr, row) => {
            if (pragmaErr) {
                console.error('Error enabling SQLite WAL mode:', pragmaErr.message);
                return;
            }
            if (row?.journal_mode?.toLowerCase() !== 'wal') {
                console.error('SQLite did not enable WAL mode. Current journal mode:', row?.journal_mode ?? 'unknown');
                return;
            }
            console.log('SQLite WAL mode enabled.');
            initializeDatabase();
        });
    }
});

function initializeDatabase() {
    db.serialize(() => {
        try {
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');

            db.exec(schemaSql, (err) => {
                if (err) {
                    console.error('Error executing schema.sql:', err.message);
                    return;
                }
                console.log('Database schema initialized successfully.');

                db.get('SELECT COUNT(*) as count FROM content', (err2, row) => {
                    if (err2) {
                        console.error('Error checking content count:', err2.message);
                        return;
                    }

                    if (row.count === 0) {
                        console.log('Database empty. Seeding initial values from SQL file...');
                        const seedPath = path.join(__dirname, '..', 'database', 'valores_iniciales.sql');
                        const seedSql = fs.readFileSync(seedPath, 'utf8');

                        db.exec(seedSql, (err3) => {
                            if (err3) {
                                console.error('Error executing values seed SQL:', err3.message);
                            } else {
                                console.log('Database seeded successfully from SQL file.');
                            }
                            // Spot generation se ejecuta fuera de serialize() para evitar race conditions
                            // con los callbacks anidados de SpotGenerator
                            setImmediate(() => {
                                generateSpotsForAllAgendas();
                            });
                        });
                    } else {
                        console.log('Database already initialized. Skipping seeding.');
                    }
                });
            });
        } catch (e) {
            console.error('Failed to read SQL initialization files:', e.message);
        }
    });
}

function generateSpotsForAllAgendas() {
    db.all('SELECT * FROM agendas WHERE status = \'published\'', (err, agendas) => {
        if (err) {
            console.error('Error loading agendas for spot generation:', err.message);
            return;
        }
        if (!agendas || agendas.length === 0) {
            console.log('No published agendas found for spot generation.');
            return;
        }

        console.log(`Generating spots for ${agendas.length} published agendas...`);
        let processed = 0;

        // Procesar agendas secuencialmente para evitar conflictos entre sí
        function processNext(idx) {
            if (idx >= agendas.length) {
                console.log('Spot generation completed for all agendas.');
                linkExistingBookingsToSpots();
                return;
            }

            const agenda = agendas[idx];
            generateSpotsForAgenda(agenda, (result) => {
                console.log(`Agenda ${agenda.id}: ${result.spotsGenerated} spots generated, ${result.conflicts} conflicts.`);
                processed++;
                processNext(processed);
            });
        }

        processNext(0);
    });
}

function linkExistingBookingsToSpots() {
    db.all('SELECT * FROM bookings WHERE spot_id IS NULL', (err, bookings) => {
        if (err || !bookings || bookings.length === 0) {
            console.log('No unlinked bookings found.');
            return;
        }

        let matched = 0;
        let processed = 0;

        bookings.forEach(booking => {
            db.get(
                'SELECT id FROM spots WHERE provider_id = ? AND room_id = ? AND date = ? AND start_time = ? AND end_time = ? AND status = \'available\' LIMIT 1',
                [booking.providerId, booking.roomId, booking.date, booking.startTime, booking.endTime],
                (err2, spot) => {
                    if (!err2 && spot) {
                        db.run('UPDATE spots SET status = \'booked\', booking_id = ? WHERE id = ?', [booking.id, spot.id]);
                        db.run('UPDATE bookings SET spot_id = ? WHERE id = ?', [spot.id, booking.id]);
                        matched++;
                    }
                    processed++;
                    if (processed === bookings.length) {
                        console.log(`Linked ${matched} existing bookings to spots.`);
                    }
                }
            );
        });
    });
}

function generateSpotsForAgenda(agenda, callback) {
    const { SpotGenerator } = require('./spot-generator');
    const generator = new SpotGenerator(db);

    generator.generate(agenda, (result) => {
        callback(result);
    });
}

module.exports = db;
