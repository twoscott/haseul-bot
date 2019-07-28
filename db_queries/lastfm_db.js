// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/lastfm.db');

// Init

db.run("CREATE TABLE IF NOT EXISTS lastfm (userID TEXT NOT NULL, lfUser TEXT NOT NULL)");
 
// Set username

exports.set_lf_user = (user_id, lastfm_user) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT lfUser FROM lastfm WHERE userID = ?", [user_id], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run("UPDATE lastfm SET lfUser = ? WHERE userID = ?", [lastfm_user, user_id], err => {
                    if (err) return reject(err);
                    return resolve();
                })
            } else {
                db.run("INSERT INTO lastfm VALUES (?, ?)", [user_id, lastfm_user], err => {
                    if (err) return reject(err);
                    return resolve();
                })
            }
        })
    })
}

// Remove username

exports.remove_lf_user = (user_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT lfUser FROM lastfm WHERE userID = ?", [user_id], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(false);
            db.run("DELETE FROM lastfm WHERE userID = ?", [user_id], err => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

// Get username

exports.get_lf_user = (user_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT lfUser FROM lastfm WHERE userID = ?", [user_id], (err, row) => {
            if (err) return reject(err);
            return resolve(row ? row.lfUser : undefined);
        })
    })
}
