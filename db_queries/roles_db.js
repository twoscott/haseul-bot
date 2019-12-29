///////////////////////////////////////
///// ! NEEDS COMPLETE OVERHAUL ! /////
///////////////////////////////////////

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/roles.db');

// Init

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS rolesMessages (guildID TEXT NOT NULL, messageID TEXT, msg TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS availableRoles (roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS roles (roleCommand TEXT NOT NULL, roleID NOT NULL, roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)");
})

// Channel message

exports.set_msg_id = async (guild_id, msg_id) => {
    return new Promise(async (resolve, reject) => {
        db.run("UPDATE rolesMessages SET messageID = ? WHERE guildID = ?", [msg_id, guild_id], (err) => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.set_roles_msg = (guild_id, msg) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT msg FROM rolesMessages WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                db.run("INSERT INTO rolesMessages (guildID, msg) VALUES (?,?)", [guild_id, msg], err => {
                    if (err) return reject(err);
                    return resolve(false);
                })
            } else {
                db.run("UPDATE rolesMessages SET msg = ? WHERE guildID = ?", [msg, guild_id], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            }
        })
    })
}

exports.get_roles_msg = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM rolesMessages WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) return reject(err);
            return resolve(row);
        })
    })
}

// Role pairs

exports.add_role = (role_command, role_id, role_name, guild_id, type) => {
    return new Promise ((resolve, reject) => {
        db.get("SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type.toUpperCase()], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(false);
            db.run("INSERT INTO roles VALUES (?, ?, ?, ?, ?)", [role_command.toLowerCase(), role_id, role_name, guild_id, type.toUpperCase()], (err) => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

exports.remove_role = (role_command, guild_id, type) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type.toUpperCase()], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(false);
            db.run("DELETE FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type.toUpperCase()], (err) => {
                if (err) return reject(err);
                return resolve(true);
            })
        })
    })
}

exports.get_all_roles = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT roleCommand, roleID, type FROM roles WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_role_id = (role_command, guild_id, type) => {
    return new Promise((resolve, reject) => {
        type = type.toUpperCase();
        db.get("SELECT roleID FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type], (err, row) => {
            if (err) return reject(err);
            return resolve(row ? row.roleID : undefined);
        })
    })
}

// Available roles

exports.available_role_toggle = (role_name, guild_id, type) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?", [role_name, guild_id, type.toUpperCase()], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run("DELETE FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?", [role_name, guild_id, type.toUpperCase()], (err) => {
                    if (err) return reject(err);
                    return resolve([undefined, role_name]);
                })
            } else {
                db.run("INSERT INTO availableRoles VALUES (?, ?, ?)", [role_name, guild_id, type.toUpperCase()], (err) => {
                    if (err) return reject(err);
                    return resolve([role_name, undefined]);
                })
            }
        })
    })
}

exports.get_available_roles = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT roleName, type FROM availableRoles WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}
