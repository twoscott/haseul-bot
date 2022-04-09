const {
    checkPermissions,
    embedPages,
    resolveMember,
    resolveMessage,
    withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const database = require('../db_queries/server_db.js');
const serverSettings = require('../utils/server_settings.js');
const { parseChannelID, trimArgs } = require('../functions/functions.js');

const messageUrlRegex = /https:\/\/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/i;

exports.onMessage = async function(message) {
    poll(message);
};

exports.onCommand = async function(message, args) {
    const { channel, member } = message;

    switch (args[0]) {
    case 'message':
    case 'msg':
        switch (args[1]) {
        case 'send':
            if (checkPermissions(member, ['MANAGE_MESSAGES'])) {
                withTyping(channel, sendMessage, [message, args]);
            }
            break;
        case 'edit':
            if (checkPermissions(member, ['MANAGE_MESSAGES'])) {
                withTyping(channel, editMessage, [message, args]);
            }
            break;
        case 'get':
            if (checkPermissions(member, ['MANAGE_MESSAGES'])) {
                withTyping(channel, getMessage, [message, args[2]]);
            }
            break;
        }
        break;
    case 'say':
        if (checkPermissions(member, ['MANAGE_MESSAGES'])) {
            channel.send('⚠ Command deprecated. Please use `.message send`/`.msg send` instead.');
        }
        break;
    case 'edit':
        if (checkPermissions(member, ['MANAGE_MESSAGES'])) {
            channel.send('⚠ Command deprecated. Please use `.message edit`/`.msg edit` instead.');
        }
        break;
    case 'get':
        if (checkPermissions(member, ['MANAGE_MESSAGES'])) {
            channel.send('⚠ Command deprecated. Please use `.message get`/`.msg get` instead.');
        }
        break;
    case 'poll':
        switch (args[1]) {
        case 'channel':
            switch (args[2]) {
            case 'add':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(channel, addPollChannel, [message, args[3]]);
                }
                break;
            case 'remove':
            case 'delete':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(channel, removePollChannel, [message, args[3]]);
                }
                break;
            }
            break;
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_GUILD'])) {
                withTyping(channel, togglePoll, [message]);
            }
            break;
        }
        break;
    case 'prefix':
        switch (args[1]) {
        case 'set':
            if (checkPermissions(member, ['MANAGE_GUILD'])) {
                withTyping(channel, setPrefix, [message, args[2]]);
            }
            break;
        }
        break;
    case 'settings':
        if (checkPermissions(member, ['MANAGE_GUILD', 'MANAGE_ROLES', 'MANAGE_CHANNELS'])) {
            withTyping(channel, displaySetttings, [message, args[2]]);
        }
        break;
    }
};

async function poll(message) {
    const pollOn = serverSettings.get(message.guild.id, 'pollOn');
    if (!pollOn) return;
    const pollChannelIDs = await database.getPollChannels(message.guild.id, 'pollChannel');
    if (pollChannelIDs.includes(message.channel.id)) {
        await message.react('✅');
        await message.react('❌');
    }
}

async function sendMessage(message, args) {
    const { guild } = message;

    if (args.length < 3) {
        message.channel.send('⚠ No channel provided to send a message to.');
        return;
    }

    const channelID = parseChannelID(args[2]);
    if (!channelID) {
        message.channel.send('⚠ Please provide a channel to send the message to.');
        return;
    }

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send('⚠ Invalid channel provided or channel is not in this server.');
        return;
    }

    const botMember = await resolveMember(guild, Client.user.id);
    if (!botMember) {
        message.channel.send('⚠ Error occurred.');
        return;
    }

    const botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has('VIEW_CHANNEL', true)) {
        message.channel.send('⚠ I cannot see this channel!');
        return;
    }

    if (!botPerms.has('SEND_MESSAGES', true)) {
        message.channel.send('⚠ I cannot send messages to this channel!');
        return;
    }

    const attachments = message.attachments.array();
    const files = [];
    for (i=0; i < attachments.length; i++) {
        const attachment = attachments[i];
        const file = { attachment: attachment.url, name: attachment.name };
        files.push(file);
    }

    if (args.length < 3 && files.length < 1) {
        message.channel.send('⚠ No message provided to be sent.');
        return;
    }

    channel.startTyping();
    const content = trimArgs(args, 3, message.content);
    await channel.send({ content, files });
    channel.stopTyping();
    message.channel.send(`Message sent to <#${channelID}>.`);
}

async function editMessage(message, args) {
    const { guild } = message;

    if (args.length < 3) {
        message.channel.send('⚠ No message url provided.');
        return;
    }

    const messageUrlMatch = args[2].match(messageUrlRegex);
    if (!messageUrlMatch) {
        message.channel.send('⚠ Invalid message url provided.');
        return;
    }

    const [guildID, channelID, messageID] = messageUrlMatch.slice(1);
    if (guildID != guild.id) {
        message.channel.send('⚠ Provided message url must link to a message in this server.');
        return;
    }

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send('⚠ Provided message url links to an invalid channel.');
        return;
    }

    const botMember = await resolveMember(guild, Client.user.id);
    if (!botMember) {
        message.channel.send('⚠ Error occurred.');
        return;
    }

    const botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has('VIEW_CHANNEL', true )) {
        message.channel.send('⚠ I cannot see this channel!');
        return;
    }

    const msg = await resolveMessage(channel, messageID);
    if (!msg) {
        message.channel.send('⚠ Provided message url links to an invalid message.');
        return;
    }

    if (msg.author.id != Client.user.id) {
        message.channel.send('⚠ Provided message url links to a message sent by another user.');
        return;
    }

    if (args.length < 4) {
        message.channel.send('⚠ No content provided to edit the message with.');
        return;
    }

    const content = trimArgs(args, 3, message.content);
    await msg.edit(content);
    message.channel.send(`Message edited in <#${channel.id}>.`);
}

async function getMessage(message, messageUrl) {
    const { guild } = message;

    if (!messageUrl) {
        message.channel.send('⚠ No message url provided.');
        return;
    }

    const messageUrlMatch = messageUrl.match(messageUrlRegex);
    if (!messageUrlMatch) {
        message.channel.send('⚠ Invalid message url provided.');
        return;
    }

    const [guildID, channelID, messageID] = messageUrlMatch.slice(1);
    if (guildID != guild.id) {
        message.channel.send('⚠ Provided message url must link to a message in this server.');
        return;
    }

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send('⚠ Provided message url links to an invalid channel.');
        return;
    }

    const botMember = await resolveMember(guild, Client.user.id);
    if (!botMember) {
        message.channel.send('⚠ Error occurred.');
        return;
    }

    const botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has('VIEW_CHANNEL', true )) {
        message.channel.send('⚠ I cannot see this channel!');
        return;
    }

    const msg = await resolveMessage(channel, messageID);
    if (!msg) {
        message.channel.send('⚠ Provided message url links to an invalid message.');
        return;
    }

    if (msg.content.length < 1) {
        message.channel.send('⚠ Message has no content.');
        return;
    }

    message.channel.send(`${msg.content.includes('```') ? '` ```‌‌` -> `\'\'\'`\n':''}\`\`\`${msg.content.replace(/```/g, '\'\'\'').slice(0, 2048)}\`\`\``);
}

async function addPollChannel(message, channelArg) {
    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send('⚠ Invalid channel or channel ID.');
        return;
    }
    if (!message.guild.channels.cache.has(channelID)) {
        message.channel.send('⚠ Channel doesn\'t exist in this server.');
        return;
    }

    added = await database.addPollChannel(message.guild.id, channelID);
    message.channel.send(added ? 'Poll channel added.' : 'Poll channel already added.');
}

async function removePollChannel(message, channelArg) {
    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send('⚠ Invalid channel or channel ID.');
        return;
    }
    if (!message.guild.channels.cache.has(channelID)) {
        message.channel.send('⚠ Channel doesn\'t exist in this server.');
        return;
    }

    removed = await database.removePollChannel(message.guild.id, channelID);
    message.channel.send(removed ? 'Poll channel removed.' : 'Poll channel doesn\'t exist.');
}

async function togglePoll(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'pollOn');
    message.channel.send(`Poll setting turned ${tog ? 'on':'off'}.`);
}

async function setPrefix(message, prefix) {
    const { guild } = message;

    if (!prefix) {
        message.channel.send('⚠ Please provide a prefix for commands to use.');
        return;
    }
    if (prefix.length > 1) {
        message.channel.send('⚠ A prefix must be a single character.');
        return;
    }
    if (prefix.match(/^\w+$/)) {
        message.channel.send('⚠ A prefix cannot be a letter.');
        return;
    }

    serverSettings.set(guild.id, 'prefix', prefix);
    message.channel.send(`Prefix set to \`${prefix}\``);
}

async function displaySetttings(message) {
    const { guild } = message;
    let settings = serverSettings.getServer(guild.id);
    if (!settings) {
        await serverSettings.newGuild(guild.id);
        settings = serverSettings.getServer(guild.id);
    }

    settings = Object.entries(settings);
    const fieldArrays = [];
    let settingsProcessed = 0;

    while (settingsProcessed < settings.length) {
        const fields = [];
        for (let i = 0; i < 8 && settingsProcessed < settings.length; i++) {
            const [setting, value] = settings[settingsProcessed];
            if (setting !== 'guildID') {
                const { name, type } = serverSettings.template[setting];
                let newValue;
                switch (type) {
                case 'toggle':
                    newValue = value ? '✅' : '❌';
                    break;
                case 'channel':
                    const channel = guild.channels.cache.has(value);
                    newValue = channel ? `<#${value}>` : value || 'None';
                    break;
                case 'role':
                    const role = guild.roles.cache.has(value);
                    newValue = role ? `<@&${value}>` : value || 'None';
                    break;
                default:
                    newValue = value || 'None';
                    break;
                }
                fields.push({ name, value: newValue, inline: false });
            }
            settingsProcessed++;
        }
        fieldArrays.push(fields);
    }

    const pages = fieldArrays.map((fieldArray, i) => ({
        embed: {
            title: `${guild.name} Settings`,
            fields: fieldArray,
            footer: {
                text: `Page ${i+1} of ${fieldArrays.length}`,
            },
        },
    }));

    embedPages(message, pages);
}
