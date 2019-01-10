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
)`);

// db.run(`CREATE TABLE IF NOT EXISTS msgIndex (
//     guildID TEXT NOT NULL,
//     postCount INT,
//     lastMsgTimestamp INT,
//     lastMsgID TEXT,
//     firstMsgTimestamp INT,
//     firstMsgID TEXT
// )`);

//Server Settings

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

//Message indexing

// exports.setMsgIndex = (guild_id, post_count, last_msg_ts, last_msg_id, first_msg_ts, first_msg_id) => {
//     return new Promise((resolve, reject) => {
//         db.get("SELECT * FROM msgIndex WHERE guildID = ?", [guild_id], (err, row) => {
//             if (err) return reject(err);
//             if (row) {
//                 db.run("UPDATE msgIndex SET postCount = ?, lastMsgTimestamp = ?, lastMsgID = ?, firstMsgTimestamp = ?, firstMsgID = ? WHERE guildID = ?",
//                 [post_count, last_msg_ts, last_msg_id, first_msg_ts, first_msg_id, guild_id], err => {
//                     if (err) return reject(err);
//                     return resolve();
//                 })
//             } else {
//                 db.run("INSERT INTO msgIndex VALUES (?, ?, ?, ?, ?, ?)", [guild_id, post_count, last_msg_ts, last_msg_id, first_msg_ts, first_msg_id], err => {
//                     if (err) return reject(err);
//                     return resolve();
//                 })
//             }

//         })
//     })
// }

// exports.getMsgIndex = (guild_id) => {
//     return new Promise((resolve, reject) => {
//         db.get("SELECT * FROM msgIndex WHERE guildID = ?", [guild_id], (err, row) => {
//             if (err) return reject(err);
//             return resolve(row);
//         })
//     })
// }

// exports.clearMsgIndex = (guild_id) => {
//     return new Promise((resolve, reject) => {
//         db.get("SELECT * FROM msgIndex WHERE guildID = ?", [guild_id], (err, row) => {
//             if (err) return reject(err);
//             if (row) {
//                 db.run("DELETE FROM msgIndex WHERE guildID = ?", [guild_id], err => {
//                     return err ? reject(err) : resolve(true);
//                 })
//             } else {
//                 return resolve();
//             }
//         })
//     })
// }