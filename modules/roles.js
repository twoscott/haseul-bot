const Discord = require("discord.js");
const { checkPermissions, embedPages, withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const { trimArgs } = require("../functions/functions.js");
const serverSettings = require("../utils/server_settings.js");

const database = require("../db_queries/roles_db.js");

exports.join = async function(member) {

    autorole(member)

}

exports.onMessage = async function(message) {

    roles(message);

}

exports.onCommand = async function(message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "autorole":
            switch (args[1]) {
                case "set":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, setAutorole, [message, args]);
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, toggleAutorole, [message]);
                    break;
                default:
                    message.channel.send(`Help with roles can be found here: https://haseulbot.xyz/#roles`);
                    break;
            }
            break;
        case "roles":
            switch (args[1]) {
                case "list":
                    withTyping(channel, roleslist, [message]);
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, toggleRoles, [message]);
                    break;
                case "add":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, add_role, [message, args]);
                    break;
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, remove_role, [message, args]);
                    break;
                case "message":
                case "msg":
                    switch (args[2]) {
                        case "set":
                        if (checkPermissions(member, ["MANAGE_GUILD"]))
                            withTyping(channel, set_roles_msg, [message, args]);
                        break;
                    }
                    break;
                case "channel":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, set_roles_channel, [message, args.slice(3)]);
                            break;
                        case "update":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, update_roles_channel, [message]);
                            break;
                    }
                    break;
                case "pairs":
                    switch (args[2]) {
                        case "list":
                            if (checkPermissions(member, ["MANAGE_ROLES"]))
                                withTyping(channel, list_roles, [message]);
                            break;
                    }
                    break;
                case "help":
                default:
                    message.channel.send(`Help with roles can be found here: https://haseulbot.xyz/#roles`);
                    break;
            }
            break;
        case "avarole":
            perms = ["ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_ROLES"];
            if (!message.member) message.member = await message.guild.members.fetch(message.author.id);
            if (!perms.some(p => message.member.hasPermission(p))) break;
            if (checkPermissions(member, ["MANAGE_ROLES"]))
                withTyping(channel, toggle_available_role, [message, args]);
            break;
        case "biaslist":
            withTyping(channel, biaslist, [message]);
            break;
        case "bias":
            switch (args[1]) {
                case "list":
                    withTyping(channel, biaslist, [message]);
                    break;
            }
            break;

    }
}

async function autorole(member) {
    let autoroleOn = serverSettings.get(member.guild.id, "autoroleOn");
    if (!autoroleOn) return;
    let role = serverSettings.get(member.guild.id, "autoroleID");
    if (!member.guild.roles.cache.has(role)) return;
    if (role) member.roles.add(role);
}

async function roles(message) {
    let rolesOn = serverSettings.get(message.guild.id, "rolesOn");
    if (!rolesOn) return;
    let rolesChannelID = serverSettings.get(message.guild.id, "rolesChannel");
    if (rolesChannelID == message.channel.id) assign_roles(message); //Assign roles if in roles channel
}

function roles_response(responses) {
    let list = [];
    for (let [key, val] of Object.entries(responses)) {
        if (val.length > 0) list.push(`**${key}**: ${val.join(", ")}`)
    }
    return list.join("\n");
}

function roles_embed(responses) {
    let embed = new Discord.MessageEmbed();
    for (let [key, val] of Object.entries(responses)) {
        if (val.length > 0) embed.addField(key, val.join(", "), false);
    }
    return embed;
}

// Allows members to self-assign roles

async function assign_roles(message) {

    // Safety net
    
    message.delete({ timeout: 10000 }).catch(() => {});

    // Process commands

    let args = message.content.trim().split(" ");
    if (args.length < 2) {message.delete({ timeout: 1000 }).catch(() => {}); return;}
    let prefix = message.content.trim().match(/^(?:\+|\-)\s*(main|sub|other)/i);
    if (!prefix) {
        message.reply("Invalid formatting. Please read the instructions above.").then(reply => {
            reply.delete({ timeout: 4000 }).catch(() => {});
            message.delete({ timeout: 4000 }).catch(() => {});
        }) 
        return;
    }
    let modifier = prefix[0][0]; 
    let type = prefix[1];
    let role_commands = message.content.slice(message.content.indexOf(type) + type.length).split(",");
    let roles_to_process = [];
    let roles_successful = [];
    let roles_unsuccessful = [];
    let errors = [];
    
    let member;
    if (message.member) {
        member = message.member;
    } else {
        member = await message.guild.members.fetch(message.author.id);
    }

    // Parse role commands

    let colour;
    for (i = 0; i < role_commands.length; i++) {
        let role_command = role_commands[i].trim();
        let role_id = await database.get_role_id(role_command, message.guild.id, type);
        let role;
        if (role_id) {
            role = await message.guild.roles.fetch(role_id);
        }

        // Process role

        if (role) {
            if (!colour) colour = role.color;

            switch (modifier) {
                
                case "+":
                    if (member.roles.cache.has(role_id) && !roles_unsuccessful.includes(role)) {
                        roles_unsuccessful.push(role);
                    } else if (!member.roles.cache.has(role_id) && !roles_successful.includes(role)) {
                        roles_to_process.push(role_id);
                        roles_successful.push(role);
                    }
                    break;

                case "-":
                    if (!member.roles.cache.has(role_id) && !roles_unsuccessful.includes(role)) {
                        roles_unsuccessful.push(role);
                    } else if (member.roles.cache.has(role_id) && !roles_successful.includes(role)) {
                        roles_to_process.push(role_id);
                        roles_successful.push(role);
                    }
                    break;

            }
        } else {
            errors.push(`"${role_command}"`);
        }
    }
    if (!colour) colour = 0xffffff;

    // Add/Remove roles

    switch (modifier) {

        case "+":
            member.roles.add(roles_to_process)
            // Respond
            var responses = {"Assigned Roles": roles_successful, "Current Roles": roles_unsuccessful, "Invalid Roles": errors};
            var embed = roles_embed(responses);
            embed.setColor(colour);
            message.reply({embed: embed}).then(reply => {
                reply.delete({ timeout: embed.fields.length * 2000 + 2000 })
                message.delete({ timeout: embed.fields.length * 2000 + 2000 })
            })
            break;

        case "-":
            member.roles.remove(roles_to_process)
            // Respond
            var responses = {"Removed Roles": roles_successful, "Roles Not Assigned": roles_unsuccessful, "Invalid Roles": errors};
            var embed = roles_embed(responses);
            embed.setColor(colour);
            message.reply({embed: embed}).then(reply => {
                reply.delete({ timeout: embed.fields.length * 2000 + 2000 })
                message.delete({ timeout: embed.fields.length * 2000 + 2000 })
            })
            break;

    }

}

//-----------------------------------------------

async function create_avarole_embed(message) {

    let guild = Client.guilds.cache.get(message.guild.id);
    let sender = await guild.members.fetch(Client.user.id);
    let role_rows = await database.get_available_roles(message.guild.id);
    if (!role_rows || !role_rows.length) return;

    let main_roles = [];
    let sub_roles = [];
    let other_roles = [];
    for(i = 0; i < role_rows.length; i++) {
        let row = role_rows[i];
        switch (row.type) {
            case "MAIN": main_roles.push(`\`${row.roleName}\``); break;
            case "SUB": sub_roles.push(`\`${row.roleName}\``); break;
            case "OTHER": other_roles.push(`\`${row.roleName}\``); break; 
        }
    }

    let embed = new Discord.MessageEmbed({
        title: "__Available Roles__",
        color: sender && sender.roles.color ? sender.roles.color.color : 0xffffff
    });
    if (main_roles.length) embed.addField("Main Roles", main_roles.join(", "), false);
    if (sub_roles.length) embed.addField("Sub Roles", sub_roles.join(", "), false);
    if (other_roles.length) embed.addField("Other Roles", other_roles.join(", "), false);
    return embed;

}


async function add_role(message, args) {

    if (args.length < 4) {
        message.channel.send(`⚠ Missing arguments.\nUsage: .roles add [role type] [role command]: [role name]`);
        return;
    }
    let type = args[2]
    if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
        message.channel.send(`⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other`);
        return;
    }

    let roles_text = trimArgs(args, 3, message.content);
    let pairs = roles_text.split(",");
    let errors = [];
    let roles_added = [];
    let roles_exist = [];

    for (i = 0; i < pairs.length; i++) {
        let pair = pairs[i].trim();
        if (!pair.includes(":")) {
            errors.push(pair);
            continue;
        }
        let roles = pair.split(":", 2);
        let role_command = roles[0].trim();
        let role_name = roles[1].trim();
        let role = message.guild.roles.cache.find(role => role.name == role_name);
        if (role_command.length < 1 || role_name.length < 1) {
            errors.push(role_command);
        } else if (!role || !message.guild.roles.cache.has(role.id)) {
            errors.push(role_command);
        } else {
            let role_id = role.id
            added = await database.add_role(role_command, role_id, role_name, message.guild.id, type)
            if (added) {
                roles_added.push(role_name);
            } else {
                roles_exist.push(role_name);
            }
        }
    }

    message.channel.send(roles_response({
        "Role commands added": roles_added, 
        "Role commands already paired": roles_exist, 
        "Errors": errors
    }));

}

async function remove_role(message, args) {

    if (args.length < 4) {
        message.channel.send(`⚠ Missing arguments.\nUsage: .roles remove [role type] [role command]`);
        return;
    }
    let type = args[2];
    if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
        message.channel.send(`⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other`);
        return;
    }
    
    let roles_text = trimArgs(args, 3, message.content);
    let role_commands = roles_text.split(",");

    let roles_removed = [];
    let roles_nonexistent = [];
    let errors = [];
    
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

    message.channel.send(roles_response({
        "Role commands removed": roles_removed, 
        "Role commands nonexistent": roles_nonexistent, 
        "Errors": errors
    }));

}

async function toggle_available_role(message, args) {

    if (args.length < 3) {
        message.channel.send(`⚠ Missing arguments.\nUsage: .avarole [role type] [role name]`);
        return;
    }
    let type = args[1]
    if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
        message.channel.send(`⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other`);
        return;
    }
    let roles_text = trimArgs(args, 2, message.content);
    let role_names = roles_text.split(",");

    let roles_added = [];
    let roles_removed = [];
    let errors = [];

    for (i = 0; i < role_names.length; i++) {
        let role_name = role_names[i].trim();
        if (role_name.length < 1) {
            break;            
        } else {
            [added, removed] = await database.available_role_toggle(role_name, message.guild.id, type)
            if (added) {
                roles_added.push(added);
            } else if (removed) {
                roles_removed.push(removed);
            } else {
                console.error(new Error("Unknown error occurred toggling available roles"))
            }
        }
    }

    message.channel.send(roles_response({
        "Role names added" : roles_added, 
        "Role names removed": roles_removed, 
        "Errors": errors
    }));

}

async function list_roles(message) {

    let rows = await database.get_all_roles(message.guild.id);
    let guild = message.guild
    let main_roles = [];
    let sub_roles = [];
    let other_roles = [];
    for (i = 0; i < rows.length; i++) {
        let row = rows[i];
        command = row.roleCommand;
        name = guild.roles.cache.get(row.roleID).name;
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
    let list = [main_roles, sub_roles, other_roles].join("\n");
    message.channel.send(list);

}


async function set_roles_channel(message, args) {

    let channel_id;
    if (args.length < 1) {
        channel_id = message.channel.id;
    } else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            message.channel.send(`⚠ Invalid channel or channel ID.`);
            return;
        }
        channel_id = channel_id[1];
    }
    if (!message.guild.channels.cache.has(channel_id)) {
        message.channel.send(`⚠ Channel doesn't exist in this server.`);
        return;
    }
    
    let data = await database.get_roles_msg(message.guild.id);
    if (!data || !data.msg) {
        message.channel.send(`⚠ No roles channel message assigned.`);
        return;
    }

    let channel = Client.channels.cache.get(channel_id);
    let embed = await create_avarole_embed(message);
    let msg = await channel.send(data.msg, {embed: embed});
    if (data && data.messageID) {
        let rolesChannel = serverSettings.get(message.guild.id, "rolesChannel");
        if (rolesChannel) {
            let channel = Client.channels.cache.get(rolesChannel);
            if (channel) {
                channel.messages.fetch(data.messageID).then(msg => msg.delete());
            }
        }
    }

    await database.set_msg_id(message.guild.id, msg.id)
    await serverSettings.set(message.guild.id, "rolesChannel", channel_id);
    message.channel.send(`Roles channel set to <#${channel_id}>.`);

}

async function update_roles_channel(message) {

    let data = await database.get_roles_msg(message.guild.id);
    if (!data || !data.msg) {
        message.channel.send(`⚠ No roles channel message assigned.`);
        return;
    }

    let message_id = data.messageID;
    let content = data.msg;
    let channel_id = serverSettings.get(message.guild.id, "rolesChannel");
    let channel = Client.channels.cache.get(channel_id);
    let embed = await create_avarole_embed(message);
    
    let old_message = await channel.messages.fetch(message_id);
    old_message.delete();
    let msg = await channel.send(content, {embed: embed});
    await database.set_msg_id(message.guild.id, msg.id);
    message.channel.send(`Roles channel message updated.`);

}


async function set_roles_msg(message, args) {

    if (args.length < 4) {
        message.channel.send(`⚠ Please provide a message.`);
        return;
    }
    
    let msg = trimArgs(args, 3, message.content);
    await database.set_roles_msg(message.guild.id, msg);
    message.channel.send(`Roles message set.`);

}

async function setAutorole(message, args) {

    if (args.length < 1) {
        message.channel.send(`⚠ Please provide a role name.`);
        return;
    }

    let roleName = trimArgs(args, 2, message.content);
    let role = message.guild.roles.cache.find(role => role.name == roleName);
    if (!role) {
        message.channel.send(`⚠ This role does not exist on the server!`);
        return;
    }

    serverSettings.set(message.guild.id, "autoroleID", role.id);
    message.channel.send(`Autorole set to \`${role.name}\`.`);
    
}

// Toggle

async function toggleAutorole(message) {

    let tog = await serverSettings.toggle(message.guild.id, "autoroleOn");
    message.channel.send(`Autorole turned ${tog ? "on":"off"}.`);
    
}

async function toggleRoles(message) {

    let tog = await serverSettings.toggle(message.guild.id, "rolesOn");
    message.channel.send(`Roles assignment turned ${tog ? "on":"off"}.`);

}

async function biaslist(message) {

    let { guild } = message;

    let roleData = await database.get_all_roles(guild.id);
    if (roleData.length < 1) {
        message.channel.send(`⚠ No bias roles are set up on this server!`);
        return;
    }

    let guildRoles = guild.roles.cache.array().sort((a,b) => b.comparePositionTo(a)).slice(0,-1);
    
    let mainRoles = guildRoles.filter(role => {
        let dataMatch = roleData.find(data => data.roleID == role.id);
        if (!dataMatch) return false;
        if (dataMatch.type.toUpperCase() != 'MAIN') return false;
        return true;
    }).map(role => `${role} - ${role.members.size} member${role.members.size != 1 ? 's':''}`).join('\n');
    let subRoles = guildRoles.filter(role => {
        let dataMatch = roleData.find(data => data.roleID == role.id);
        if (!dataMatch) return false;
        if (dataMatch.type.toUpperCase() != 'SUB') return false;
        return true;
    }).map(role => `${role} - ${role.members.size} member${role.members.size != 1 ? 's':''}`).join('\n');
    
    if (mainRoles.length < 1 && subRoles.length < 1) {
        message.channel.send(`⚠ No bias roles are set up on this server!`);
        return;
    }
    if (mainRoles.length > 1024) {
        mainRoles = mainRoles.substring(0, 1024);
        mainRoles = mainRoles.substring(0, roles.lastIndexOf('>')+1);
        mainRoles += '.'.repeat(mainRoles.length > 1021 ? 1024-mainRoles.length : 3);
    }
    if (subRoles.length > 1024) {
        subRoles = subRoles.substring(0, 1024);
        subRoles = subRoles.substring(0, roles.lastIndexOf('>')+1);
        subRoles += '.'.repeat(subRoles.length > 1021 ? 1024-subRoles.length : 3);
    }


    let autoroleID = serverSettings.get(guild.id, "autoroleID");
    let autoroleColour = autoroleID ? guild.roles.cache.get(autoroleID, true).color : null;
    let embed = new Discord.MessageEmbed({
        title: `Bias List for ${guild.name}`,
        fields: [],
        color: autoroleColour || 0xf986ba
    });

    if (mainRoles) embed.fields.push({ name: 'Main Biases', value: mainRoles });
    if (subRoles) embed.fields.push({ name: 'Sub Biases', value: subRoles });

    message.channel.send({ embed });

}

async function roleslist(message) {

    let { guild } = message;

    let guildRoles = guild.roles.cache.array().sort((a,b) => b.comparePositionTo(a)).slice(0,-1);
    if (guildRoles.length < 1) {
        message.channel.send(`⚠ This server has no roles to list!`);
        return;
    }

    let roleString = guildRoles.map(role => `${role} - ${role.members.size} member${role.members.size != 1 ? 's':''} \`${role.hexColor.toUpperCase()}\``).join('\n');

    let descriptions = [];
    while (roleString.length > 1024 || roleString.split('\n').length > 30) {
        let currString = roleString.slice(0, 1024);

        let lastIndex = 0;
        for (let i = 0; i < 30; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        roleString = roleString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(roleString);

    let autoroleID = serverSettings.get(guild.id, "autoroleID");
    let autoroleColour = autoroleID ? guild.roles.cache.get(autoroleID).color : null;

    let pages = descriptions.map((desc, i) => {
        return {
            embed: {
                title: `Roles List for ${guild.name}`,
                description: desc,
                color: autoroleColour || 0xf986ba,
                footer: {
                    text: `Roles: ${guildRoles.length} | Page ${i+1} of ${descriptions.length}`
                }
            }
        }
    })

    embedPages(message, pages);

}
