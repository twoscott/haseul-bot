const { Client } = require('../haseul.js');

const sqlite = require('sqlite');
const SQL = require('sql-template-strings');
const dbopen = sqlite.open('./haseul_data/client.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS clientSettings(
            clientID TEXT NOT NULL PRIMARY KEY,
            whitelistChan TEXT,
            whitelistOn INT NOT NULL DEFAULT 0
        )
    `);
});

exports.setVal = async function(col, val) {
    const db = await dbopen;

    const statement = await db.run(`
        INSERT INTO clientSettings (clientID, ${col})
        VALUES (?, ?)
        ON CONFLICT (clientID) DO
        UPDATE SET ${col} = ?`,
    [Client.user.id, val, val],
    );
    return statement.changes;
};

exports.toggle = async function(col) {
    const db = await dbopen;

    const statement = await db.run(`
        UPDATE OR IGNORE clientSettings
        SET ${col} = ~${col} & 1
        WHERE clientID = ?`, [Client.user.id],
    );

    let toggle = 0;
    if (statement.changes) {
        const row = await db.get(`SELECT ${col} FROM clientSettings WHERE clientID = ?`, [Client.user.id]);
        toggle = row ? row[col] : 0;
    }
    return toggle;
};

exports.getSettings = async function() {
    const db = await dbopen;

    const row = await db.get(SQL`SELECT * FROM clientSettings WHERE clientID = ${Client.user.id}`);
    return row;
};
