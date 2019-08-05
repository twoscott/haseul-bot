// Require modules

const Client = require("../haseul.js").Client;

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/client.db');

// Init

db.configure("busyTimeout", 10000);

db.run(`CREATE TABLE IF NOT EXISTS clientData (
    lastVliveCheck INT
)`);

// Functions

exports.set_last_vlive_check = (timestamp) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM clientData", (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run("UPDATE clientData SET lastVliveCheck = ?", [timestamp], err => {
                    if (err) return reject(err);
                    return resolve();
                })
            } else {
                db.run("INSERT INTO clientData (lastVliveCheck) VALUES (?)", [timestamp], err => {
                    if (err) return reject(err);
                    return resolve(err);
                })
            }
        })
    })
}

exports.get_client_data = () => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM clientData", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}