//Require modules

const discord = require("discord.js");
const client = require("../haseul").client;
const database = require("../modules/roles_database");

//Functions

handle = async (message) => {

    var args = message.content.trim().split(" ");

    //Get server role channel

    roles_channel_id = await database.get_roles_channel(message.guild.id);

    if (message.channel.id === roles_channel_id) {
        assign_roles(message);
        return;
    }

    //Handle commands

    let perms = ["ADMINISTRATOR", "MANAGE_GUILD", "VIEW_AUDIT_LOG"];
    if (!perms.some(p => message.member.hasPermission(p))) return;

    switch (args[0]) {

        //Role pairs

        case ".roles":
            switch (args[1]) {

                case "add":
                    message.channel.startTyping();
                    add_role(message, args.slice(2)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    })
                    break;

                case "remove":
                case "delete":
                case "del":
                    message.channel.startTyping();
                    remove_role(message, args.slice(2)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    })
                    break;

                case "list":
                    message.channel.startTyping();
                    list_roles(message).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    })
                    break;

                //Roles channel

                case "channel":
                    switch (args[2]) {

                        case "set":
                            message.channel.startTyping();
                            set_roles_channel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping(true);
                            })
                            break; 

                        case "remove":
                        case "delete":
                        case "del":
                            message.channel.startTyping();
                            remove_roles_channel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping(true);
                            })
                            break;

                        case "update":
                            message.channel.startTyping();
                            update_roles_channel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping(true);
                            })
                            break;

                        //Channel message
                        
                        case "message":
                        case "msg":
                            switch (args[3]) {
                                case "set":
                                    message.channel.startTyping();
                                    set_roles_channel_msg(message, args.slice(4)).then(response => {
                                        message.channel.send(response);
                                        message.channel.stopTyping(true);
                                    })
                                    break;
                            }
                            break;
                    }
                    break;
            }
            break;

        //Available roles

        case ".avarole":
            message.channel.startTyping();
            toggle_available_role(message, args.slice(1)).then(response => {
                message.channel.send(response);
                message.channel.stopTyping(true);
            })    
    }
}

roles_response = (responses) => {
    var list = [];
    for (let [key, val] of Object.entries(responses)) {
        if (val.length > 0) list.push(`**${key}**: ${val.join(", ")}`)
    }
    return list.join("\n");
}

roles_embed = (responses) => {
    var embed = new discord.RichEmbed();
    for (let [key, val] of Object.entries(responses)) {
        if (val.length > 0) embed.addField(key, val.join(", "), inline=false);
    }
    return embed;
}

//Allows members to self-assign roles

assign_roles = async (message) => {

    //Safety net

    message.delete(10000).catch(() => {});

    //Process commands

    var args = message.content.trim().split(" ");
    if (args.length < 2) {message.delete(timeout=1000).catch(() => {}); return;}
    var prefix = message.content.trim().match(/^(?:\+|\-)\s*(main|sub|other)/i);
    if (!prefix) {
        message.reply("Invalid formatting. Please read the instructions above.").then(reply => {
            reply.delete(4000).catch(() => {});
            message.delete(4000).catch(() => {});
        }) 
        return;
    }
    var modifier = prefix[0][0]; 
    var type = prefix[1];
    var role_commands = message.content.slice(message.content.indexOf(type) + type.length).split(",");
    var roles_to_process = [];
    var roles_successful = [];
    var roles_unsuccessful = [];
    var errors = [];
    
    var member;
    if (message.member) {
        member = message.member;
    } else {
        member = await message.guild.fetchMember(message.author.id);
    }

    //Parse role commands

    for (i = 0; i < role_commands.length; i++) {
        let role_command = role_commands[i].trim();
        let role_id = await database.get_role(role_command, message.guild.id, type);
        let role = message.guild.roles.get(role_id);
        var colour;

        //Process role

        if (role) {
            if (!colour) colour = role.color;

            switch (modifier) {
                
                case "+":
                    if (member.roles.has(role_id) && !roles_unsuccessful.includes(role)) {
                        roles_unsuccessful.push(role);
                    } else if (!member.roles.has(role_id) && !roles_successful.includes(role)) {
                        roles_to_process.push(role_id);
                        roles_successful.push(role);
                    }
                    break;

                case "-":
                    if (!member.roles.has(role_id) && !roles_unsuccessful.includes(role)) {
                        roles_unsuccessful.push(role);
                    } else if (member.roles.has(role_id) && !roles_successful.includes(role)) {
                        roles_to_process.push(role_id);
                        roles_successful.push(role);
                    }
                    break;

                default:
                    return;
                    break;

            }
        } else {
            errors.push(`"${role_command}"`);
        }
    }
    if (!colour) colour = 0xFFFFFF;

    //Add/Remove roles

    switch (modifier) {

        case "+":
            member.addRoles(roles_to_process)
            //Respond
            var responses = {"Assigned Roles": roles_successful, "Current Roles": roles_unsuccessful, "Invalid Roles": errors};
            var embed = roles_embed(responses);
            embed.setColor(colour);
            message.reply({embed: embed}).then(reply => {
                reply.delete(embed.fields.length * 2000 + 2000)
                message.delete(embed.fields.length * 2000 + 2000)
            })
            break;

        case "-":
            member.removeRoles(roles_to_process)
            //Respond
            var responses = {"Removed Roles": roles_successful, "Roles Not Assigned": roles_unsuccessful, "Invalid Roles": errors};
            var embed = roles_embed(responses);
            embed.setColor(colour);
            message.reply({embed: embed}).then(reply => {
                reply.delete(embed.fields.length * 2000 + 2000)
                message.delete(embed.fields.length * 2000 + 2000)
            })
            break;
        
        default:
            return;
            break;

    }

}

//-----------------------------------------------

add_role = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 2) {
            resolve("\\⚠ Missing arguments.\nUsage: .roles add [role type] [role command]: [role name]");
            return
        }
        var type = args[0]
        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
            resolve("\\⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other");
            return
        }
        var roles_text = args.slice(1).join(" ");
        var pairs = roles_text.split(",")
        var errors = [];
        var roles_added = [];
        var roles_exist = [];
    
        for (i = 0; i < pairs.length; i++) {
            let pair = pairs[i].trim();
            if (!pair.includes(":")) {
                errors.push(pair);
                continue;
            }
            var roles = pair.split(":", 2);
            var role_command = roles[0].trim();
            var role_name = roles[1].trim();
            var role = message.guild.roles.find("name", role_name);
            if (role_command.length < 1 || role_name.length < 1) {
                errors.push(role_command);
            } else if (!role || !message.guild.roles.has(role.id)) {
                errors.push(role_command);
            } else {
                var role_id = message.guild.roles.find("name", role_name).id
                added = await database.add_role(role_command, role_id, role_name, message.guild.id, type)
                if (added) {
                    roles_added.push(role_name);
                } else {
                    roles_exist.push(role_name);
                }
            }
        }
        var responses = {"Role commands added": roles_added, "Role commands already paired": roles_exist, "Errors": errors}
        responses = roles_response(responses);
        resolve(responses);
    })
}

remove_role = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 2) {
            resolve("\\⚠ Missing arguments.\nUsage: .roles remove [role type] [role command]");
            return
        }
        var type = args[0];
        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
            resolve("\\⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other");
            return
        }
        var roles_text = args.slice(1).join(" ");
        var role_commands = roles_text.split(",")
    
        var roles_removed = [];
        var roles_nonexistent = [];
        var errors = [];
        
        for (i = 0; i < role_commands.length; i++) {
            let role_command = role_commands[i].trim();
            if (role_command.length < 1) {
                errors.push(role_command);
            } else {
                let removed = await database.remove_role(role_command, message.guild.id, type)
                if (removed) {
                    roles_removed.push(role_command);
                } else {
                    roles_nonexistent.push(role_command);
                }
            }
        }
        var responses = {"Role commands removed": roles_removed, "Role commands nonexistent": roles_nonexistent, "Errors": errors}
        responses = roles_response(responses);
        resolve(responses);
    })
}

list_roles = async (message) => {
    return new Promise(async (resolve, reject) => {
        var rows = await database.get_all_roles(message.guild.id);
        var guild = message.guild
        var main_roles = [];
        var sub_roles = [];
        var other_roles = [];
        for (i = 0; i < rows.length; i++) {
            let row = rows[i];
            command = row.roleCommand;
            name = guild.roles.get(row.roleID).name;
            switch (row.type) {
                case "MAIN": main_roles.push(`${command}: ${name}`); break;
                case "SUB": sub_roles.push(`${command}: ${name}`); break;
                case "OTHER": other_roles.push(`${command}: ${name}`); break;
                default: console.error("Unexpected value for column: type"); break; 
            }
        }
        main_roles = "__**Main Roles**__\n" + main_roles.join(" **|** ") + "\n";
        sub_roles = "__**Sub Roles**__\n" + sub_roles.join(" **|** ") + "\n";
        other_roles = "__**Other Roles**__\n" + other_roles.join(" **|** ") + "\n";
        var list = [main_roles, sub_roles, other_roles].join("\n");
        resolve(list);
    })
}

set_roles_channel = (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 1) {
            var channel_id = message.channel.id;
        } else {
            var channel_id = args[0].match(/<?#?!?(\d+)>?/);
            if (!channel_id) {
                resolve("\\⚠ Invalid channel or channel ID.")
                return
            } else {
                channel_id = channel_id[1]
            }
        }
        if (!message.guild.channels.has(channel_id)) {
            resolve("\\⚠ Channel doesn't exist in this server.")
            return
        } else {
            database.set_roles_channel(channel_id, message.guild.id).then(res => {
                resolve(res);
            })
        }
    })
}

remove_roles_channel = (message, args) => {
    return new Promise(async (resolve, reject) => {
        var guild_id;
        if (args.length < 1) {
            guild_id = message.guild.id;
        } else {
            if (args[0].match(/^\d+$/)) {
                if (client.guilds.has(args[0])) {
                    guild_id = args[0];
                } else {
                    resolve("Invalid server ID.");
                }
            } else {
                resolve("Not a server ID.");
            } 
        }        
        database.remove_roles_channel(guild_id).then(res => {
            resolve(res);
        })
    })
}

update_roles_channel = (message, args) => {
    return new Promise(async (resolve, reject) => {
        var guild_id;
        if (args.length < 1) {
            guild_id = message.guild.id;
        } else {
            if (args[0].match(/^\d+$/)) {
                if (client.guilds.has(args[0])) {
                    guild_id = args[0];
                } else {
                    resolve("Invalid server ID.");
                }
            } else {
                resolve("Not a server ID.");
            } 
        } 
        database.update_roles_channel(guild_id).then(res => {
            resolve(res);
        })
    })
}

set_roles_channel_msg = (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 1) {
            resolve("Please provide a message.");
            return;
        }
        var channel_message = args.join(" ");
        database.set_channel_msg(message.guild.id, channel_message).then(res => {
            resolve(res);
        })
    })
}

toggle_available_role = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 2) {
            resolve("\\⚠ Missing arguments.\nUsage: .avarole [role type] [role name]");
            return
        }
        var type = args[0]
        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
            resolve("\\⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other");
            return
        }
        var roles_text = args.slice(1).join(" ");
        var role_names = roles_text.split(",");
    
        var roles_added = [];
        var roles_removed = [];
        var errors = [];
    
        for (i = 0; i < role_names.length; i++) {
            let role_name = role_names[i];
            if (role_name.length < 1) {
                errors.push(role_name);
                resolve();
            } else {
                [added, removed] = await database.available_role_toggle(role_name, message.guild.id, type)
                if (added) {
                    roles_added.push(added);
                } else if (removed) {
                    roles_removed.push(removed);
                } else {
                    reject("Unknown error occurred toggling available roles")
                }
            }
        }
        var responses = {"Role names added": roles_added, "Role names removed": roles_removed, "Errors": errors}
        responses = roles_response(responses);
        resolve(responses);
    })
}

module.exports = {
    handle: handle
}
