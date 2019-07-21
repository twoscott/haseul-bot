// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/levels.db');

// Init

db.configure("busyTimeout", 10000);

// db.run(`CREATE TABLE IF NOT EXISTS globalLvls (
//     userID TEXT NOT NULL PRIMARY KEY, 
//     lvl INT NOT NULL DEFAULT 1, 
//     xp INT NOT NULL DEFAULT 0,
//     lastMsgTimestamp INT
// )`);
// db.run(`CREATE TABLE IF NOT EXISTS guildLvls (
//     userID TEXT NOT NULL,
//     guildID TEXT NOT NULL,
//     lvl INT NOT NULL DEFAULT 1,
//     xp INT NOT NULL DEFAULT 0,
//     UNIQUE(userID, guildID)
// )`); 
db.run(`CREATE TABLE IF NOT EXISTS globalXp (
    userID TEXT NOT NULL PRIMARY KEY,
    xp INT NOT NULL DEFAULT 0,
    lastMsgTimestamp INT
)`);
db.run(`CREATE TABLE IF NOT EXISTS guildXp (
    userID TEXT NOT NULL,
    guildID TEXT NOT NULL,
    xp INT NOT NULL DEFAULT 0,
    UNIQUE(userID, guildID)
)`);
db.run(`CREATE TABLE IF NOT EXISTS exclusions (
    guildID TEXT NOT NULL,
    channelID TEXT NOT NULL PRIMARY KEY
)`);

// Functions

// const getGlobLevelXp = (lvl) => Math.round(((100/(1+(Math.E)**-((lvl-70)/15)) + (lvl/5)) - 0.5) * 1000);
// const getGuildLevelXp = (lvl) => Math.round(((70/(1+(Math.E)**-((lvl-70)/15)) + (lvl/5)) - 0.5) * 1000);

// Profile

// db.serialize(() => {
//     db.run(`CREATE TABLE IF NOT EXISTS globalXp (
//         userID TEXT NOT NULL PRIMARY KEY,
//         xp INT NOT NULL DEFAULT 0,
//         lastMsgTimestamp INT
//     )`);
//     db.run(`CREATE TABLE IF NOT EXISTS guildXp (
//         userID TEXT NOT NULL,
//         guildID TEXT NOT NULL,
//         xp INT NOT NULL DEFAULT 0,
//         UNIQUE(userID, guildID)
//     )`);

//     let stmt = db.prepare(`INSERT INTO guildXp VALUES (?,?,?)`);
//     db.each("SELECT * FROM guildLvls", (err, row) => {
//         let xp = 0;
//         for (let i = 2; i <= row.lvl; i++) {
//             xp += getGuildLevelXp(i);
//         }
//         xp += row.xp;
//         xp = Math.round(xp/2);
//         stmt.run(row.userID, row.guildID, xp);
//     })
    
//     let stmt2 = db.prepare(`INSERT INTO globalXp (userID, xp) VALUES (?,?)`);
//     db.each("SELECT * FROM globalLvls", (err, row) => {
//         let xp = 0;
//         for (let i = 2; i <= row.lvl; i++) {
//             xp += getGlobLevelXp(i);
//         }
//         xp += row.xp;
//         xp = Math.round(xp/2);
//         stmt2.run(row.userID, xp);
//     })
// })

exports.init_global_xp = (user_id) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR IGNORE INTO globalXp (userID) VALUES (?)`, [user_id], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.init_guild_xp = (user_id, guild_id) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR IGNORE INTO guildXp (userID, guildID) VALUES (?, ?)`, [user_id, guild_id], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.update_global_xp = (user_id, add_xp) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO globalXp (userID, xp) VALUES ("${user_id}", ${add_xp})
            ON CONFLICT (userID) DO
            UPDATE SET xp = xp + ${add_xp} WHERE userID = "${user_id}"`, err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.update_guild_xp = (user_id, guild_id, add_xp) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO guildXp (userID, guildID, xp) VALUES ("${user_id}", "${guild_id}", ${add_xp})
            ON CONFLICT (userID, guildID) DO
            UPDATE SET xp = xp + ${add_xp} WHERE userID = "${user_id}" AND guildID = "${guild_id}"`, err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.set_last_msg = (user_id, timestamp) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO globalXp (userID, lastMsgTimestamp) VALUES ("${user_id}", ${timestamp})
                ON CONFLICT (userID) DO
                UPDATE SET lastMsgTimestamp = CASE WHEN ${timestamp} > lastMsgTimestamp OR lastMsgTimestamp IS NULL THEN ${timestamp} ELSE lastMsgTimestamp END WHERE userID = "${user_id}"`, err => {
                if (err) return reject(err);
                return resolve()
        })
    })
}

exports.get_global_xp = (user_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM globalXp WHERE userID = ?", [user_id], (err, row) => {
            if (err) return reject(err);
            return resolve(row);
        })
    })
}

exports.get_guild_xp = (user_id, guild_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM guildXp WHERE userID = ? AND guildID = ?", [user_id, guild_id], (err, row) => {
            if (err) return reject(err);
            return resolve(row);
        })
    })
}

exports.get_all_global_xp = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM globalXp", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_guild_xp = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM guildXp WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

// Exclude xp channels

exports.add_xp_exclusion = (guild_id, channel_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM exclusions WHERE guildID = ? AND channelID = ?", [guild_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(null);
            db.run("INSERT INTO exclusions VALUES (?, ?)", [guild_id, channel_id], err => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

exports.del_xp_exclusion = (guild_id, channel_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM exclusions WHERE guildID = ? AND channelID = ?", [guild_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(null);
            db.run("DELETE FROM exclusions WHERE guildID = ? AND channelID = ?", [guild_id, channel_id], err => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

exports.get_xp_exclusions = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM exclusions", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}
