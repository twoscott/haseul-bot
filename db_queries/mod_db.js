// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/servers.db');

// Init

db.run("CREATE TABLE IF NOT EXISTS pollChans (guildID TEXT NOT NULL, channelID TEXT NOT NULL)");

// Add channel

exports.add_poll_channel = (guild_id, channel_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT channelID FROM pollChans WHERE guildID = ? AND channelID = ?", [guild_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (row) {
                return resolve(false)
            } else {
                db.run("INSERT INTO pollChans VALUES (?, ?)", [guild_id, channel_id], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            }
        })
    })
}

// Delete channel

exports.del_poll_channel = (guild_id, channel_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT channelID FROM pollChans WHERE guildID = ? AND channelID = ?", [guild_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                return resolve(false)
            } else {
                db.run("DELETE FROM pollChans WHERE guildID = ? AND channelID = ?", [guild_id, channel_id], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            }
        })
    })
}

// Get channel

exports.get_poll_channels = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT channelID FROM pollChans WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            if (!rows) {
                return resolve(false)
            } else {
                return resolve(rows);
            }
        })
    })
}
