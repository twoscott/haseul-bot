// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/reps.db');

// Init

db.configure("busyTimeout", 10000);

db.run(`CREATE TABLE IF NOT EXISTS repProfiles (
    userID TEXT NOT NULL PRIMARY KEY,
    rep INT NOT NULL DEFAULT 0,
    repsRemaining INT NOT NULL DEFAULT 3,
    lastRepTimestamp INT
)`)

db.run(`CREATE TABLE IF NOT EXISTS repStreaks (
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    firstRep INT NOT NULL,
    user1LastRep INT,
    user2LastRep INT,
    streak INT NOT NULL DEFAULT 0
)`);

// Functions

// Rep

exports.init_rep_profile = (user_id) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR IGNORE INTO repProfiles (userID) VALUES (?)", [user_id], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.get_rep_profile = (user_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM repProfiles WHERE userID = ?", [user_id], (err, row) => {
            if (err) return reject(err);
            return resolve(row);
        })
    })
}

exports.set_user_reps = (user_id, reps_remaining) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE repProfiles SET repsRemaining = ? WHERE userID = ?", [reps_remaining, user_id], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.rep_user = (timestamp, sender_id, recipient_id) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE repProfiles SET repsRemaining = repsRemaining - 1, lastRepTimestamp = ? WHERE userID = ?", [timestamp, sender_id], err => {
            if (err) return reject(err);
            db.run("UPDATE repProfiles SET rep = rep + 1 WHERE userID = ?", [recipient_id], err => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

exports.get_reps = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM repProfiles", (err, rows) => {
            if (err) return reject (err);
            return resolve(rows);
        })
    })
}

exports.update_streak = (timestamp, sender_id, recipient_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM repStreaks WHERE user1 IN (?,?) AND user2 IN (?,?)", [sender_id, recipient_id, sender_id, recipient_id], (err, streak) => {
            if (err) return reject(err);
            if (!streak) {
                db.run("INSERT INTO repStreaks VALUES (?,?,?,?,?,?)", [sender_id, recipient_id, timestamp, timestamp, null, 0], err => {
                    if (err) return reject(err);
                    return resolve(0);
                })
            } else {
                let sendingUser = Object.keys(streak).find(key => streak[key] == sender_id);
                let receivingUser = Object.keys(streak).find(key => streak[key] == recipient_id);
                if (timestamp - Math.min(streak.user1LastRep || streak.firstRep, streak.user2LastRep || streak.firstRep) > 36*60*60*1000/*36 Hours*/) {
                    db.run(`UPDATE repStreaks SET firstRep = ?, ${sendingUser}LastRep = ?, ${receivingUser}LastRep = NULL, streak = 0 WHERE user1 = ? AND user2 = ?`, [timestamp, timestamp, streak.user1, streak.user2], err => {
                        if (err) return reject(err);
                        return resolve(0);
                    })
                } else {
                    let currentStreakDays = Math.floor((timestamp - streak.firstRep)/(24*60*60*1000/*24 Hours*/));
                    db.run(`UPDATE repStreaks SET ${sendingUser}LastRep = ?, streak = ? WHERE user1 = ? AND user2 = ?`, [timestamp, currentStreakDays, streak.user1, streak.user2], err => {
                        if (err) return reject(err);
                        return resolve(currentStreakDays);
                    })
                }
            }
        })
    })
}

exports.update_streaks = (timestamp) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM repStreaks", async (err, streaks) => {
            if (err) return reject(err);
            for (let streak of streaks) {
                await new Promise((resolve, reject) => {
                    if (timestamp - Math.min(streak.user1LastRep || streak.firstRep, streak.user2LastRep || streak.firstRep) > 36*60*60*1000/*36 Hours*/) {
                        db.run(`DELETE FROM repStreaks WHERE user1 = ? AND user2 = ?`, [streak.user1, streak.user2], err => {
                            if (err) return reject(err);
                            return resolve();
                        })
                    } else {
                        let currentStreakDays = Math.floor((timestamp - streak.firstRep)/(24*60*60*1000/*24 Hours*/));
                        db.run(`UPDATE repStreaks SET streak = ? WHERE user1 = ? AND user2 = ?`, [currentStreakDays, streak.user1, streak.user2], err => {
                            if (err) return reject(err);
                            return resolve();
                        })
                    }
                })
            }
            return resolve();
        })
    })
}

exports.get_streak = (sender_id, recipient_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM repStreaks WHERE user1 IN (?,?) AND user2 IN (?,?)", [sender_id, recipient_id, sender_id, recipient_id], (err, streak) => {
            if (err) return reject(err);
            return resolve(streak);
        })
    })
}

exports.get_user_streaks = (user_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM repStreaks WHERE ? IN (user1, user2)", [user_id], (err, streaks) => {
            if (err) return reject(err);
            return resolve(streaks);
        })
    })
}

exports.get_all_streaks = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM repStreaks", (err, streaks) => {
            if (err) return reject(err);
            return resolve(streaks);
        })
    })
}
