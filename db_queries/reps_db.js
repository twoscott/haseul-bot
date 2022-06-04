const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const SQL = require('sql-template-strings');
const dbopen = sqlite.open({
    filename: './haseul_data/reps.db',
    driver: sqlite3.Database,
});

function streakHash(IDarray) {
    IDarray = IDarray.sort();
    const longID = IDarray.join(';');
    const base64ID = Buffer.from(longID).toString('base64');
    return base64ID;
}

dbopen.then(db => {
    db.configure('busyTimeout', 10000);
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
});

exports.setUserReps = async function(userID, repsRemaining) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        INSERT INTO repProfiles (userID, repsRemaining) VALUES (${userID}, ${repsRemaining})
        ON CONFLICT (userID) DO
        UPDATE SET repsRemaining = ${repsRemaining}
    `);
    return statement.changes;
};

exports.repUser = async function(senderID, recipientID, timestamp) {
    const db = await dbopen;

    const stmt1 = await db.run(SQL`
        INSERT INTO repProfiles (userID, repsRemaining, lastRepTimestamp)
        VALUES (${senderID}, 2, ${timestamp})
        ON CONFLICT (userID) DO
        UPDATE SET repsRemaining = repsRemaining - 1, lastRepTimestamp = ${timestamp}
    `);
    const stmt2 = await db.run(SQL`
        INSERT INTO repProfiles (userID, rep)
        VALUES (${recipientID}, 1)
        ON CONFLICT (userID) DO
        UPDATE SET rep = rep + 1
    `);
    return stmt1.changes + stmt2.changes;
};

exports.getRepProfile = async function(userID) {
    const db = await dbopen;

    const row = await db.get(SQL`SELECT * FROM repProfiles WHERE userID = ${userID}`);
    return row;
};

exports.getReps = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM repProfiles`);
    return rows;
};


exports.updateStreak = async function(senderID, recipientID, timestamp) {
    const db = await dbopen;
    const userHash = streakHash([senderID, recipientID]);
    let currentStreak = 0;

    const statement = await db.run(SQL`
        INSERT OR IGNORE INTO repStreaks 
        VALUES (${userHash}, ${senderID}, ${recipientID}, ${timestamp}, ${timestamp}, NULL)
    `);

    if (!statement.changes) {
        const streak = await db.get(SQL`SELECT * FROM repStreaks WHERE userHash = ${userHash}`);

        if (streak) {
            const { userHash, firstRep, user1LastRep, user2LastRep } = streak;
            const sendingUser = Object
                .keys(streak)
                .find(key => streak[key] == senderID);
            const receivingUser = Object
                .keys(streak)
                .find(key => streak[key] == recipientID);
            const trailingTimestamp = Math
                .min(user1LastRep || firstRep, user2LastRep || firstRep);
            const leadingTimestamp = Math
                .max(user1LastRep || firstRep, user2LastRep || firstRep);

            if (timestamp - leadingTimestamp > 129600000) {/* 36 hours */
                await db.run(`
                    UPDATE repStreaks 
                    SET firstRep = ?, ${sendingUser}LastRep = ?, ${receivingUser}LastRep = NULL 
                    WHERE userHash = ?`, [timestamp, timestamp, userHash],
                );
            } else if (timestamp - trailingTimestamp > 129600000) {/* 36 hours */
                const leadingUser = user1LastRep > user2LastRep ? 'user1' : 'user2';
                const receivingTimestamp = receivingUser == leadingUser ? streak[`${leadingUser}LastRep`] : null;

                await db.run(`
                    UPDATE repStreaks 
                    SET firstRep = ${leadingUser}LastRep, ${sendingUser}LastRep = ?, ${receivingUser}LastRep = ? 
                    WHERE userHash = ?`, [timestamp, receivingTimestamp, userHash],
                );
            } else {
                await db.run(`
                    UPDATE repStreaks 
                    SET ${sendingUser}LastRep = ?
                    WHERE userHash = ?`, [timestamp, userHash],
                );
                currentStreak = Math
                    .floor((timestamp - streak.firstRep) / 86400000); /* 24 Hours */
            }
        }
    }

    return currentStreak;
};

exports.updateStreaks = async function(timestamp) {
    const db = await dbopen;

    const streaks = await db.all(SQL`SELECT * FROM repStreaks`);
    for (const streak of streaks) {
        const { userHash, firstRep, user1LastRep, user2LastRep } = streak;
        const trailingTimestamp = Math
            .min(user1LastRep || firstRep, user2LastRep || firstRep);
        const leadingTimestamp = Math
            .max(user1LastRep || firstRep, user2LastRep || firstRep);

        if (timestamp - leadingTimestamp > 129600000) {/* 36 hours */
            await db.run(SQL`DELETE FROM repStreaks WHERE userHash = ${userHash}`);
        } else if (timestamp - trailingTimestamp > 129600000) {/* 36 hours */
            const [leadingUser, fallingUser] = user1LastRep > user2LastRep ? ['user1', 'user2'] : ['user2', 'user1'];

            await db.run(`
                UPDATE repStreaks 
                SET firstRep = ${leadingUser}LastRep, ${fallingUser}LastRep = NULL 
                WHERE userHash = ?`, [userHash],
            );
        }
    }
};

exports.getStreak = async function(senderID, recipientID) {
    const db = await dbopen;
    const userHash = streakHash([senderID, recipientID]);

    const row = await db.get(SQL`SELECT * FROM repStreaks WHERE userHash = ${userHash}`);
    return row;
};

exports.getUserStreaks = async function(userID) {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM repStreaks WHERE ${userID} IN (user1, user2)`);
    return rows;
};

exports.getAllStreaks = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM repStreaks`);
    return rows;
};
