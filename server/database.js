const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const shouldReset = process.argv.includes('--reset') || process.env.RESET_DB === 'true';

let preservedUsers = [];
let preservedProfiles = [];

if (shouldReset && fs.existsSync(dbPath)) {
    try {
        const backupScript = `
const sqlite3 = require('sqlite3');
const targetPath = process.env.RESET_DB_TARGET;
const db = new sqlite3.Database(targetPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) { process.stdout.write(JSON.stringify({ users: [], profiles: [] })); return; }
    db.all('SELECT id, email, password, name, role, rut, phone, created_at FROM users', [], (uErr, users) => {
        db.all('SELECT userId, specialty, bio FROM provider_profiles', [], (pErr, profiles) => {
            process.stdout.write(JSON.stringify({
                users: (!uErr && users) ? users : [],
                profiles: (!pErr && profiles) ? profiles : []
            }));
            db.close();
        });
    });
});
`;
        const raw = execFileSync(process.execPath, ['-e', backupScript], {
            encoding: 'utf8',
            env: { ...process.env, RESET_DB_TARGET: dbPath }
        });
        const parsed = JSON.parse(raw.trim() || '{}');
        preservedUsers = parsed.users || [];
        preservedProfiles = parsed.profiles || [];
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log(`Database reset: backed up ${preservedUsers.length} users and ${preservedProfiles.length} provider profiles.`);
        }
    } catch (e) {
        console.error('Error backing up users during reset:', e.message);
        try {
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }
        } catch (unlinkErr) {
            console.error('Error deleting database file during reset:', unlinkErr.message);
        }
    }
}

let resolveDatabaseReady;
let rejectDatabaseReady;
const databaseReady = new Promise((resolve, reject) => {
    resolveDatabaseReady = resolve;
    rejectDatabaseReady = reject;
});

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        rejectDatabaseReady(err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        db.get('PRAGMA journal_mode = WAL', (pragmaErr, row) => {
            if (pragmaErr) {
                console.error('Error enabling SQLite WAL mode:', pragmaErr.message);
                rejectDatabaseReady(pragmaErr);
                return;
            }
            if (row?.journal_mode?.toLowerCase() !== 'wal') {
                const error = new Error(`SQLite did not enable WAL mode. Current journal mode: ${row?.journal_mode ?? 'unknown'}`);
                console.error(error.message);
                rejectDatabaseReady(error);
                return;
            }
            console.log('SQLite WAL mode enabled.');
            initializeDatabase();
        });
    }
});

db.ready = databaseReady;

function restorePreservedData(onComplete) {
    if (!preservedUsers || preservedUsers.length === 0) {
        return onComplete();
    }
    db.serialize(() => {
        const userStmt = db.prepare('INSERT OR REPLACE INTO users (id, email, password, name, role, rut, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const u of preservedUsers) {
            userStmt.run(u.id, u.email, u.password, u.name, u.role, u.rut || '', u.phone || '', u.created_at || new Date().toISOString());
        }
        userStmt.finalize();

        if (preservedProfiles && preservedProfiles.length > 0) {
            const profStmt = db.prepare('INSERT OR REPLACE INTO provider_profiles (userId, specialty, bio) VALUES (?, ?, ?)');
            for (const p of preservedProfiles) {
                profStmt.run(p.userId, p.specialty || '', p.bio || '');
            }
            profStmt.finalize();
        }
        console.log(`Restored ${preservedUsers.length} users and ${preservedProfiles.length} provider profiles after reset.`);
        onComplete();
    });
}

function initializeDatabase() {
    db.serialize(() => {
        try {
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');

            db.exec(schemaSql, (err) => {
                if (err) {
                    console.error('Error executing schema.sql:', err.message);
                    rejectDatabaseReady(err);
                    return;
                }
                console.log('Database schema initialized successfully.');

                db.get('SELECT COUNT(*) as count FROM content', (err2, row) => {
                    if (err2) {
                        console.error('Error checking content count:', err2.message);
                        rejectDatabaseReady(err2);
                        return;
                    }

                    if (row.count === 0) {
                        const isDev = process.argv.includes('--dev') || process.env.SEED_PROFILE === 'dev';
                        const seedFileName = isDev ? 'valores_iniciales_dev.sql' : (process.env.SEED_FILE || 'valores_iniciales.sql');
                        const seedPath = path.join(__dirname, '..', 'database', seedFileName);
                        console.log(`Database empty. Seeding initial values from SQL file (${seedFileName})...`);
                        let seedSql;
                        try {
                            seedSql = fs.readFileSync(seedPath, 'utf8');
                        } catch (seedError) {
                            console.error('Failed to read initial values SQL:', seedError.message);
                            rejectDatabaseReady(seedError);
                            return;
                        }

                        db.exec(seedSql, (err3) => {
                            if (err3) {
                                console.error('Error executing values seed SQL:', err3.message);
                                rejectDatabaseReady(err3);
                                return;
                            }
                            console.log('Database seeded successfully from SQL file.');
                            restorePreservedData(() => {
                                resolveDatabaseReady();
                            });
                        });
                    } else {
                        console.log('Database already initialized. Skipping seeding.');
                        resolveDatabaseReady();
                    }
                });
            });
        } catch (e) {
            console.error('Failed to read SQL initialization files:', e.message);
            rejectDatabaseReady(e);
        }
    });
}

module.exports = db;
