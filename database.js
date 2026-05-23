const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create tables
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL
                )
            `);

             db.run(`
                CREATE TABLE IF NOT EXISTS subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    credits INTEGER NOT NULL,
                    score REAL NOT NULL,
                    semester TEXT NOT NULL,
                    scoreCc REAL,
                    weightCc REAL,
                    scoreGk REAL,
                    weightGk REAL,
                    scoreCk REAL,
                    weightCk REAL,
                    components TEXT,
                    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
                )
            `);

            // Migration to add new columns if they do not exist
            const columns = [
                { name: 'scoreCc', type: 'REAL' },
                { name: 'weightCc', type: 'REAL' },
                { name: 'scoreGk', type: 'REAL' },
                { name: 'weightGk', type: 'REAL' },
                { name: 'scoreCk', type: 'REAL' },
                { name: 'weightCk', type: 'REAL' },
                { name: 'components', type: 'TEXT' }
            ];

            columns.forEach(col => {
                db.run(`ALTER TABLE subjects ADD COLUMN ${col.name} ${col.type}`, (err) => {
                    if (err) {
                        // Column might already exist, which is expected on subsequent runs
                        if (!err.message.includes('duplicate column name')) {
                            console.log(`Info/Error adding column ${col.name}:`, err.message);
                        }
                    } else {
                        console.log(`Added column ${col.name} to subjects table successfully.`);
                    }
                });
            });
        });
    }
});

module.exports = db;
