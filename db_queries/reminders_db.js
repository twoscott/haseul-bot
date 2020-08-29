const sqlite = require("sqlite");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open('./haseul_data/reminders.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS reminders(
            reminderID INTEGER PRIMARY KEY AUTOINCREMENT,
            userID TEXT NOT NULL,
            remindContent TEXT NOT NULL,
            remindTimestamp INT NOT NULL,
            reminderSetTime INT NOT NULL
        )
    `);
})

exports.addReminder = async function(userID, remindContent, remindTimestamp, reminderSetTime) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO reminders (userID, remindContent, remindTimestamp, reminderSetTime)
        VALUES (${userID}, ${remindContent}, ${remindTimestamp}, ${reminderSetTime})
    `);
    return statement.lastID;
}

exports.removeReminder = async function(reminderID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM reminders 
        WHERE reminderID = ${reminderID}
    `);
    return statement.changes;
}

exports.clearUserReminders = async function(userID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM reminders 
        WHERE userID = ${userID}
    `);
    return statement.changes;
}

exports.getUserReminders = async function(userID) {
    const db = await dbopen;

    let reminders = await db.all(SQL`
        SELECT * FROM reminders
        WHERE userID = ${userID}
    `);
    return reminders;
}

exports.getOverdueReminders = async function() {
    const db = await dbopen;

    let reminders = await db.all(SQL`
        SELECT * FROM reminders
        WHERE strftime('%s', 'now') >= remindTimestamp
    `);
    return reminders;
}
