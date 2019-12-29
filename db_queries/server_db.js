const sqlite = require("sqlite");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open('./haseul_data/servers.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS pollChans(
            guildID TEXT NOT NULL, 
            channelID TEXT NOT NULL,
            UNIQUE(guildID, channelID)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS serverSettings(
            guildID TEXT NOT NULL PRIMARY KEY,
            autoroleOn INT NOT NULL DEFAULT 0,
            autoroleID TEXT,
            commandsOn INT NOT NULL DEFAULT 1, 
            pollOn INT NOT NULL DEFAULT 0,
            joinLogsOn INT NOT NULL DEFAULT 0, 
            joinLogsChan TEXT,
            welcomeOn INT NOT NULL DEFAULT 0,
            welcomeChan TEXT,
            welcomeMsg TEXT,
            rolesOn INT NOT NULL DEFAULT 0,
            rolesChannel TEXT
        )
    `);
})

// dbopen.then(async db => {
//     await db.run(SQL`
//         CREATE TABLE IF NOT EXISTS pollChansNew(
//             guildID TEXT NOT NULL, 
//             channelID TEXT NOT NULL,
//             UNIQUE(guildID, channelID)
//         )
//     `);
//     db.run(SQL`
//         CREATE TABLE IF NOT EXISTS serverSettingsNew(
//             guildID TEXT NOT NULL PRIMARY KEY,
//             autoroleOn INT NOT NULL DEFAULT 0,
//             autoroleID TEXT,
//             commandsOn INT NOT NULL DEFAULT 1, 
//             pollOn INT NOT NULL DEFAULT 0,
//             joinLogsOn INT NOT NULL DEFAULT 0, 
//             joinLogsChan TEXT,
//             welcomeOn INT NOT NULL DEFAULT 0,
//             welcomeChan TEXT,
//             welcomeMsg TEXT,
//             rolesOn INT NOT NULL DEFAULT 0,
//             rolesChannel TEXT
//         )
//     `);
//     let rows = await db.all(SQL`SELECT * FROM pollChans`);
//     for (let row of rows) {
//         await db.run(SQL`INSERT OR IGNORE INTO pollChansNew VALUES (${row.guildID}, ${row.channelID})`);
//     }
//     rows = await db.all(SQL`SELECT * FROM serverSettings`);
//     for (let row of rows) {
//         await db.run(SQL`INSERT OR IGNORE INTO serverSettingsNew VALUES (
//             ${row.guildID}, ${row.autoroleOn}, ${row.autoroleID}, ${row.commandsOn},
//             ${row.pollOn}, ${row.joinLogsOn}, ${row.joinLogsChan}, ${row.welcomeOn},
//             ${row.welcomeChan}, ${row.welcomeMsg}, ${row.rolesOn}, ${row.rolesChannel}
//         )`);
//     }

//     await db.run(SQL`DROP TABLE pollChans`);
//     await db.run(SQL`ALTER TABLE pollChansNew RENAME TO pollChans`);
//     await db.run(SQL`DROP TABLE serverSettings`);
//     await db.run(SQL`ALTER TABLE serverSettingsNew RENAME TO serverSettings`);
//     console.log("Finished altering servers.db");
// })

exports.setVal = async function(guildID, col, val) {
    const db = await dbopen;

    let statement = await db.run(`
        INSERT INTO serverSettings (guildID, ${col})
        VALUES (?, ?)
        ON CONFLICT (guildID) DO
        UPDATE SET ${col} = ?`,
        [guildID, val, val]
    );
    return statement.changes;
}

exports.toggle = async function(guildID, col) {
    const db = await dbopen;

    let statement = await db.run(`
        UPDATE OR IGNORE serverSettings
        SET ${col} = ~${col} & 1
        WHERE guildID = ?`, [guildID]  
    );

    let toggle = 0;
    if (statement.changes) {
        let row = await db.get(`SELECT ${col} FROM serverSettings WHERE guildID = ?`, [guildID]);
        toggle = row ? row[col] : 0;
    }
    return toggle;
}

exports.initServer = async function(guildID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO serverSettings 
        (guildID) 
        VALUES (${guildID})
    `);
    return statement.changes;
}

exports.getServers = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM serverSettings`);
    return rows;
}

exports.getServer = async function(guildID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT * FROM serverSettings WHERE guildID = ${guildID}`);
    return row;
}

exports.addPollChannel = async function(guildID, channelID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO pollChans VALUES (${guildID}, ${channelID})`);
    return statement.changes;
}

exports.removePollChannel = async function(guildID, channelID) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM pollChans WHERE guildID = ${guildID} AND channelID = ${channelID}`);
    return statement.changes;
}

exports.getPollChannels = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT channelID FROM pollChans WHERE guildID = ${guildID}`);
    return rows;
}
