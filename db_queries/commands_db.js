// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/commands.db');

// Init

db.run("CREATE TABLE IF NOT EXISTS commands (guildID TEXT NOT NULL, commandName TEXT NOT NULL, text TEXT)");

// Add command

exports.add_command = (guild_id, command_name, text) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT commandName FROM commands WHERE commandName = ? AND guildID = ?", [command_name, guild_id], (err, row) => {
            if (err) return reject(err);
            if (row) {
                return resolve(`\\⚠ A command with the name \`${command_name}\` already exists.`);
            } else {
                db.run("INSERT INTO commands VALUES (?,?,?)", [guild_id, command_name, text], err => {
                    if (err) return reject(err);
                    return resolve(`Command \`.${command_name}\` was added.`);
                })
            }
        })
    })
}

// Remove command

exports.remove_command = (guild_id, command_name) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT commandName FROM commands WHERE commandName = ? AND guildID = ?", [command_name, guild_id], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(`\\⚠ No command with the name \`${command_name}\` was found.`);
            db.run("DELETE FROM commands WHERE commandName = ? AND guildID = ?", [command_name, guild_id], err => {
                if (err) return reject(err);
                return resolve(`Command \`.${command_name}\` was removed.`);
            })
        })
    })
}

// Edit command

exports.edit_command = (guild_id, command_name, text) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT commandName FROM commands WHERE commandName = ? AND guildID = ?", [command_name, guild_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                return resolve(`\\⚠ No command with the name \`${command_name}\` was found.`);
            } else {
                db.run("UPDATE commands SET text = ? WHERE commandName = ? AND guildID = ?", [text, command_name, guild_id], err => {
                    if (err) return reject(err);
                    return resolve(`Command \`.${command_name}\` was edited.`);
                })
            }
        })
    })
}

// Get command

exports.get_command = (guild_id, command_name) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT text FROM commands WHERE commandName = ? AND guildID = ?", [command_name, guild_id], (err, row) => {
            if (err) return reject(err);
            return resolve(row ? row.text : null);
        })
    })
}

// Get commands for guild

exports.get_commands = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT commandName FROM commands WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            return resolve(rows ? rows.map(x => x.commandName) : null);
        })
    })
}

