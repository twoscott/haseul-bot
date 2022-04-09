const sql = require('sqlite3').verbose();
const db = new sql.Database('./haseul_data/roles.db');

db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS rolesMessages (guildID TEXT NOT NULL, messageID TEXT, msg TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS availableRoles (roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)');
    db.run('CREATE TABLE IF NOT EXISTS roles (roleCommand TEXT NOT NULL, roleID NOT NULL, roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)');
});

// Channel message

exports.setMsgId = async (guildId, msgId) => new Promise((resolve, reject) => {
    db.run('UPDATE rolesMessages SET messageID = ? WHERE guildID = ?', [msgId, guildId], err => {
        if (err) return reject(err);
        return resolve();
    });
});

exports.setRolesMsg = (guildId, msg) => new Promise((resolve, reject) => {
    db.get('SELECT msg FROM rolesMessages WHERE guildID = ?', [guildId], (err, row) => {
        if (err) return reject(err);
        if (!row) {
            db.run('INSERT INTO rolesMessages (guildID, msg) VALUES (?,?)', [guildId, msg], err => {
                if (err) return reject(err);
                return resolve(false);
            });
        } else {
            db.run('UPDATE rolesMessages SET msg = ? WHERE guildID = ?', [msg, guildId], err => {
                if (err) return reject(err);
                return resolve(true);
            });
        }
    });
});

exports.getRolesMsg = guildId => new Promise((resolve, reject) => {
    db.get('SELECT * FROM rolesMessages WHERE guildID = ?', [guildId], (err, row) => {
        if (err) return reject(err);
        return resolve(row);
    });
});

// Role pairs

exports.addRole = (
    roleCommand, roleId, roleName, guildId, type) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?', [roleCommand.toLowerCase(), guildId, type.toUpperCase()], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(false);
            db.run('INSERT INTO roles VALUES (?, ?, ?, ?, ?)', [roleCommand.toLowerCase(), roleId, roleName, guildId, type.toUpperCase()], err => {
                if (err) return reject(err);
                return resolve(true);
            });
        });
    });
};

exports.removeRole = (
    roleCommand, guildId, type) => new Promise((resolve, reject) => {
    db.get('SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?', [roleCommand.toLowerCase(), guildId, type.toUpperCase()], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(false);
        db.run('DELETE FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?', [roleCommand.toLowerCase(), guildId, type.toUpperCase()], err => {
            if (err) return reject(err);
            return resolve(true);
        });
    });
});

exports.getAllRoles = guildId => new Promise((resolve, reject) => {
    db.all('SELECT roleCommand, roleID, type FROM roles WHERE guildID = ?', [guildId], (err, rows) => {
        if (err) return reject(err);
        return resolve(rows);
    });
});

exports.getRoleId = (
    roleCommand, guildId, type) => new Promise((resolve, reject) => {
    type = type.toUpperCase();
    db.get('SELECT roleID FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?', [roleCommand.toLowerCase(), guildId, type], (err, row) => {
        if (err) return reject(err);
        return resolve(row ? row.roleID : undefined);
    });
});

// Available roles

exports.availableRoleToggle = (
    roleName, guildId, type) => new Promise((resolve, reject) => {
    db.get('SELECT * FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?', [roleName, guildId, type.toUpperCase()], (err, row) => {
        if (err) return reject(err);
        if (row) {
            db.run('DELETE FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?', [roleName, guildId, type.toUpperCase()], err => {
                if (err) return reject(err);
                return resolve([undefined, roleName]);
            });
        } else {
            db.run('INSERT INTO availableRoles VALUES (?, ?, ?)', [roleName, guildId, type.toUpperCase()], err => {
                if (err) return reject(err);
                return resolve([roleName, undefined]);
            });
        }
    });
});

exports.getAvailableRoles = guildId => new Promise((resolve, reject) => {
    db.all('SELECT roleName, type FROM availableRoles WHERE guildID = ?', [guildId], (err, rows) => {
        if (err) return reject(err);
        return resolve(rows);
    });
});
