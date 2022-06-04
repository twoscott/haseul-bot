const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const SQL = require('sql-template-strings');
const dbopen = sqlite.open({
    filename: './haseul_data/lastfm.db',
    driver: sqlite3.Database
});

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS lfUsers(
            userID TEXT NOT NULL PRIMARY KEY,
            lfUser TEXT NOT NULL
        )
    `);
});

exports.setLfUser = async function(userID, lfUser) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        INSERT INTO lfUsers VALUES (${userID}, ${lfUser})
        ON CONFLICT (userID) DO 
        UPDATE SET lfUser = ${lfUser}
    `);
    return statement.changes;
};

exports.removeLfUser = async function(userID) {
    const db = await dbopen;

    const statement = await db.run(SQL`DELETE FROM lfUsers WHERE userID = ${userID}`);
    return statement.changes;
};


exports.getLfUser = async function(userID) {
    const db = await dbopen;

    const row = await db.get(SQL`SELECT lfUser FROM lfUsers WHERE userID = ${userID}`);
    return row ? row.lfUser : null;
};
