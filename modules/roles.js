const Discord = require('discord.js');
const { checkPermissions, embedPages, withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const { trimArgs } = require('../functions/functions.js');
const serverSettings = require('../utils/server_settings.js');

const database = require('../db_queries/roles_db.js');

exports.join = async function(member) {
    autorole(member);
};

exports.onMessage = async function(message) {
    roles(message);
};

exports.onCommand = async function(message, args) {
    const { channel, member } = message;

    switch (args[0]) {
    case 'autorole':
        switch (args[1]) {
        case 'set':
            if (checkPermissions(member, ['MANAGE_ROLES'])) {
                withTyping(channel, setAutorole, [message, args]);
            }
            break;
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_GUILD'])) {
                withTyping(channel, toggleAutorole, [message]);
            }
            break;
        default:
            message.channel.send({ content: 'Help with roles can be found here: https://haseulbot.xyz/#roles' });
            break;
        }
        break;
    case 'roles':
        switch (args[1]) {
        case 'list':
            withTyping(channel, roleslist, [message]);
            break;
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_GUILD'])) {
                withTyping(channel, toggleRoles, [message]);
            }
            break;
        case 'add':
            if (checkPermissions(member, ['MANAGE_ROLES'])) {
                withTyping(channel, addRole, [message, args]);
            }
            break;
        case 'remove':
        case 'delete':
            if (checkPermissions(member, ['MANAGE_ROLES'])) {
                withTyping(channel, removeRole, [message, args]);
            }
            break;
        case 'message':
        case 'msg':
            switch (args[2]) {
            case 'set':
                if (checkPermissions(member, ['MANAGE_GUILD'])) {
                    withTyping(channel, setRolesMsg, [message, args]);
                }
                break;
            }
            break;
        case 'channel':
            switch (args[2]) {
            case 'set':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(
                        channel, setRolesChannel, [message, args.slice(3)],
                    );
                }
                break;
            case 'update':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(channel, updateRolesChannel, [message]);
                }
                break;
            }
            break;
        case 'pairs':
            switch (args[2]) {
            case 'list':
                if (checkPermissions(member, ['MANAGE_ROLES'])) {
                    withTyping(channel, listRoles, [message]);
                }
                break;
            }
            break;
        case 'help':
        default:
            message.channel.send({ content: 'Help with roles can be found here: https://haseulbot.xyz/#roles' });
            break;
        }
        break;
    case 'avarole':
        perms = ['ADMINISTRATOR', 'MANAGE_GUILD', 'MANAGE_ROLES'];
        if (!message.member) {
            message.member = await message
                .guild
                .members
                .fetch(message.author.id);
        }
        if (!perms.some(p => message.member.permissions.has(p))) break;
        if (checkPermissions(member, ['MANAGE_ROLES'])) {
            withTyping(channel, toggleAvailableRole, [message, args]);
        }
        break;
    case 'biaslist':
        withTyping(channel, biaslist, [message]);
        break;
    case 'bias':
        switch (args[1]) {
        case 'list':
            withTyping(channel, biaslist, [message]);
            break;
        }
        break;
    }
};

async function autorole(member) {
    const autoroleOn = serverSettings.get(member.guild.id, 'autoroleOn');
    if (!autoroleOn) return;
    const role = serverSettings.get(member.guild.id, 'autoroleID');
    if (!member.guild.roles.cache.has(role)) return;
    if (role) member.roles.add(role);
}

async function roles(message) {
    const rolesOn = serverSettings.get(message.guild.id, 'rolesOn');
    if (!rolesOn) return;
    const rolesChannelID = serverSettings.get(message.guild.id, 'rolesChannel');
    if (rolesChannelID == message.channel.id) {
        assignRoles(message); // Assign roles if in roles channel
    }
}

function rolesResponse(responses) {
    const list = [];
    for (const [key, val] of Object.entries(responses)) {
        if (val.length > 0) list.push(`**${key}**: ${val.join(', ')}`);
    }
    return list.join('\n');
}

function rolesRmbed(responses) {
    const embed = new Discord.MessageEmbed();
    for (const [key, val] of Object.entries(responses)) {
        if (val.length > 0) embed.addField(key, val.join(', '), false);
    }
    return embed;
}

// Allows members to self-assign roles

async function assignRoles(message) {
    // Safety net

    message.delete({ timeout: 10000 }).catch(() => {});

    // Process commands

    const args = message.content.trim().split(' ');
    if (args.length < 2) {
        message.delete({ timeout: 1000 }).catch(() => {}); return;
    }
    const prefix = message.content.trim().match(/^(?:\+|\-)\s*(main|sub|other)/i);
    if (!prefix) {
        message.reply('Invalid formatting. Please read the instructions above.').then(reply => {
            reply.delete({ timeout: 4000 }).catch(() => {});
            message.delete({ timeout: 4000 }).catch(() => {});
        });
        return;
    }
    const modifier = prefix[0][0];
    const type = prefix[1];
    const roleCommands = message.content.slice(message.content.indexOf(type) + type.length).split(',');
    const rolesToProcess = [];
    const rolesSuccessful = [];
    const rolesUnsuccessful = [];
    const errors = [];

    let member;
    if (message.member) {
        member = message.member;
    } else {
        member = await message.guild.members.fetch(message.author.id);
    }

    // Parse role commands

    let colour;
    for (i = 0; i < roleCommands.length; i++) {
        const roleCommand = roleCommands[i].trim();
        const roleId = await database
            .getRoleId(roleCommand, message.guild.id, type);
        let role;
        if (roleId) {
            role = await message.guild.roles.fetch(roleId);
        }

        // Process role

        if (role) {
            if (!colour) colour = role.color;

            switch (modifier) {
            case '+':
                if (member.roles.cache.has(roleId) &&
                    !rolesUnsuccessful.includes(role)) {
                    rolesUnsuccessful.push(role);
                } else if (!member.roles.cache.has(roleId) &&
                    !rolesSuccessful.includes(role)) {
                    rolesToProcess.push(roleId);
                    rolesSuccessful.push(role);
                }
                break;

            case '-':
                if (!member.roles.cache.has(roleId) &&
                    !rolesUnsuccessful.includes(role)) {
                    rolesUnsuccessful.push(role);
                } else if (member.roles.cache.has(roleId) &&
                    !rolesSuccessful.includes(role)) {
                    rolesToProcess.push(roleId);
                    rolesSuccessful.push(role);
                }
                break;
            }
        } else {
            errors.push(`"${roleCommand}"`);
        }
    }
    if (!colour) colour = 0xffffff;

    // Add/Remove roles

    switch (modifier) {
    case '+': {
        member.roles.add(rolesToProcess);
        // Respond
        const responses = {
            'Assigned Roles': rolesSuccessful,
            'Current Roles': rolesUnsuccessful,
            'Invalid Roles': errors,
        };
        const embed = rolesRmbed(responses);
        embed.setColor(colour);
        message.reply({ embed }).then(reply => {
            reply.delete({ timeout: embed.fields.length * 2000 + 2000 });
            message.delete({ timeout: embed.fields.length * 2000 + 2000 });
        });
        break;
    }

    case '-': {
        member.roles.remove(rolesToProcess);
        // Respond
        const responses = { 'Removed Roles': rolesSuccessful, 'Roles Not Assigned': rolesUnsuccessful, 'Invalid Roles': errors };
        const embed = rolesRmbed(responses);
        embed.setColor(colour);
        message.reply({ embed }).then(reply => {
            reply.delete({ timeout: embed.fields.length * 2000 + 2000 });
            message.delete({ timeout: embed.fields.length * 2000 + 2000 });
        });
        break;
    }
    }
}

// -----------------------------------------------

async function createAvaroleEmbed(message) {
    const guild = Client.guilds.cache.get(message.guild.id);
    const sender = await guild.members.fetch(Client.user.id);
    const roleRows = await database.getAvailableRoles(message.guild.id);
    if (!roleRows || !roleRows.length) return;

    const mainRoles = [];
    const subRoles = [];
    const otherRoles = [];
    for (i = 0; i < roleRows.length; i++) {
        const row = roleRows[i];
        switch (row.type) {
        case 'MAIN': mainRoles.push(`\`${row.roleName}\``); break;
        case 'SUB': subRoles.push(`\`${row.roleName}\``); break;
        case 'OTHER': otherRoles.push(`\`${row.roleName}\``); break;
        }
    }

    const embed = new Discord.MessageEmbed({
        title: '__Available Roles__',
        color: sender && sender.roles.color ?
            sender.roles.color.color :
            0xffffff,
    });
    if (mainRoles.length) embed.addField('Main Roles', mainRoles.join(', '), false);
    if (subRoles.length) embed.addField('Sub Roles', subRoles.join(', '), false);
    if (otherRoles.length) embed.addField('Other Roles', otherRoles.join(', '), false);
    return embed;
}


async function addRole(message, args) {
    if (args.length < 4) {
        message.channel.send({ content: '⚠ Missing arguments.\nUsage: .roles add [role type] [role command]: [role name]' });
        return;
    }
    const type = args[2];
    if (!['MAIN', 'SUB', 'OTHER'].includes(type.toUpperCase())) {
        message.channel.send({ content: '⚠ Role type not specified or role type isn\'t one of the following: Main, Sub, Other' });
        return;
    }

    const rolesText = trimArgs(args, 3, message.content);
    const pairs = rolesText.split(',');
    const errors = [];
    const rolesAdded = [];
    const rolesExist = [];

    for (i = 0; i < pairs.length; i++) {
        const pair = pairs[i].trim();
        if (!pair.includes(':')) {
            errors.push(pair);
            continue;
        }
        const roles = pair.split(':', 2);
        const roleCommand = roles[0].trim();
        const roleName = roles[1].trim();
        const role = message.guild.roles.cache
            .find(role => role.name == roleName);
        if (roleCommand.length < 1 || roleName.length < 1) {
            errors.push(roleCommand);
        } else if (!role || !message.guild.roles.cache.has(role.id)) {
            errors.push(roleCommand);
        } else {
            const roleId = role.id;
            added = await database
                .addRole(roleCommand, roleId, roleName, message.guild.id, type);
            if (added) {
                rolesAdded.push(roleName);
            } else {
                rolesExist.push(roleName);
            }
        }
    }

    message.channel.send(rolesResponse({
        'Role commands added': rolesAdded,
        'Role commands already paired': rolesExist,
        'Errors': errors,
    }));
}

async function removeRole(message, args) {
    if (args.length < 4) {
        message.channel.send({ content: '⚠ Missing arguments.\nUsage: .roles remove [role type] [role command]' });
        return;
    }
    const type = args[2];
    if (!['MAIN', 'SUB', 'OTHER'].includes(type.toUpperCase())) {
        message.channel.send({ content: '⚠ Role type not specified or role type isn\'t one of the following: Main, Sub, Other' });
        return;
    }

    const rolesText = trimArgs(args, 3, message.content);
    const roleCommands = rolesText.split(',');

    const rolesRemoved = [];
    const rolesNonexistent = [];
    const errors = [];

    for (i = 0; i < roleCommands.length; i++) {
        const roleCommand = roleCommands[i].trim();
        if (roleCommand.length < 1) {
            errors.push(roleCommand);
        } else {
            const removed = await database
                .removeRole(roleCommand, message.guild.id, type);
            if (removed) {
                rolesRemoved.push(roleCommand);
            } else {
                rolesNonexistent.push(roleCommand);
            }
        }
    }

    message.channel.send(rolesResponse({
        'Role commands removed': rolesRemoved,
        'Role commands nonexistent': rolesNonexistent,
        'Errors': errors,
    }));
}

async function toggleAvailableRole(message, args) {
    if (args.length < 3) {
        message.channel.send({ content: '⚠ Missing arguments.\nUsage: .avarole [role type] [role name]' });
        return;
    }
    const type = args[1];
    if (!['MAIN', 'SUB', 'OTHER'].includes(type.toUpperCase())) {
        message.channel.send({ content: '⚠ Role type not specified or role type isn\'t one of the following: Main, Sub, Other' });
        return;
    }
    const rolesText = trimArgs(args, 2, message.content);
    const roleNames = rolesText.split(',');

    const rolesAdded = [];
    const rolesRemoved = [];
    const errors = [];

    for (i = 0; i < roleNames.length; i++) {
        const roleName = roleNames[i].trim();
        if (roleName.length < 1) {
            break;
        } else {
            const [added, removed] = await database
                .availableRoleToggle(roleName, message.guild.id, type);
            if (added) {
                rolesAdded.push(added);
            } else if (removed) {
                rolesRemoved.push(removed);
            } else {
                console.error(new Error('Unknown error occurred toggling available roles'));
            }
        }
    }

    message.channel.send(rolesResponse({
        'Role names added': rolesAdded,
        'Role names removed': rolesRemoved,
        'Errors': errors,
    }));
}

async function listRoles(message) {
    const rows = await database.getAllRoles(message.guild.id);
    const guild = message.guild;
    let mainRoles = [];
    let subRoles = [];
    let otherRoles = [];
    for (i = 0; i < rows.length; i++) {
        const row = rows[i];
        command = row.roleCommand;
        name = guild.roles.cache.get(row.roleID).name;
        switch (row.type) {
        case 'MAIN': mainRoles.push(`${command}: ${name}`); break;
        case 'SUB': subRoles.push(`${command}: ${name}`); break;
        case 'OTHER': otherRoles.push(`${command}: ${name}`); break;
        default: console.error('Unexpected value for column: type'); break;
        }
    }
    mainRoles = '__**Main Roles**__\n' + mainRoles.join(' **|** ') + '\n';
    subRoles = '__**Sub Roles**__\n' + subRoles.join(' **|** ') + '\n';
    otherRoles = '__**Other Roles**__\n' + otherRoles.join(' **|** ') + '\n';

    await message.channel.send(mainRoles);
    await message.channel.send(subRoles);
    await message.channel.send(otherRoles);
}


async function setRolesChannel(message, args) {
    let channelId;
    if (args.length < 1) {
        channelId = message.channel.id;
    } else {
        channelId = args[0].match(/<?#?!?(\d+)>?/);
        if (!channelId) {
            message.channel.send({ content: '⚠ Invalid channel or channel ID.' });
            return;
        }
        channelId = channelId[1];
    }
    if (!message.guild.channels.cache.has(channelId)) {
        message.channel.send({ content: '⚠ Channel doesn\'t exist in this server.' });
        return;
    }

    const data = await database.getRolesMsg(message.guild.id);
    if (!data || !data.msg) {
        message.channel.send({ content: '⚠ No roles channel message assigned.' });
        return;
    }

    const channel = Client.channels.cache.get(channelId);
    const embed = await createAvaroleEmbed(message);
    const msg = await channel.send({ content: data.msg, embeds: [embed] });
    if (data && data.messageID) {
        const rolesChannel = serverSettings.get(message.guild.id, 'rolesChannel');
        if (rolesChannel) {
            const channel = Client.channels.cache.get(rolesChannel);
            if (channel) {
                channel.messages
                    .fetch(data.messageID)
                    .then(msg => msg.delete());
            }
        }
    }

    await database.setMsgId(message.guild.id, msg.id);
    await serverSettings.set(message.guild.id, 'rolesChannel', channelId);
    message.channel.send({ content: `Roles channel set to <#${channelId}>.` });
}

async function updateRolesChannel(message) {
    const data = await database.getRolesMsg(message.guild.id);
    if (!data || !data.msg) {
        message.channel.send({ content: '⚠ No roles channel message assigned.' });
        return;
    }

    const messageId = data.messageID;
    const content = data.msg;
    const channelId = serverSettings.get(message.guild.id, 'rolesChannel');
    const channel = Client.channels.cache.get(channelId);
    const embed = await createAvaroleEmbed(message);

    const oldMessage = await channel.messages.fetch(messageId);
    oldMessage.delete();
    const msg = await channel.send(content, { embed });
    await database.setMsgId(message.guild.id, msg.id);
    message.channel.send({ content: 'Roles channel message updated.' });
}


async function setRolesMsg(message, args) {
    if (args.length < 4) {
        message.channel.send({ content: '⚠ Please provide a message.' });
        return;
    }

    const msg = trimArgs(args, 3, message.content);
    await database.setRolesMsg(message.guild.id, msg);
    message.channel.send({ content: 'Roles message set.' });
}

async function setAutorole(message, args) {
    if (args.length < 1) {
        message.channel.send({ content: '⚠ Please provide a role name.' });
        return;
    }

    const roleName = trimArgs(args, 2, message.content);
    const role = message.guild.roles.cache.find(role => role.name == roleName);
    if (!role) {
        message.channel.send({ content: '⚠ This role does not exist on the server!' });
        return;
    }

    serverSettings.set(message.guild.id, 'autoroleID', role.id);
    message.channel.send({ content: `Autorole set to \`${role.name}\`.` });
}

// Toggle

async function toggleAutorole(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'autoroleOn');
    message.channel.send({ content: `Autorole turned ${tog ? 'on':'off'}.` });
}

async function toggleRoles(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'rolesOn');
    message.channel.send({ content: `Roles assignment turned ${tog ? 'on':'off'}.` });
}

async function biaslist(message) {
    const { guild } = message;

    const roleData = await database.getAllRoles(guild.id);
    if (roleData.length < 1) {
        message.channel.send({ content: '⚠ No bias roles are set up on this server!' });
        return;
    }

    const guildRoles = guild.roles.cache
        .array()
        .sort((a, b) => b.comparePositionTo(a))
        .slice(0, -1);

    let mainRoles = guildRoles.filter(role => {
        const dataMatch = roleData.find(data => data.roleID == role.id);
        if (!dataMatch) return false;
        if (dataMatch.type.toUpperCase() != 'MAIN') return false;
        return true;
    }).map(role => `${role} - ${role.members.size} member${role.members.size != 1 ? 's':''}`).join('\n');
    let subRoles = guildRoles.filter(role => {
        const dataMatch = roleData.find(data => data.roleID == role.id);
        if (!dataMatch) return false;
        if (dataMatch.type.toUpperCase() != 'SUB') return false;
        return true;
    }).map(role => `${role} - ${role.members.size} member${role.members.size != 1 ? 's':''}`).join('\n');

    if (mainRoles.length < 1 && subRoles.length < 1) {
        message.channel.send({ content: '⚠ No bias roles are set up on this server!' });
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


    const autoroleID = serverSettings.get(guild.id, 'autoroleID');
    const autoroleColour = autoroleID ?
        guild.roles.cache.get(autoroleID, true).color :
        null;
    const embed = new Discord.MessageEmbed({
        title: `Bias List for ${guild.name}`,
        fields: [],
        color: autoroleColour || 0xf986ba,
    });

    if (mainRoles) embed.fields.push({ name: 'Main Biases', value: mainRoles });
    if (subRoles) embed.fields.push({ name: 'Sub Biases', value: subRoles });

    message.channel.send({ embeds: [embed] });
}

async function roleslist(message) {
    const { guild } = message;

    const guildRoles = guild.roles.cache
        .array()
        .sort((a, b) => b.comparePositionTo(a))
        .slice(0, -1);
    if (guildRoles.length < 1) {
        message.channel.send({ content: '⚠ This server has no roles to list!' });
        return;
    }

    let roleString = guildRoles.map(role => `${role} - ${role.members.size} member${role.members.size != 1 ? 's':''} \`${role.hexColor.toUpperCase()}\``).join('\n');

    const descriptions = [];
    while (roleString.length > 1024 || roleString.split('\n').length > 30) {
        let currString = roleString.slice(0, 1024);

        let lastIndex = 0;
        for (let i = 0; i < 30; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        roleString = roleString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(roleString);

    const autoroleID = serverSettings.get(guild.id, 'autoroleID');
    const autoroleColour = autoroleID ?
        guild.roles.cache.get(autoroleID).color :
        null;

    const pages = descriptions.map((desc, i) => ({
        embed: {
            title: `Roles List for ${guild.name}`,
            description: desc,
            color: autoroleColour || 0xf986ba,
            footer: {
                text: `Roles: ${guildRoles.length} | Page ${i+1} of ${descriptions.length}`,
            },
        },
    }));

    embedPages(message, pages);
}
