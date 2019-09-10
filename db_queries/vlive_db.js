// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/vlive.db');

// Init

db.configure("busyTimeout", 10000);

db.run(`CREATE TABLE IF NOT EXISTS channelArchive (
    channelCode TEXT NOT NULL PRIMARY KEY,
    channelName TEXT NOT NULL,
    channelPlusType TEXT
)`)

db.run(`CREATE TABLE IF NOT EXISTS vliveChannels (
    guildID TEXT NOT NULL,
    discordChanID TEXT NOT NULL,
    channelSeq INT NOT NULL,
    channelCode TEXT NOT NULL,
    channelName TEXT NOT NULL,
    mentionRoleID TEXT,
    VPICK INT NOT NULL DEFAULT 1,
    UNIQUE(discordChanID, ChannelSeq)
)`);

db.run(`CREATE TABLE IF NOT EXISTS vliveVideos (
    videoSeq INT NOT NULL PRIMARY KEY,
    channelSeq INT NOT NULL
)`);

// Channel archive

exports.add_update_archive_channel = (channel_code, channel_name, channel_plus_type) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT FROM channelArchive WHERE channelCode = ?", [channel_code], (err, row) => {
            if (!row) {
                db.run("INSERT OR IGNORE INTO channelArchive VALUES (?, ?, ?)", [channel_code, channel_name, channel_plus_type], err => {
                    if (err) return reject(err);
                    return resolve();
                })
            } else {
                db.run("UPDATE channelArchive SET channelName = ?, channelPlusType = ?", [channel_name, channel_plus_type], err => {
                    if (err) return reject(err);
                })
            }
        })
    })
}

exports.get_channel_archive = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM channelArchive", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

// Vlive channels

exports.add_vlive_channel = (guild_id, channel_id, vlive_chanseq, vlive_chancode, vlive_channame, mention_role) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM vliveChannels WHERE channelSeq = ? AND discordChanID = ?", [vlive_chanseq, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                db.run("INSERT INTO vliveChannels VALUES (?,?,?,?,?,?,1)", [guild_id, channel_id, vlive_chanseq, vlive_chancode, vlive_channame, mention_role], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            } else {
                return resolve(false);
            }
        })
    })
}

exports.del_vlive_channel = (guild_id, channel_id, channel_seq) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM vliveChannels WHERE channelSeq = ? AND discordChanID = ? AND guildID = ?", [channel_seq, channel_id, guild_id], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run("DELETE FROM vliveChannels WHERE channelSeq = ? AND discordChanID = ? AND guildID = ?", [channel_seq, channel_id, guild_id], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            } else {
                return resolve(false);
            }
        })
    })
}

exports.get_guild_vlive_channels = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM vliveChannels WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_vlive_channels = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM vliveChannels", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.toggle_vpick = (guild_id, channel_id, channel_seq) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM vliveChannels WHERE channelSeq = ? AND discordChanID = ? AND guildID = ?", [channel_seq, channel_id, guild_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                return resolve(null);
            } else {
                let tog = row.VPICK ^ 1;
                db.run("UPDATE vliveChannels SET VPICK = ? WHERE channelSeq = ? AND discordChanID = ? AND guildID = ?", [tog, channel_seq, channel_id, guild_id], err => {
                    if (err) return reject(err);
                    return resolve(tog);
                })
            }
        })
    })
}

// Vlive videos

exports.add_video = (video_seq, channel_seq) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR IGNORE INTO vliveVideos VALUES (? ,?)", [video_seq, channel_seq], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.get_channel_vlive_videos = (channel_seq) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM vliveVideos WHERE channelSeq = ?", channel_seq, (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_vlive_videos = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM vliveVideos", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}
