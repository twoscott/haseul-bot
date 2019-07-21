// //Require modules

// const sql = require("sqlite3").verbose();
// const db = new sql.Database('./haseul_data/reminders.db');

// //Init

// db.run("CREATE TABLE IF NOT EXISTS reminders (userID TEXT NOT NULL, reminder TEXT NOT NULL, time INT NOT NULL, type TEXT NOT NULL)");

// //Functions

// exports.add_reminder = (user_id, reminder, time, type) => {
//     return new Promise((resolve, reject) => {
//         db.get("SELECT * FROM reminders WHERE userID = ? AND reminder = ? AND time = ? AND type = ?", 
//         [user_id, reminder, time, type], (err, row) => {
//             if (err) return reject(err);
//             if (row) return resolve();
//             db.run("INSERT INTO reminders VALUES (?, ?, ?, ?)", [user_id, reminder, time, type], err => {
//                 if (err) return reject(err);
//                 return resolve(true);
//             })
//         })
//     })
// }

