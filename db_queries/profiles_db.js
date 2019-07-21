// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/profiles.db');

// Init

db.configure("busyTimeout", 10000);

db.run(`CREATE TABLE IF NOT EXISTS profiles (
    userID TEXT NOT NULL PRIMARY KEY,
    banner TEXT,
    bio TEXT,
    colour TEXT
)`)