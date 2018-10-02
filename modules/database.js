const discord = require("discord.js");
const sql = require("sqlite3").verbose();
const db = new sql.Database('./roles databases/Roles Database.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS rolesChannels (channelID TEXT NOT NULL, messageID TEXT NOT NULL, guildID TEXT NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS availableRoles (roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS roles (roleCommand TEXT NOT NULL, roleID NOT NULL, roleName TEXT NOT NULL, guildID TEXT NOT NULL, type TEXT NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS channelMsgs (guildID TEXT NOT NULL, msg TEXT NOT NULL)");
})

module.exports = (client = discord.Client) => {

    set_channel_msg = (guild_id, msg, callback) => {
        db.get("SELECT * FROM channelMsgs WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (!row) {
                    db.run("INSERT INTO channelMsgs VALUES (?,?)", [guild_id, msg], err => {
                        if (err) {
                            console.log(err);
                        } else {
                            callback("Roles channel message assigned.")
                        }
                    })
                } else {
                    db.run("UPDATE channelMsgs SET msg = ? WHERE guildID = ?", [msg, guild_id], err => {
                        if (err) {
                            console.log(err);
                        } else {
                            callback("Roles channel message updated.")
                        }
                    })
                }
            }
        })
    }

    get_channel_msg = (guild_id, callback) => {
        db.get("SELECT msg FROM channelMsgs WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (row) {
                    callback(row.msg);
                } else {
                    callback(undefined);
                }
            }
        })
    }

    get_all_roles = (guild_id, callback) => {
        db.all("SELECT roleCommand, roleID, type FROM roles WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) {
                console.log(err);
            } else {
                if (!rows || rows.length < 1) {
                    callback("No role commands/names paired on this server.")
                } else {
                    var guild = client.guilds.get(guild_id);
                    var main_roles = [];
                    var sub_roles = [];
                    var other_roles = [];
                    rows.forEach(row => {
                        command = row.roleCommand;
                        name = guild.roles.get(row.roleID).name;
                        switch (row.type) {
                            case "MAIN": main_roles.push(`${command}: ${name}`); break;
                            case "SUB": sub_roles.push(`${command}: ${name}`); break;
                            case "OTHER": other_roles.push(`${command}: ${name}`); break;
                            default: console.log("Unexpected value for column: type"); break; 
                        }
                    })
                    main_roles = "__**Main Roles**__\n" + main_roles.join(" **|** ") + "\n";
                    sub_roles = "__**Sub Roles**__\n" + sub_roles.join(" **|** ") + "\n";
                    other_roles = "__**Other Roles**__\n" + other_roles.join(" **|** ") + "\n";
                    var list = [main_roles, sub_roles, other_roles].join("\n");
                    callback(list);
                }
            }
        })
    }

    get_role = (role_command, guild_id, type, callback) => {
        type = type.toUpperCase();
        db.get("SELECT roleID FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command, guild_id, type], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (row) {
                    var guild = client.guilds.get(guild_id);
                    var role_id = row.roleID;
                    var role_name = guild.roles.get(role_id);
                    callback(role_id, role_name);
                } else {
                    callback(undefined);
                }
            }
        })
    }

    add_role = (role_command, role_id, role_name, guild_id, type, callback) => {
        type = type.toUpperCase();
        db.get("SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (row) {
                    callback(undefined, role_command);
                } else {
                    db.run("INSERT INTO roles VALUES (?, ?, ?, ?, ?)", [role_command.toLowerCase(), role_id, role_name, guild_id, type], (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            callback(role_command, undefined);
                        }
                    })
                }
            }
        })
    }

    remove_role = (role_command, guild_id, type, callback) => {
        type = type.toUpperCase();
        db.get("SELECT roleCommand FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (!row) {
                    callback(undefined, role_command);
                } else {
                    db.run("DELETE FROM roles WHERE roleCommand = ? AND guildID = ? AND type = ?", [role_command.toLowerCase(), guild_id, type], (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            callback(role_command, undefined);
                        }
                    })
                }
            }
        })
    }

    available_role_toggle = (role_name, guild_id, type, callback) => {
        type = type.toUpperCase();
        db.get("SELECT * FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?", [role_name, guild_id, type], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (row) {
                    db.run("DELETE FROM availableRoles WHERE roleName = ? AND guildID = ? AND type = ?", [role_name, guild_id, type], (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            callback(undefined, role_name);
                        }
                    })
                } else {
                    db.run("INSERT INTO availableRoles VALUES (?, ?, ?)", [role_name, guild_id, type], (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            callback(role_name, undefined);
                        }
                    })
                }
            }
        })
    }

    get_available_roles = (guild_id, callback) => {
        db.all("SELECT roleName, type FROM availableRoles WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) {
                console.log(err);
            } else {
                callback(rows);
            }
        })
    }

    set_roles_channel = (channel_id, guild_id, callback) => {
        db.get("SELECT channelID FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (row) {
                    callback("Error: Roles channel already assigned in this server.");
                } else {
                    var channel = client.channels.get(channel_id);
                    var guild = client.guilds.get(guild_id);
                    get_available_roles(guild_id, rows => {
                        var msg_obj;
                        promise = new Promise((resolve, reject) => {
                            if (rows) {
                                var main_roles = [];
                                var sub_roles = [];
                                var other_roles = [];
                                rows.forEach((row) => {
                                    switch (row.type) {
                                        case "MAIN": main_roles.push(`\`${row.roleName}\``); break;
                                        case "SUB": sub_roles.push(`\`${row.roleName}\``); break;
                                        case "OTHER": other_roles.push(`\`${row.roleName}\``); break;
                                        default: console.log("Unexpected value for column: type"); break; 
                                    }
                                })
                                main_roles = main_roles.join(", ");
                                sub_roles = sub_roles.join(", ");
                                other_roles = other_roles.join(", ");
    
                                var embed = new discord.RichEmbed();
                                var field_count = 0;
                                if (main_roles.length > 1) embed.addField("Main Roles", main_roles, false); field_count += 1;
                                if (sub_roles.length > 1) embed.addField("Sub Roles", sub_roles, false); field_count += 1;
                                if (other_roles.length > 1) embed.addField("Other Roles", other_roles, false); field_count += 1;
                                if (field_count > 0) {
                                    embed.setTitle("__Available Roles__");
                                    colour = 0xFFFFFF;
                                    guild.fetchMember(client.user.id).then(sender => {
                                        if (sender && sender.roles) {
                                            colour = sender.colorRole.color;
                                        }
                                        embed.setColor(colour);
                                        msg_obj = {embed: embed}
                                        resolve();
                                    });
                                }
                            } else {
                                resolve();
                            }
                        })

                        promise.then(() => {
                            get_channel_msg(guild_id, msg => {
                                if (msg) {
                                    channel.send(msg, msg_obj)
                                    .then(msg => {
                                        db.run("INSERT INTO rolesChannels VALUES (?, ?, ?)", [channel_id, msg.id, guild_id], (err) => {
                                            if (err) {
                                                console.log(err)
                                            } else {
                                                callback(`<#${channel_id}> will now allow role assignment.`);
                                            }
                                        })
                                    })
                                } else {
                                    callback("No roles channel message assigned.")
                                }
                            })
                        })
                    })
                }
            }
        })
    }

    remove_roles_channel = (guild_id, callback) => {
        db.get("SELECT channelID, messageID FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (!row) {
                    callback("Error: No roles assignment channel exists on this server.");
                } else {
                    db.run("DELETE FROM rolesChannels WHERE guildID = ?", [guild_id], (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            var message_id = row.messageID;
                            var channel_id = row.channelID;
                            var channel = client.channels.get(channel_id);
                            channel.fetchMessage(message_id).then(msg => msg.delete()).catch(() => {});
                            callback(`<#${channel_id}> will no longer allow role assignment.`);
                        }
                    })
                }
            }
        })
    }

    update_roles_channel = (guild_id, callback) => {
        db.get("SELECT messageID, channelID FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
            if (err) {
                console.log(err);
            } else {
                if (row) {
                    var channel_id = row.channelID;
                    var message_id = row.messageID;
                    var channel = client.channels.get(channel_id);
                    var guild = client.guilds.get(guild_id);
                    get_available_roles(guild_id, rows => {
                        var msg_obj = {};
                        promise = new Promise((resolve, reject) => {
                            if (rows) {
                                var main_roles = [];
                                var sub_roles = [];
                                var other_roles = [];
                                rows.forEach((row) => {
                                    switch (row.type) {
                                        case "MAIN": main_roles.push(`\`${row.roleName}\``); break;
                                        case "SUB": sub_roles.push(`\`${row.roleName}\``); break;
                                        case "OTHER": other_roles.push(`\`${row.roleName}\``); break;
                                        default: console.log("Unexpected value for column: type"); break; 
                                    }
                                })
                                main_roles = main_roles.join(", ");
                                sub_roles = sub_roles.join(", ");
                                other_roles = other_roles.join(", ");
    
                                var embed = new discord.RichEmbed();
                                var field_count = 0;
                                if (main_roles.length > 1) embed.addField("Main Roles", main_roles, false); field_count += 1;
                                if (sub_roles.length > 1) embed.addField("Sub Roles", sub_roles, false); field_count += 1;
                                if (other_roles.length > 1) embed.addField("Other Roles", other_roles, false); field_count += 1;
                                if (field_count > 0) {
                                    embed.setTitle("__Available Roles__");
                                    colour = 0xFFFFFF;
                                    guild.fetchMember(client.user.id).then(sender => {
                                        if (sender && sender.roles) {
                                            colour = sender.colorRole.color;
                                        }
                                        embed.setColor(colour);
                                        msg_obj = {embed: embed}
                                        resolve();
                                    });
                                }
                            } else {
                                resolve()
                            }
                        });

                        promise.then(() => {
                            get_channel_msg(guild_id, msg => {
                                if (msg) {
                                    channel.fetchMessage(message_id).then(channel_msg => {
                                        channel_msg.delete();
                                        channel.send(msg, msg_obj).then(msg => {
                                            db.run("UPDATE rolesChannels SET messageID = ? WHERE guildID = ?", [msg.id, guild_id], (err) => {
                                                if (err) {
                                                    console.log(err)
                                                } else {
                                                    callback(`<#${channel_id}> updated.`);
                                                }
                                            })
                                        })
                                    })
                                } else {
                                    callback("No roles channel message assigned.")
                                }
                            })
                        })
                    }) 
                }
            }
        })
    }

    get_roles_channel = (guild_id) => {
        return new Promise((resolve, reject) => {
            return db.get("SELECT channelID FROM rolesChannels WHERE guildID = ?", [guild_id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        resolve(row.channelID);
                    } else {
                        resolve();
                    }
                }
            })
        })
    }

}