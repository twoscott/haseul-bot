const sqlite = require("sqlite");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open('./haseul_data/reps.db');

function streakHash(IDarray) {
    IDarray = IDarray.sort();
    let longID = IDarray.join(';');
    let base64ID = Buffer.from(longID).toString('base64');
    return base64ID;
}

// function streakDecode(base64ID) {
//     let longID = Buffer.from(base64ID, 'base64').toString();
//     let IDarray = longID.split(';');
//     return IDarray;
// }

dbopen.then(db => {
    db.configure("busyTimeout", 10000);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS repProfiles(
            userID TEXT NOT NULL PRIMARY KEY,
            rep INT NOT NULL DEFAULT 0,
            repsRemaining INT NOT NULL DEFAULT 3,
            lastRepTimestamp INT
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS repStreaks(
            userHash TEXT NOT NULL PRIMARY KEY,
            user1 TEXT NOT NULL,
            user2 TEXT NOT NULL,
            firstRep INT NOT NULL,
            user1LastRep INT,
            user2LastRep INT
        )
    `);
})

// dbopen.then(async db => {
//     await db.run(`
//         CREATE TABLE IF NOT EXISTS repStreaksNew(
//             userHash TEXT NOT NULL PRIMARY KEY,
//             user1 TEXT NOT NULL,
//             user2 TEXT NOT NULL,
//             firstRep INT NOT NULL,
//             user1LastRep INT,
//             user2LastRep INT
//         )
//     `);//////////////////////////////////////////////////////////////// 
//     let rows = await db.all(SQL`SELECT * FROM repStreaks`);
//     for (let row of rows) {
//         let userHash = streakHash([row.user1, row.user2]);
//         await db.run(SQL`INSERT OR IGNORE INTO repStreaksNew VALUES (${userHash}, ${row.user1}, ${row.user2}, ${row.firstRep}, ${row.user1LastRep}, ${row.user2LastRep})`);
//     }
//     await db.run(SQL`DROP TABLE repStreaks`);
//     await db.run(SQL`ALTER TABLE repStreaksNew RENAME TO repStreaks`);
//     console.log("Finished altering reps.db");
// })

exports.setUserReps = async function(userID, repsRemaining) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO repProfiles (userID, repsRemaining) VALUES (${userID}, ${repsRemaining})
        ON CONFLICT (userID) DO
        UPDATE SET repsRemaining = ${repsRemaining}
    `);
    return statement.changes;
}

exports.repUser = async function(senderID, recipientID, timestamp) {
    const db = await dbopen;

    let stmt1 = await db.run(SQL`
        INSERT INTO repProfiles (userID, repsRemaining, lastRepTimestamp)
        VALUES (${senderID}, 2, ${timestamp})
        ON CONFLICT (userID) DO
        UPDATE SET repsRemaining = repsRemaining - 1, lastRepTimestamp = ${timestamp}
    `);
    let stmt2 = await db.run(SQL`
        INSERT INTO repProfiles (userID, rep)
        VALUES (${recipientID}, 1)
        ON CONFLICT (userID) DO
        UPDATE SET rep = rep + 1
    `);
    return stmt1.changes + stmt2.changes;
}

exports.getRepProfile = async function(userID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT * FROM repProfiles WHERE userID = ${userID}`);
    return row;
}

exports.getReps = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM repProfiles`);
    return rows;
}


exports.updateStreak = async function(senderID, recipientID, timestamp) {
    const db = await dbopen;
    let userHash = streakHash([senderID, recipientID]);
    let currentStreak = 0;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO repStreaks 
        VALUES (${userHash}, ${senderID}, ${recipientID}, ${timestamp}, ${timestamp}, NULL)
    `);

    if (!statement.changes) {
        let streak = await db.get(SQL`SELECT * FROM repStreaks WHERE userHash = ${userHash}`);

        if (streak) {
            let { userHash, firstRep, user1LastRep, user2LastRep } = streak;
            let sendingUser = Object.keys(streak).find(key => streak[key] == senderID);
            let receivingUser = Object.keys(streak).find(key => streak[key] == recipientID);
            let trailingTimestamp = Math.min(user1LastRep || firstRep, user2LastRep || firstRep);
            let leadingTimestamp  = Math.max(user1LastRep || firstRep, user2LastRep || firstRep);

            if (timestamp - leadingTimestamp > 129600000) { /* 36 hours */
                await db.run(`
                    UPDATE repStreaks 
                    SET firstRep = ?, ${sendingUser}LastRep = ?, ${receivingUser}LastRep = NULL 
                    WHERE userHash = ?`, [timestamp, timestamp, userHash]
                );
            } else if (timestamp - trailingTimestamp > 129600000) { /* 36 hours */
                let leadingUser = user1LastRep > user2LastRep ? "user1" : "user2";
                let receivingTimestamp = receivingUser == leadingUser ? streak[`${leadingUser}LastRep`] : null
                
                await db.run(`
                    UPDATE repStreaks 
                    SET firstRep = ${leadingUser}LastRep, ${sendingUser}LastRep = ?, ${receivingUser}LastRep = ? 
                    WHERE userHash = ?`, [timestamp, receivingTimestamp, userHash]
                );
            } else {
                await db.run(`
                    UPDATE repStreaks 
                    SET ${sendingUser}LastRep = ?
                    WHERE userHash = ?`, [timestamp, userHash]
                );
                currentStreak = Math.floor((timestamp - streak.firstRep) / 86400000 /* 24 Hours */)
            }
        }

    }

    return currentStreak;
}

exports.updateStreaks = async function(timestamp) {
    const db = await dbopen;

    let streaks = await db.all(SQL`SELECT * FROM repStreaks`);
    for (let streak of streaks) {
        let { userHash, firstRep, user1LastRep, user2LastRep } = streak;
        let trailingTimestamp = Math.min(user1LastRep || firstRep, user2LastRep || firstRep);
        let leadingTimestamp  = Math.max(user1LastRep || firstRep, user2LastRep || firstRep);

        if (timestamp - leadingTimestamp > 129600000) { /* 36 hours */
            let statement = await db.run(SQL`DELETE FROM repStreaks WHERE userHash = ${userHash}`);
        } else if (timestamp - trailingTimestamp > 129600000) { /* 36 hours */
            let [ leadingUser, fallingUser ] = user1LastRep > user2LastRep ? [ "user1", "user2" ] : [ "user2", "user1" ];
            
            let statement = await db.run(`
                UPDATE repStreaks 
                SET firstRep = ${leadingUser}LastRep, ${fallingUser}LastRep = NULL 
                WHERE userHash = ?`, [userHash]
            );
        }
    }
}

exports.getStreak = async function(senderID, recipientID) {
    const db = await dbopen;
    let userHash = streakHash([senderID, recipientID]);

    let row = await db.get(SQL`SELECT * FROM repStreaks WHERE userHash = ${userHash}`);
    return row;
}

exports.getUserStreaks = async function(userID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM repStreaks WHERE ${userID} IN (user1, user2)`);
    return rows;
}

exports.getAllStreaks = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM repStreaks`);
    return rows;
}
