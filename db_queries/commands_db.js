const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const SQL = require('sql-template-strings');
const dbopen = sqlite.open({
    filename: './haseul_data/commands.db',
    driver: sqlite3.Database,
});

dbopen.then(async db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS commands(
            guildID TEXT NOT NULL,
            command TEXT NOT NULL,
            text TEXT NOT NULL,
            UNIQUE(guildID, command)
        )
    `);
});

exports.addCommand = async function(guildID, command, text) {
    const db = await dbopen;

    const statement = await db.run(SQL`INSERT OR IGNORE INTO commands VALUES (${guildID}, ${command}, ${text})`);
    return statement.changes;
};

exports.removeCommand = async function(guildID, command) {
    const db = await dbopen;

    const statement = await db.run(SQL`DELETE FROM commands WHERE command = ${command} AND guildID = ${guildID}`);
    return statement.changes;
};

exports.renameCommand = async function(guildID, command, newCommand) {
    const db = await dbopen;

    const statement = await db.run(SQL`UPDATE OR IGNORE commands SET command = ${newCommand} WHERE command = ${command} AND guildID = ${guildID}`);
    return statement.changes;
};

exports.editCommand = async function(guildID, command, text) {
    const db = await dbopen;

    const statement = await db.run(SQL`UPDATE OR IGNORE commands SET text = ${text} WHERE command = ${command} AND guildID = ${guildID}`);
    return statement.changes;
};

exports.getCommand = async function(guildID, command) {
    const db = await dbopen;

    const row = await db.get(SQL`SELECT text FROM commands WHERE command = ${command} AND guildID = ${guildID}`);
    return row ? row.text : null;
};

exports.getCommands = async function(guildID) {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM commands WHERE guildID = ${guildID}`);
    return rows;
};
