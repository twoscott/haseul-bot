const discord = require("discord.js");
const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_databases/Roles Database.db');
const client = require("../haseul").client;

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS rolesChannels (channelID TEXT, messageID TEXT, guildID TEXT NOT NULL, msg TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS availableRoles (roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS roles (roleCommand TEXT NOT NULL, roleID NOT NULL, roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)");
})

//Roles channel

exports.set_roles_channel = async (channel_id, guild_id) => {
    return new Promise(async (resolve, reject) => {
        var channel = client.channels.get(channel_id);
        var guild = client.guilds.get(guild_id);
        var role_rows = await exports.get_available_roles(guild_id);
        var sender = await guild.fetchMember(client.user.id);
        db.get("SELECT * FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row || row && !row.msg) {
                resolve("No roles channel message assigned.");
                return;
            }
            if (row && row.channelID) {
                resolve("Error: Roles channel already assigned in this server.");
                return;
            }

            var embed;
            if (role_rows && role_rows.length > 0) {
                var main_roles = [];
                var sub_roles = [];
                var other_roles = [];
                for(i = 0; i < role_rows.length; i++) {
                    let row = role_rows[i];
                    switch (row.type) {
                        case "MAIN": main_roles.push(`\`${row.roleName}\``); break;
                        case "SUB": sub_roles.push(`\`${row.roleName}\``); break;
                        case "OTHER": other_roles.push(`\`${row.roleName}\``); break;
                        default: console.log("Unexpected value for column: type"); break; 
                    }
                }
                main_roles = main_roles.join(", ");
                sub_roles = sub_roles.join(", ");
                other_roles = other_roles.join(", ");

                embed = new discord.RichEmbed();
                if (main_roles.length > 1) embed.addField("Main Roles", main_roles, false);
                if (sub_roles.length > 1) embed.addField("Sub Roles", sub_roles, false);
                if (other_roles.length > 1) embed.addField("Other Roles", other_roles, false);
                embed.setTitle("__Available Roles__");
                var colour = 0xFFFFFF;
                if (sender && sender.roles) {
                    colour = sender.colorRole.color;
                }
                embed.setColor(colour);
            }

            channel.send(row.msg, {embed: embed}).then(msg => {
                db.run("UPDATE rolesChannels SET (channelID, messageID) = (?, ?) WHERE guildID = ?", [channel_id, msg.id, guild_id], (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(`<#${channel_id}> will now allow role assignment.`);
                    }
                })
            })
        })
    })
}

exports.update_roles_channel = async (guild_id) => {
    return new Promise(async (resolve, reject) => {
        var role_rows = await exports.get_available_roles(guild_id);
        var guild = client.guilds.get(guild_id);
        var sender = await guild.fetchMember(client.user.id);

        db.get("SELECT * FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row || row && !row.msg) {
                resolve("No roles channel message assigned.");
                return;
            }

            var embed;
            if (role_rows && role_rows.length > 0) {
                var main_roles = [];
                var sub_roles = [];
                var other_roles = [];
                for(i = 0; i < role_rows.length; i++) {
                    let row = role_rows[i];
                    switch (row.type) {
                        case "MAIN": main_roles.push(`\`${row.roleName}\``); break;
                        case "SUB": sub_roles.push(`\`${row.roleName}\``); break;
                        case "OTHER": other_roles.push(`\`${row.roleName}\``); break;
                        default: console.log("Unexpected value for column: type"); break; 
                    }
                }
                main_roles = main_roles.join(", ");
                sub_roles = sub_roles.join(", ");
                other_roles = other_roles.join(", ");

                embed = new discord.RichEmbed();
                if (main_roles.length > 1) embed.addField("Main Roles", main_roles, false);
                if (sub_roles.length > 1) embed.addField("Sub Roles", sub_roles, false);
                if (other_roles.length > 1) embed.addField("Other Roles", other_roles, false);
                embed.setTitle("__Available Roles__");
                var colour = 0xFFFFFF;
                if (sender && sender.roles) {
                    colour = sender.colorRole.color;
                }
                embed.setColor(colour);
            }

            var channel_id = row.channelID;
            var message_id = row.messageID;
            var channel = client.channels.get(channel_id);
            channel.fetchMessage(message_id).then(old_message => {
                old_message.delete();
                channel.send(row.msg, {embed: embed}).then(msg => {
                    db.run("UPDATE rolesChannels SET (channelID, messageID) = (?, ?) WHERE guildID = ?", [channel_id, msg.id, guild_id], (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(`<#${channel_id}> was updated.`);
                        }
                    })
                })
            })
        })
    })
}

exports.remove_roles_channel = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT channelID, messageID FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                resolve("Error: No roles assignment channel exists on this server.");
                return;
            }
            var message_id = row.messageID;
            var channel_id = row.channelID;
            var channel = client.channels.get(channel_id);
            channel.fetchMessage(message_id).then(msg => msg.delete()).catch(() => {});
            db.run("UPDATE rolesChannels SET (channelID, messageID) = (NULL, NULL) WHERE guildID = ?", [guild_id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(`<#${channel_id}> will no longer allow role assignment.`);
                }
            })
        })
    })
}

exports.get_roles_channel = (guild_id) => {
    return new Promise((resolve, reject) => {
        return db.get("SELECT channelID FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                resolve(row.channelID);
            } else {
                resolve();
            }
        })
    })
}

//Channel message

exports.set_channel_msg = (guild_id, msg) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT msg FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                db.run("INSERT INTO rolesChannels (guildID, msg) VALUES (?,?)", [guild_id, msg], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve("Roles channel message assigned.")
                    }
                })
            } else {
                db.run("UPDATE rolesChannels SET msg = ? WHERE guildID = ?", [msg, guild_id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve("Roles channel message updated.")
                    }
                })
            }
        })
    })
}

exports.get_channel_msg = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT msg FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                resolve(row.msg);
            } else {
                resolve();
            }
        })
    })
}

//Role pairs

exports.get_all_roles = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT roleCommand, roleID, type FROM roles WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows)
            }
        })
    }) 
}

exports.get_role = (role_command, guild_id, type) => {
    return new Promise((resolve, reject) => {
        type = type.toUpperCase();
        db.get("SELECT roleID FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                resolve(row.roleID);
            } else {
                resolve();
            }
        })
    })
}

exports.add_role = (role_command, role_id, role_name, guild_id, type) => {
    return new Promise ((resolve, reject) => {
        db.get("SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type.toUpperCase()], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                resolve(false);
            } else {
                db.run("INSERT INTO roles VALUES (?, ?, ?, ?, ?)", [role_command.toLowerCase(), role_id, role_name, guild_id, type.toUpperCase()], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                })
            }
        })
    })
}

exports.remove_role = (role_command, guild_id, type) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type.toUpperCase()], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                resolve(false);
            } else {
                db.run("DELETE FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type.toUpperCase()], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                })
            }
        })
    }) 
}

//Available roles

exports.available_role_toggle = (role_name, guild_id, type) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?", [role_name, guild_id, type.toUpperCase()], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                db.run("DELETE FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?", [role_name, guild_id, type.toUpperCase()], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve([undefined, role_name]);
                    }
                })
            } else {
                db.run("INSERT INTO availableRoles VALUES (?, ?, ?)", [role_name, guild_id, type.toUpperCase()], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve([role_name, undefined]);
                    }
                })
            }
        })
    })
}

exports.get_available_roles = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT roleName, type FROM availableRoles WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        })
    })
}
