//Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/notifications.db');

//Init

db.run(
    `CREATE TABLE IF NOT EXISTS globalNotifs (
    userID TEXT NOT NULL, 
    keyword TEXT NOT NULL,
    keyexp TEXT NOT NULL, 
    type TEXT DEFAULT "NORMAL"
)`);
db.run(`CREATE TABLE IF NOT EXISTS localNotifs  (
    guildID TEXT NOT NULL, 
    userID TEXT NOT NULL, 
    keyword TEXT NOT NULL,
    keyexp TEXT NOT NULL, 
    type TEXT DEFAULT "NORMAL"
)`);
db.run(`CREATE TABLE IF NOT EXISTS channelsBlacklist (
    guildID TEXT NOT NULL,
    channelID TEXT NOT NULL
)`);

//Add notficiation

exports.add_global_notif = (user_id, keyword, keyexp, type) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT keyword FROM globalNotifs WHERE userID = ? AND keyword = ?",
        [user_id, keyword], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(false);
            db.run("INSERT INTO globalNotifs VALUES (?, ?, ?, ?)", [user_id, keyword, keyexp, type.toUpperCase()], (err) => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

exports.add_local_notif = (guild_id, user_id, keyword, keyexp, type) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT keyword FROM localNotifs WHERE guildID = ? AND userID = ? AND keyword = ?",
        [guild_id, user_id, keyword], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(false);
            db.run("INSERT INTO localNotifs VALUES (?, ?, ?, ?, ?)", [guild_id, user_id, keyword, keyexp, type.toUpperCase()], (err) => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

//Remove notification

exports.remove_global_notif = (user_id, keyword) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT keyword FROM globalNotifs WHERE userID = ? AND keyword = ?",
        [user_id, keyword], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(false);
            db.run("DELETE FROM globalNotifs WHERE userID = ? AND keyword = ?", [user_id, keyword], (err) => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

exports.remove_local_notif = (guild_id, user_id, keyword) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT keyword FROM localNotifs WHERE guildID = ? AND userID = ? AND keyword = ?",
        [guild_id, user_id, keyword], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(false);
            db.run("DELETE FROM localNotifs WHERE userID = ? AND keyword = ?", [user_id, keyword], (err) => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

//Get notifications

exports.get_global_notifs = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM globalNotifs", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_local_notifs = (guild_id) => {
    return new Promise((resolve, reject) => {
        if (guild_id) {
            db.all("SELECT * FROM localNotifs WHERE guildID = ?", [guild_id], (err, rows) => {
                if (err) return reject(err);
                return resolve(rows);
            })
        } else {
            db.all("SELECT * FROM localNotifs", (err, rows) => {
                if (err) return reject(err);
                return resolve(rows);
            })
        }
    })
}

//Blacklist

exports.add_blacklist_channel = (guild_id, channel_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT channelID FROM channelsBlacklist WHERE guildID = ? AND channelID = ?",
        [guild_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve();
            db.run("INSERT INTO channelsBlacklist VALUES (?, ?)", [guild_id, channel_id], err => {
                if (err) return reject(err);
                resolve(true);
            })
        })
    })
}

exports.remove_blacklist_channel = (guild_id, channel_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT channelID FROM channelsBlacklist WHERE guildID = ? AND channelID = ?",
        [guild_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve();
            db.run("DELETE FROM channelsBlacklist WHERE guildID = ? AND channelID = ?",
            [guild_id, channel_id], err => {
                if (err) return reject(err);
                resolve(true);
            })
        })
    })
}

exports.get_blacklist_channels = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT channelID FROM channelsBlacklist", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}