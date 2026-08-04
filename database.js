const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');

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

function initializeDatabase() {
    db.serialize(() => {
        try {
            // Read and execute schema tables definition from schema.sql
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            
            db.exec(schemaSql, (err) => {
                if (err) {
                    console.error("Error executing schema.sql:", err.message);
                    return;
                }
                console.log("Database schema initialized successfully.");
                
                // Check if content table is empty to decide whether to seed
                db.get("SELECT COUNT(*) as count FROM content", (err2, row) => {
                    if (err2) {
                        console.error('Error checking content count:', err2.message);
                        return;
                    }
                    
                    if (row.count === 0) {
                        console.log("Database empty. Seeding initial values from SQL file...");
                        const seedPath = path.join(__dirname, 'valores_iniciales.sql');
                        const seedSql = fs.readFileSync(seedPath, 'utf8');
                        
                        db.exec(seedSql, (err3) => {
                            if (err3) {
                                console.error("Error executing values seed SQL:", err3.message);
                            } else {
                                console.log("Database seeded successfully from SQL file.");
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
