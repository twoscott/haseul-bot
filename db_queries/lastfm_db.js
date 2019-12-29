const sqlite = require("sqlite");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open('./haseul_data/lastfm.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS lfUsers(
            userID TEXT NOT NULL PRIMARY KEY,
            lfUser TEXT NOT NULL
        )
    `);
})

// dbopen.then(async db => {
//     await db.run(SQL`
//         CREATE TABLE IF NOT EXISTS lfUsers (
//             userID TEXT NOT NULL PRIMARY KEY,
//             lfUser TEXT NOT NULL
//         )
//     `);
//     let rows = await db.all(SQL`SELECT * FROM lastfm`);
//     for (let row of rows) {
//         await db.run(SQL`INSERT OR IGNORE INTO lfUsers VALUES (${row.userID}, ${row.lfUser})`);
//     }
//     await db.run(SQL`DROP TABLE lastfm`);
//     console.log("Finished altering lastfm.db");
// })

exports.setLfUser = async function(userID, lfUser) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO lfUsers VALUES (${userID}, ${lfUser})
        ON CONFLICT (userID) DO 
        UPDATE SET lfUser = ${lfUser}
    `);
    return statement.changes;
}

exports.removeLfUser = async function(userID) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM lfUsers WHERE userID = ${userID}`);
    return statement.changes;
}


exports.getLfUser = async function(userID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT lfUser FROM lfUsers WHERE userID = ${userID}`);
    return row ? row.lfUser : null;
}
