const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const SQL = require('sql-template-strings');
const dbopen = sqlite.open({
    filename: './haseul_data/levels.db',
    driver: sqlite3.Database,
});

dbopen.then(db => {
    db.run(`
        CREATE TABLE IF NOT EXISTS globalXp(
            userID TEXT NOT NULL PRIMARY KEY,
            xp INT NOT NULL DEFAULT 0
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS guildXp(
            userID TEXT NOT NULL,
            guildID TEXT NOT NULL,
            xp INT NOT NULL DEFAULT 0,
            UNIQUE(userID, guildID)
        )
    `);
});

exports.updateGlobalXp = async function(userID, addXp) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        INSERT INTO globalXp VALUES (${userID}, ${addXp})
        ON CONFLICT (userID) DO
        UPDATE SET xp = xp + ${addXp}
    `);
    return statement.changes;
};

exports.updateGuildXp = async function(userID, guildID, addXp) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        INSERT INTO guildXp VALUES (${userID}, ${guildID}, ${addXp})
        ON CONFLICT (userID, guildID) DO
        UPDATE SET xp = xp + ${addXp}
    `);
    return statement.changes;
};

exports.getGlobalXp = async function(userID) {
    const db = await dbopen;

    const row = await db.get(SQL`SELECT xp FROM globalXp WHERE userID = ${userID}`);
    return row ? row.xp : 0;
};

exports.getGuildXp = async function(userID, guildID) {
    const db = await dbopen;

    const row = await db.get(SQL`SELECT xp FROM guildXp WHERE userID = ${userID} AND guildID = ${guildID}`);
    return row ? row.xp : 0;
};

exports.getAllGlobalXp = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM globalXp`);
    return rows;
};

exports.getAllGuildXp = async function(guildID) {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM guildXp WHERE guildID = ${guildID}`);
    return rows;
};
