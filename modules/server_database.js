//Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/servers.db');

//Init

const columns = [
    "pollOn", "pollChannel", "joinLogsOn", 
    "joinLogsChan", "rolesOn", "rolesChannel"
];

db.run(
    `CREATE TABLE IF NOT EXISTS serverSettings (
    guildID TEXT NOT NULL, 
    pollOn INT NOT NULL DEFAULT 0, 
    pollChannel TEXT, 
    joinLogsOn INT NOT NULL DEFAULT 0, 
    joinLogsChan TEXT,
    rolesOn INT NOT NULL DEFAULT 0,
    rolesChannel TEXT
    )`
)

//Functions

exports.setVal = (guildID, col, val) => {
    if (!columns.includes(col)) return;
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM serverSettings WHERE guildID = ?", [guildID], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run(`UPDATE serverSettings SET ${col} = ? WHERE guildID = ?`, [val, guildID], err => {
                    if (err) return reject(err);
                    return resolve();
                })
            }
            else {
                db.run(`INSERT INTO serverSettings (guildID, ${col}) VALUES (?, ?)`, [guildID, val], err => {
                    if (err) return reject(err);
                    return resolve();
                })
            }
        })
    })
}

//

exports.toggle = (guildID, col) => {
    if (!columns.includes(col)) return;
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM serverSettings WHERE guildID = ?", [guildID], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.get(`SELECT ${col} FROM serverSettings WHERE guildID = ?`, [guildID], (err, row) => {
                    if (err) return reject(err);
                    let tog = row[col] ^ 1;
                    db.run(`UPDATE serverSettings SET ${col} = ? WHERE guildID = ?`, [tog, guildID], err => {
                        if (err) return reject(err);
                        return resolve(tog);
                    })
                })
            }
            else {
                db.run(`INSERT INTO serverSettings (guildID, ${col}) VALUES (?, 1)`, [guildID], err => {
                    if (err) return reject(err);
                    return resolve(1);
                })
            }
        })
    })
}

//

exports.getServers = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM serverSettings", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.getServer = (guildID) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM serverSettings WHERE guildID = ?", [guildID], (err, row) => {
            if (err) return reject(err);
            return resolve(row);
        })
    })
}