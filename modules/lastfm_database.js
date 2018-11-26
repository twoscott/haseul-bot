const discord = require("discord.js");
const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/Last.fm Database.db');
const client = require("../haseul").client;

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS lastfm (userID, lfUser)");
})

//Set username

exports.set_lf_user = (user_id, lastfm_user) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT lfUser FROM lastfm WHERE userID = ?", [user_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                db.run("INSERT INTO lastfm VALUES (?, ?)", [user_id, lastfm_user], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(`Last.fm username set to ${lastfm_user}.`);
                    }
                })
            } else {
                db.run("UPDATE lastfm SET lfUser = ? WHERE userID = ?", [lastfm_user, user_id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(`Last.fm username set to ${lastfm_user}.`);
                    }
                })
            }
        })
    })
}

//Remove username

exports.remove_lf_user = (user_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT lfUser FROM lastfm WHERE userID = ?", [user_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                resolve("No Last.fm username found.")
            } else {
                db.run("DELETE FROM lastfm WHERE userID = ?", [user_id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve("Last.fm username removed.")
                    }
                })
            }
        })
    })
}

//Get username

exports.get_lf_user = (user_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT lfUser FROM lastfm WHERE userID = ?", [user_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                resolve()
            } else {
                resolve(row.lfUser);
            }
        })
    })
}
