const discord = require("discord.js");

module.exports = (client = discord.Client) => {

    require("../modules/database.js")(client);
    require("../modules/functions.js")(client);

    var emoji_dict = {"🕊": "🕊️"}
    replace_chars = (string, dict) => {
        for (const [key, val] of dict.entries()) {
            string = string.replace(key, val);
        }
        return string;
    }

    roles_response = (channel, prefix1, prefix2, errors_prefix, array1, array2, array3, callback) => {
        message = "";
        if (array1.length > 0) {
            message += ("\n" + prefix1 + array1.join(", "));
        }
        if (array2.length > 0) {
            message += ("\n" + prefix2 + array2.join(", "));
        }
        if (array3.length > 0) {
            message += ("\n" + errors_prefix + "\"" + array3.join("\", \"")) + "\"";
        }
        channel.stopTyping(true);

        if (message.length > 0) {
            channel.send(message).then(msg => {if (callback) callback(msg)}).catch(err => {console.log(err)})
        } else {
            channel.send("Unknown error occurred.")
        }
    }

    roles_response_embed = (channel, prefix1, prefix2, errors_prefix, array1, array2, array3, color=undefined, callback) => {
        var embed = new discord.RichEmbed();

        if (array1.length > 0) {
            embed.addField(prefix1, array1.join(", "), inline=false)
        }
        if (array2.length > 0) {
            embed.addField(prefix2, array2.join(", "), inline=false)
        }
        if (array3.length > 0) {
            embed.addField(errors_prefix, "\"" + array3.join("\", \"") + "\"", inline=false)
        }
        if (color) embed.setColor(color);
        channel.stopTyping(true);

        if (embed.fields.length > 0) {
            channel.send({embed: embed}).then(msg => {if (callback) callback(msg, embed.fields.length)}).catch(err => {console.log(err)})
        } else {
            channel.send("Unknown error occurred.")
        }
    }

    msgHandler = async (message) => {
        if (message.author.bot) return;
        // message.channel.send(`\`${message.content}\``)

        roles_channel_id = await get_roles_channel(message.guild.id);
        
        if (message.channel.id === roles_channel_id) {
            var args = message.content.trim().split(" ");
            if (args.length < 1) {message.delete(timeout=1000).catch(() => {}); return;}
            var prefix = message.content.trim().match(/^(?:\+|\-)\s*(main|sub|other)/i);
            if (!prefix) {
                message.channel.send("Invalid formatting. Please read the instructions above.").then(reply => {
                    reply.delete(4000).catch(() => {});
                    message.delete(4000).catch(() => {});
                }) 
                return;
            }
            message.delete(10000).catch(() => {});
            var modifier = prefix[0][0]; 
            var type = prefix[1];
            var role_commands = message.content.slice(message.content.indexOf(type) + type.length).split(",");

            var roles_to_process = [];
            var roles_successful = [];
            var roles_unsuccessful = [];
            var errors = [];
            var member;
            var colour;
            var colour_priority = 0;

            if (message.member) {
                member = message.member;
                console.log(new Date().toLocaleString() + "\n" + member.id + " " + member.displayName + ":");
            } else {
                member = await message.guild.fetchMember(message.author.id);
                console.log(new Date().toLocaleString() + "\nHad to fetch member: " + member.id + " " + member.displayName + ":");
            }
            
            (promise_loop = (i, array) => {
                if (i < array.length) {
                    new Promise((resolve, reject) => {
                        role_command = role_commands[i].trim();
                        if (/^\s*$/.test(role_command)) {resolve(); return;}
                        get_role(role_command.toLowerCase(), message.guild.id, type, (role_id, role_name) => {
                            if (modifier == "+") {
                                if (member.roles.has(role_id)) {
                                    if (2 > colour_priority) {
                                        colour = message.guild.roles.get(role_id).color;
                                        colour_priority = 2;
                                    }
                                    roles_unsuccessful.push(role_name);
                                } else if (role_id && role_name) {
                                    if (3 > colour_priority) {
                                        colour = message.guild.roles.get(role_id).color;
                                        colour_priority = 3;
                                    }
                                    if (!roles_to_process.includes(role_id)) {
                                        roles_to_process.push(role_id);
                                        roles_successful.push(role_name);
                                    }
                                } else {
                                    if (1 > colour_priority) {
                                        colour = undefined;
                                        colour_priority = 1;
                                    }
                                    errors.push(role_command);
                                }
                                resolve();
                            } if (modifier == "-") {
                                if (!member.roles.has(role_id) && role_id && role_name) {
                                    if (2 > colour_priority) {
                                        colour = message.guild.roles.get(role_id).color;
                                        colour_priority = 2;
                                    }
                                    roles_unsuccessful.push(role_name);   
                                } else if (role_id && role_name) {
                                    if (3 > colour_priority) {
                                        colour = message.guild.roles.get(role_id).color;
                                        colour_priority = 3;
                                    }
                                    if (!roles_to_process.includes(role_id)) {
                                        roles_to_process.push(role_id);
                                        roles_successful.push(role_name);
                                    }
                                } else {
                                    if (1 > colour_priority) {
                                        colour = undefined;
                                        colour_priority = 1;
                                    }
                                    errors.push(role_command);
                                }
                                resolve();
                            } else {
                                reject("Unrecognised modifier");
                            }
                        })
                    }).then(() => {promise_loop(i+1, role_commands)})
                    .catch(err => {
                        console.log(err); 
                        console.log("Unkown error occured processing roles.")
                        message.channel.send("Unkown error occured processing roles.").then(reply => {
                            reply.delete(4000).catch(() => {});
                            message.delete(4000).catch(() => {});
                        })
                    })
                } else {
                    if (roles_successful.length > 0 || roles_unsuccessful.length > 0 || errors.length > 0) {
                        if (modifier == "+") {
                            member.addRoles(roles_to_process);
                            roles_response_embed(message.channel, `Assigned Roles`, `Current Roles`, `Invalid Roles`, roles_successful, roles_unsuccessful, errors, colour=colour, (reply, fields) => {
                                embed = reply.embeds[0]
                                reply_msg = "";
                                for (field of embed.fields) {
                                    reply_msg += (field.name + ": " + field.value + "\n")
                                }
                                console.log("Message: " + message.content + "\nReply: " + reply_msg + "\n\n");
                                reply.delete(2000 + (fields * 2000)).catch(() => {});
                                message.delete(2000 + (fields * 2000)).catch(() => {});
                            })
                        }
                        if (modifier == "-") {
                            member.removeRoles(roles_to_process);
                            roles_response_embed(message.channel, `Removed Roles`, `Roles Not Assigned`, `Invalid Roles`, roles_successful, roles_unsuccessful, errors, colour=colour, (reply, fields) => {
                                embed = reply.embeds[0]
                                reply_msg = "";
                                for (field of embed.fields) {
                                    reply_msg += (field.name + ": " + field.value + "\n")
                                }
                                console.log("Message: " + message.content + "\nReply: " + reply_msg + "\n\n");
                                reply.delete(2000 + (fields * 2000)).catch(() => {});
                                message.delete(2000 + (fields * 2000)).catch(() => {});
                            })
                        }
                    } else {console.log("didn't respond"); message.delete(4000).catch(() => {})}
                }
            })(0, role_commands)
        } else {
            if (message.content === ".ping" && message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) {
                message.channel.send("pong!");
            }

            if (message.content.startsWith(".sayraw")) {
                var args = message.content.trim().split(" ");
                if (args[0] != ".sayraw") return;
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
                if (message.author.id !== "125414437229297664") return;

                var channel_id = args[1].match(/<?#?!?(\d+)>?/);
                
                if (!channel_id) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Invalid channel or channel ID.");
                    return;
                }
                channel_id = channel_id[1];

                if (!client.channels.has(channel_id)) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Channel doesn't exist.");
                    return;
                }
                channel = client.channels.get(channel_id);
                text = args.slice(2).join(" ").replace(/^`+|`+$/g, '');
                attachments = [];
                message.attachments.forEach(attachment => {
                    attachments.push({attachment: attachment.url, name: attachment.filename});             
                });
                if (attachments.length < 1 && text.length < 1) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Cannot send an empty message.");
                    return;
                }

                channel.send(text, {files: attachments});
            } else if (message.content.startsWith(".say")) {
                var args = message.content.trim().split(" ");
                if (args[0] != ".say") return;
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
                if (message.author.id !== "125414437229297664") return;

                var channel_id = args[1].match(/<?#?!?(\d+)>?/);
                
                if (!channel_id) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Invalid channel or channel ID.");
                    return;
                }
                channel_id = channel_id[1];

                if (!client.channels.has(channel_id)) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Channel doesn't exist.");
                    return;
                }
                channel = client.channels.get(channel_id);
                text = args.slice(2).join(" ");
                attachments = [];
                message.attachments.forEach(attachment => {
                    attachments.push({attachment: attachment.url, name: attachment.filename});             
                });
                if (attachments.length < 1 && text.length < 1) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Cannot send an empty message.");
                    return;
                }

                channel.send(text, {files: attachments});
            }

            if (message.content.startsWith(".editraw")) {
                var args = message.content.trim().split(" ");
                if (args[0] != ".editraw") return;
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
                if (message.author.id !== "125414437229297664") return;

                let channel_id = args[1].match(/<?#?!?(\d+)>?/);
                
                if (!channel_id) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Invalid channel or channel ID.");
                    return;
                }
                channel_id = channel_id[1];

                if (!client.channels.has(channel_id)) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Channel doesn't exist.");
                    return;
                }
                channel = client.channels.get(channel_id);

                let message_id = args[2].match(/^\d+$/);

                if (!message_id) {
                    message.channel.stopTyping();
                    message.channel.send("Error: Invalid message ID.");
                    return;
                }

                let text = args.slice(3).join(" ").replace(/^`+|`+$/g, '');
                console.log(text)
                channel.fetchMessage(message_id).then(msg => {
                    msg.edit(text);
                }).catch(err => console.error(err))
            } else if (message.content.startsWith(".edit")) {
                var args = message.content.trim().split(" ");
                if (args[0] != ".edit") return;
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
                if (message.author.id !== "125414437229297664") return;

                let channel_id = args[1].match(/<?#?!?(\d+)>?/);
                
                if (!channel_id) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Invalid channel or channel ID.");
                    return;
                }
                channel_id = channel_id[1];

                if (!client.channels.has(channel_id)) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Channel doesn't exist.");
                    return;
                }
                channel = client.channels.get(channel_id);

                let message_id = args[2].match(/^\d+$/);

                if (!message_id) {
                    message.channel.stopTyping();
                    message.channel.send("Error: Invalid message ID.");
                    return;
                }

                let text = args.slice(3).join(" ");
                channel.fetchMessage(message_id).then(msg => {
                    msg.edit(text);
                }).catch(err => console.error(err))
            }

            if (message.content.startsWith(".embed")) {
                var args = message.content.trim().split(" ");
                if (args[0] != ".embed") return;
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
                if (message.author.id !== "125414437229297664") return;

                var channel_id = args[1].match(/<?#?!?(\d+)>?/);
                
                if (!channel_id) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Invalid channel or channel ID.");
                    return;
                }
                channel_id = channel_id[1];

                if (!client.channels.has(channel_id)) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Channel doesn't exist.");
                    return;
                }
                channel = client.channels.get(channel_id);
                text = args.slice(2).join(" ");
                try {
                    var json_text = JSON.parse(text);
                    var embed = new discord.RichEmbed(json_text);
                } catch (err) {
                    var embed = new discord.RichEmbed();
                    embed.description = text;
                }

                channel.send({embed: embed}).then(msg => {
                    message.channel.send(msg.embeds[0].color)
                });
            }

            if (message.content.startsWith(".sendtoall")) {
                var args = message.content.trim().split(" ");
                if (args[0] != ".sendtoall") return;
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
                if (message.author.id !== "125414437229297664") return;

                var guild_id = args[1];
                var pm_msg = args.slice(2).join(" ");

                var guild = client.guilds.get(guild_id);
                if (!guild) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Guild doesn't exist.");
                    return;
                }
                var pms_sent = 0;
                for (member of guild.members.array()) {
                    if (member.id != "341295978546200578" && member.id != "341295978546200578" && !member.user.bot) {
                        try {
                            dm_channel = await member.createDM();
                        } catch (e) {}
                        dm_channel.send(pm_msg).catch(() => {});
                        pms_sent += 1;
                    }
                }
                message.channel.send("Number of DMs sent: " + pms_sent);
            }

            if (message.content.startsWith(".roles")) {
                var args = message.content.trim().split(" ");
                if (args[0] != ".roles") return;
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
    
                switch (args[1]) {
                    case "channel":
                        switch (args[2]) {
                            case "message":
                            case "msg":
                                switch (args[3]) {
                                    case "set":
                                    if (args.length < 5) {
                                        message.channel.send("Please provide a message.");
                                        return;
                                    }
                                    var channel_message = args.slice(4).join(" ");
                                    set_channel_msg(message.guild.id, channel_message, res => {
                                        message.channel.send(res);
                                    })
                                }
                                break;
                            case "set":    
                                message.channel.startTyping();
                                if (args.length < 4) {
                                    var channel_id = message.channel.id;
                                } else {
                                    var channel_id = args[3].match(/<?#?!?(\d+)>?/);
                                    if (!channel_id) {
                                        message.channel.stopTyping(true);
                                        message.channel.send("Error: Invalid channel or channel ID.")
                                        return
                                    } else {
                                        channel_id = channel_id[1]
                                    }
                                }
                                if (!message.guild.channels.has(channel_id)) {
                                    message.channel.stopTyping(true);
                                    message.channel.send("Error: Channel doesn't exist in this server.")
                                    return
                                } else {
                                    set_roles_channel(channel_id, message.guild.id, res => {
                                        message.channel.stopTyping(true);
                                        message.channel.send(res);
                                    })
                                } 
                                break;      
                            case "remove":
                            case "delete":
                            case "del":                    
                                message.channel.startTyping();
                                var guild_id;
                                if (args.length > 3) {
                                    if (args[3].match(/^\d+$/)) {
                                        if (client.guilds.has(args[3])) {
                                            guild_id = args[3];
                                        } else {
                                            message.channel.stopTyping(true);
                                            message.channel.send("Invalid server ID.");
                                        }
                                    } else {
                                        message.channel.stopTyping(true);
                                        message.channel.send("Not a server ID.");
                                    }   
                                } else {
                                    guild_id = message.guild.id;
                                }        

                                remove_roles_channel(guild_id, res => {
                                    message.channel.stopTyping(true);
                                    message.channel.send(res);
                                })
                                break;
                            case "update":
                                var guild_id;
                                if (args.length > 3) {
                                    if (args[3].match(/^\d$/)) {
                                        if (client.guilds.has(args[3])) {
                                            guild_id = args[3];
                                        } else {
                                            message.channel.stopTyping(true);
                                            message.channel.send("Invalid server ID.");
                                        }
                                    } else {
                                        message.channel.stopTyping(true);
                                        message.channel.send("Not a server ID.");
                                    }   
                                } else {
                                    guild_id = message.guild.id;
                                }    
                                
                                update_roles_channel(guild_id, res => {
                                    message.channel.stopTyping(true);
                                    message.channel.send(res);
                                });
                                
                                
                            default:
                                message.channel.stopTyping(true);
                                break;
                        }
                        break;
    
                    case "add":
                        message.channel.startTyping();
                        if (args.length < 4) {
                            message.channel.stopTyping(true);
                            message.channel.send("Error: Missing arguments.\nUsage: .roles add [role type] [role command]: [role name]");
                            return
                        }
                        var type = args[2]
                        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
                            message.channel.stopTyping(true);
                            message.channel.send("Error: Role type not specified or role type isn't one of the following: Main, Sub, Other");
                            return
                        }
                        var roles_text = args.slice(3).join(" ");
                        var pairs = roles_text.split(",")
                        var errors = [];
                        var roles_added = [];
                        var roles_exist = [];

                        (promise_loop = (i, array) => {
                            if (i < array.length) {
                                new Promise((resolve, reject) => {
                                    pair = pairs[i].trim();
                                    if (!pair.includes(":")) {
                                        errors += 1;
                                    }
                                    var roles = pair.split(":", 2);
                                    var role_command = roles[0].trim();
                                    var role_name = roles[1].trim();
                                    if (role_command.length < 1 || role_name.length < 1) {
                                        errors.push(role_command);
                                        resolve();
                                    } else if (!message.guild.roles.exists("name", role_name)) {
                                        errors.push(role_command);
                                        resolve();
                                    } else {
                                        var role_id = message.guild.roles.find("name", role_name).id
                                        add_role(role_command, role_id, role_name, message.guild.id, type, (added, exists) => {
                                            if (added) {
                                                roles_added.push(added);
                                            } else if (exists) {
                                                roles_exist.push(exists);
                                            } else {
                                                reject("Unknown error adding roles")
                                            }
                                            resolve();
                                        }) 
                                    }
                                }).then(() => {promise_loop(i+1, pairs)})
                            } else {
                                message.channel.stopTyping(true);
                                roles_response(message.channel, "Role commands added: ", "Role commands already paired: ", "Errors: ", roles_added, roles_exist, errors);
                            }
                        })(0, pairs)
                        break;
                    case "remove":
                    case "delete":
                    case "del":
                        message.channel.startTyping();
                        if (args.length < 4) {
                            message.channel.stopTyping(true);
                            message.channel.send("Error: Missing arguments.\nUsage: .roles remove [role type] [role command]");
                            return
                        }
                        var type = args[2];
                        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
                            message.channel.stopTyping(true);
                            message.channel.send("Error: Role type not specified or role type isn't one of the following: Main, Sub, Other");
                            return
                        }
                        var roles_text = args.slice(3).join(" ");
                        var role_commands = roles_text.split(",")
    
                        var roles_removed = [];
                        var roles_nonexistent = [];
                        var errors = [];
                        
                        (promise_loop = (i, array) => {
                            if (i < array.length) {
                                new Promise((resolve, reject) => {
                                    role_command = role_commands[i].trim();
                                    if (role_command.length < 1) {
                                        errors.push(role_command);
                                        resolve();
                                    } else {
                                        remove_role(role_command, message.guild.id, type, (removed, nonexistent) => {
                                            if (removed) {
                                                roles_removed.push(removed);
                                            } else if (nonexistent) {
                                                roles_nonexistent.push(nonexistent);
                                            } else {
                                                reject("Unknown error occured removing roles")
                                            }
                                            resolve();
                                        })
                                    }
                                }).then(() => {promise_loop(i+1, role_commands)})
                            } else {
                                message.channel.stopTyping(true);
                                roles_response(message.channel, "Role commands removed: ", "Role commands nonexistent: ", "Errors: ", roles_removed, roles_nonexistent, errors);
                            }
                        })(0, role_commands)
                        break;
                    case "list":
                        get_all_roles(message.guild.id, res => {
                            message.channel.send(res);
                        })
                        break;
                    case "addtoall":
                        if (args.length < 3) {
                            message.channel.send("Error: Please enter a role name to add to all members.");
                            return;
                        }
                        var role_name = args.slice(2).join(" ");
                        if (!message.guild.roles.exists("name", role_name)) {
                            message.channel.send("Error: This role does not exist on the server.");
                            return;
                        }
                        message.channel.startTyping();
                        var role = message.guild.roles.find("name", role_name);
                        var roles_added = 0;
                        var msg = await message.channel.send(`${role_name} added to ${roles_added} members.`);
                        edit_loop = setInterval(() => {msg.edit(`${role_name} added to ${roles_added} members.`)}, 2000)
                        message.guild = await message.guild.fetchMembers();
                        for (let member of message.guild.members.values()) {
                            if (!member.roles.has(role.id)) {
                                await member.addRole(role);
                                roles_added += 1;
                            }
                        }
                        message.channel.stopTyping();
                        clearInterval(edit_loop);
                        msg.edit(`${role_name} added to ${roles_added} members.`);
                        break;
                    case "removefromall":
                        if (args.length < 3) {
                            message.channel.send("Error: Please enter a role name to add to all members.");
                            return;
                        }
                        var role_name = args.slice(2).join(" ");
                        if (!message.guild.roles.exists("name", role_name)) {
                            message.channel.send("Error: This role does not exist on the server.");
                            return;
                        }
                        message.channel.startTyping();
                        var role = message.guild.roles.find("name", role_name);
                        var roles_removed = 0;
                        message.guild = await message.guild.fetchMembers();
                        message.guild.members.forEach(member => {
                            if (member.roles.has(role.id)) {
                                member.removeRole(role);
                                roles_removed += 1;
                            }
                        })
                        message.channel.stopTyping();
                        message.channel.send(`${role_name} removed from ${roles_removed} members.`)       
                        break;                 
                    default: 
                        message.channel.stopTyping(true);
                        break;                    
    
                }            
            } else if (message.content.startsWith(".avarole")) {
                if (!message.member.hasPermission(["VIEW_AUDIT_LOG", "KICK_MEMBERS"])) return;
                var args = message.content.trim().split(" ");
                if (args[0] != ".avarole") return;
                message.channel.startTyping();
                
                if (args.length < 3) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Missing arguments.\nUsage: .avarole [role type] [role name]");
                    return
                }
                var type = args[1]
                if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
                    message.channel.stopTyping(true);
                    message.channel.send("Error: Role type not specified or role type isn't one of the following: Main, Sub, Other");
                    return
                }
                var roles_text = args.slice(2).join(" ");
                var role_names = roles_text.split(",");
    
                var roles_added = [];
                var roles_removed = [];
                var errors = [];

                (promise_loop = (i, array) => {
                    if (i < array.length) {
                        new Promise((resolve, reject) => {
                            role_name = role_names[i].trim();
                            if (role_name.length < 1) {
                                errors.push(role_name);
                                resolve();
                            } else {
                                available_role_toggle(role_name, message.guild.id, type, (added, removed) => {
                                    if (added) {
                                        roles_added.push(added);
                                    } else if (removed) {
                                        roles_removed.push(removed);
                                    } else {
                                        reject("Unknown error occurred toggling available roles")
                                    }
                                    resolve();
                                })
                            }
                        }).then(() => {promise_loop(i+1, role_names)})
                    } else {
                        message.channel.stopTyping(true);
                        roles_response(message.channel, "Role names added: ", "Role names removed: ", "Errors: ", roles_added, roles_removed, errors);
                    }
                })(0, role_names)
            }
        }
    }
}