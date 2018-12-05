const discord = require("discord.js");
const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/Mod Database.db');
const client = require("../haseul").client;

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS pollChannels (guildID, channelID)");
})

exports.set_poll_channel = (guild_id, channel_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT guildID FROM pollChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                db.run("INSERT INTO pollChannels VALUES (?, ?)", [guild_id, channel_id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(`Poll channel set to <#${channel_id}>.`);
                    }
                })
            } else {
                db.run("UPDATE pollChannels SET channelID = ? WHERE guildID = ?", [channel_ID, guild_id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(`Poll channel set to <#${channel_id}>.`);
                    }
                })
            }
        })
    })
}

exports.remove_poll_channel = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT channelID FROM pollChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                resolve("No poll channel found.");
            } else {
                db.run("DELETE FROM pollChannels WHERE guildID = ?", [guild_id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve("Poll channel removed.");
                    }
                })
            }
        })
    })
}

exports.get_poll_channel = (guild_id) => {
    return new Promise((resolve, reject) => {
        return db.get("SELECT channelID FROM pollChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                resolve(row.channelID);
            } else {
                resolve();
            }
        })
    })
}
