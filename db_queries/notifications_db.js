const sqlite = require("sqlite");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open('./haseul_data/notifications.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS globalNotifs(
            userID TEXT NOT NULL, 
            keyword TEXT NOT NULL,
            keyexp TEXT NOT NULL, 
            type TEXT DEFAULT "NORMAL",
            UNIQUE(userID, keyword)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS localNotifs(
            guildID TEXT NOT NULL, 
            userID TEXT NOT NULL, 
            keyword TEXT NOT NULL,
            keyexp TEXT NOT NULL, 
            type TEXT DEFAULT "NORMAL",
            UNIQUE(guildID, userID, keyword)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS channelBlacklist(
            userID TEXT NOT NULL,
            channelID TEXT NOT NULL,
            UNIQUE(userID, channelID)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS serverBlacklist(
            userID TEXT NOT NULL,
            guildID TEXT NOT NULL,
            UNIQUE(userID, guildID)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS DnD(
            userID TEXT NOT NULL PRIMARY KEY
        )
    `);
})

// dbopen.then(async db => {
//     await db.run(
//         `CREATE TABLE IF NOT EXISTS globalNotifsNew(
//         userID TEXT NOT NULL, 
//         keyword TEXT NOT NULL,
//         keyexp TEXT NOT NULL, 
//         type TEXT DEFAULT "NORMAL",
//         UNIQUE(userID, keyword)
//     )`);
//     await db.run(`CREATE TABLE IF NOT EXISTS localNotifsNew(
//         guildID TEXT NOT NULL, 
//         userID TEXT NOT NULL, 
//         keyword TEXT NOT NULL,
//         keyexp TEXT NOT NULL, 
//         type TEXT DEFAULT "NORMAL",
//         UNIQUE(guildID, userID, keyword)
//     )`);
//     await db.run(`
//         CREATE TABLE IF NOT EXISTS DnDNew(
//             userID TEXT NOT NULL PRIMARY KEY
//         )
//     `)
//     let rows = await db.all(SQL`SELECT * FROM globalNotifs`);
//     for (let row of rows) {
//         await db.run(SQL`INSERT OR IGNORE INTO globalNotifsNew VALUES (${row.userID}, ${row.keyword}, ${row.keyexp}, ${row.type})`);
//     }
//     rows = await db.all(SQL`SELECT * FROM localNotifs`);
//     for (let row of rows) {
//         await db.run(SQL`INSERT OR IGNORE INTO localNotifsNew VALUES (${row.guildID}, ${row.userID}, ${row.keyword}, ${row.keyexp}, ${row.type})`);
//     }
//     rows = await db.all(SQL`SELECT * FROM DnD`);
//     for (let row of rows) {
//         if (row.dnd) {
//             await db.run(SQL`INSERT OR IGNORE INTO DnDNew VALUES (${row.userID})`);
//         }
//     }
//     await db.run(SQL`DROP TABLE globalNotifs`);
//     await db.run(SQL`ALTER TABLE globalNotifsNew RENAME TO globalNotifs`);

//     await db.run(SQL`DROP TABLE localNotifs`);
//     await db.run(SQL`ALTER TABLE localNotifsNew RENAME TO localNotifs`);

//     await db.run(SQL`DROP TABLE DnD`);
//     await db.run(SQL`ALTER TABLE DnDNew RENAME TO DnD`);
//     console.log("Finished altering notifications.db");
// })

exports.addGlobalNotif = async function(userID, keyword, keyexp, type) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO globalNotifs 
        VALUES (${userID}, ${keyword}, ${keyexp}, ${type})
    `);
    return statement.changes;
}

exports.addLocalNotif = async function(guildID, userID, keyword, keyexp, type) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO localNotifs
        VALUES (${guildID}, ${userID}, ${keyword}, ${keyexp}, ${type})
    `);
    return statement.changes;
}

exports.removeGlobalNotif = async function(userID, keyword) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM globalNotifs WHERE userID = ${userID} AND keyword = ${keyword}`);
    return statement.changes;
}

exports.removeLocalNotif = async function(guildID, userID, keyword) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM localNotifs
        WHERE guildID = ${guildID} AND userID = ${userID} AND keyword = ${keyword}
    `);
    return statement.changes;
}

exports.getGlobalNotifs = async function(userID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM globalNotifs WHERE userID = ${userID}`);
    return rows;
}

exports.getLocalNotifs = async function(guildID, userID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM localNotifs WHERE guildID = ${guildID} AND userID = ${userID}`);
    return rows;
}

exports.getAllGlobalNotifs = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM globalNotifs`);
    return rows;
}

exports.getAllLocalNotifs = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM localNotifs WHERE guildID = ${guildID}`);
    return rows;
}

exports.clearGlobalNotifs = async function(userID) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM globalNotifs WHERE userID = ${userID}`);
    return statement.changes;
}

exports.clearLocalNotifs = async function(guildID, userID) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM localNotifs WHERE guildID = ${guildID} AND userID = ${userID}`);
    return statement.changes;
}

exports.clearAllLocalNotifs = async function(userID) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM localNotifs WHERE userID = ${userID}`);
    return statement.changes;
}

exports.toggleChannel = async function(userID, channelID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO channelBlacklist VALUES (${userID}, ${channelID})`);
    if (!statement.changes) {
        await db.run(SQL`DELETE FROM channelBlacklist WHERE userID = ${userID} AND channelID = ${channelID}`);
    }
    return statement.changes;
}

exports.getIgnoredChannels = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM channelBlacklist`);
    return rows;
}

exports.toggleServer = async function(userID, guildID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO serverBlacklist VALUES (${userID}, ${guildID})`);
    if (!statement.changes) {
        await db.run(SQL`DELETE FROM serverBlacklist WHERE userID = ${userID} AND guildID = ${guildID}`);
    }
    return statement.changes;
}

exports.includeServer = async function(userID, guildID) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM serverBlacklist WHERE userID = ${userID} AND guildID = ${guildID}`);
    return statement.changes;
}

exports.getIgnoredServers = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM serverBlacklist`);
    return rows;
}

exports.toggleDnD = async function(userID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO DnD VALUES (${userID})`);
    if (!statement.changes) {
        await db.run(SQL`DELETE FROM DnD WHERE userID = ${userID}`);
    }
    return statement.changes;
}

exports.getDnD = async function(userID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT * FROM DnD WHERE userID = ${userID}`);
    return row;
}
