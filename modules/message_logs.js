const Discord = require('discord.js');
const { Client } = require('../haseul.js');
const { checkPermissions, resolveMember, withTyping } = require('../functions/discord.js');
const filterCache = require('../utils/filter_cache');

const serverSettings = require('../utils/server_settings.js');
const { parseChannelID } = require('../functions/functions.js');

const deleteColour = 0xf93437;
const spamColour = 0xf74623;
const editColour = 0xff9b35;

exports.onCommand = async function(message, args) {
    const { channel, member } = message;

    switch (args[0]) {
    case 'messagelogs':
    case 'msglogs':
        switch (args[1]) {
        case 'channel':
            switch (args[2]) {
            case 'set':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(channel, setMsgLogsChannel, [message, args[3]]);
                }
                break;
            }
            break;
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_GUILD'])) {
                withTyping(channel, toggleMsgLogs, [message]);
            }
            break;
        default:
            message.channel.send({ content: 'Help with message logs can be found here: https://haseulbot.xyz/#logs' });
            break;
        }
        break;
    }
};

exports.onMessageDelete = async function(message) {
    logDeletedMessage(message);
};

exports.onMessageEdit = async function(oldMessage, newMessage) {
    logEditedMessage(oldMessage, newMessage);
};

async function logDeletedMessage(message) {
    const { id, author, content, guild } = message;

    const logsOn = serverSettings.get(guild.id, 'msgLogsOn');
    if (!logsOn) return;
    const logChannelID = serverSettings.get(guild.id, 'msgLogsChan');
    const channel = Client.channels.cache.get(logChannelID);
    if (!channel) return;

    const proximityMessages = await message.channel.messages
        .fetch({ limit: 5, before: message.id });
    let proximityMessage = proximityMessages
        .find(msg => msg.author.id !== author.id);
    proximityMessage = proximityMessage || proximityMessages.first();

    const isSpam = filterCache.deletedSpamMsgs.includes(id);
    if (isSpam) {
        filterCache.deletedSpamMsgs = filterCache.deletedSpamMsgs
            .filter(mid => mid != id);
    }

    const embed = new Discord.MessageEmbed({
        author: { name: author.tag, icon_url: author.displayAvatarURL({ format: 'png', dynamic: true, size: 128 }) },
        title: isSpam ? 'Spam Message Deleted' : 'Message Deleted',
        color: isSpam ? spamColour : deleteColour,
        footer: { text: `#${message.channel.name}` },
        timestamp: message.deletedAt,
    });

    if (content.length > 0) {
        embed.addField('Content', content.length > 1024 ? content.slice(0, 1021) + '...' : content, false);
    }

    if (message.attachments.size > 0) {
        embed.addField('Attachments', message.attachments.map(file => file.url).join('\n'), false);
    }

    embed.addField('Message Area', `[Go To Area](${proximityMessage.url})`, false);

    if (isSpam) {
        embed.addField('User ID', author.id);
    }

    channel.send({ embeds: [embed] });
}

async function logEditedMessage(oldMessage, newMessage) {
    if (oldMessage.content === newMessage.content) return;
    const { author, guild } = oldMessage;

    const logsOn = serverSettings.get(guild.id, 'msgLogsOn');
    if (!logsOn) return;
    const logChannelID = serverSettings.get(guild.id, 'msgLogsChan');
    const channel = Client.channels.cache.get(logChannelID);
    if (!channel) return;

    const embed = new Discord.MessageEmbed({
        author: { name: author.tag, icon_url: author.displayAvatarURL({ format: 'png', dynamic: true, size: 128 }) },
        title: 'Message Edited',
        color: editColour,
        footer: { text: `#${newMessage.channel.name}` },
        timestamp: newMessage.editedAt,
    });

    if (oldMessage.content.length > 0) {
        embed.addField('Old Content', oldMessage.content.length > 1024 ? oldMessage.content.slice(0, 1021) + '...' : oldMessage.content, false);
    }
    if (newMessage.content.length > 0) {
        embed.addField('New Content', newMessage.content.length > 1024 ? newMessage.content.slice(0, 1021) + '...' : newMessage.content, false);
    }

    embed.addField('Message Link', `[View Message](${newMessage.url})`, false);

    channel.send({ embeds: [embed] });
}

async function setMsgLogsChannel(message, channelArg) {
    const { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send({ content: '⚠ Invalid channel or channel ID.' });
        return;
    }

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send({ content: '⚠ Channel doesn\'t exist in this server.' });
        return;
    }

    const member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    const botPerms = channel.permissionsFor(member);
    if (!botPerms.has('VIEW_CHANNEL', true)) {
        message.channel.send({ content: '⚠ I cannot see this channel!' });
        return;
    }
    if (!botPerms.has('SEND_MESSAGES', true)) {
        message.channel.send({ content: '⚠ I cannot send messages to this channel!' });
        return;
    }

    await serverSettings.set(message.guild.id, 'msgLogsChan', channelID);
    message.channel.send({ content: `Message logs channel set to <#${channelID}>.` });
}

async function toggleMsgLogs(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'msgLogsOn');
    message.channel.send({ content: `Message logs turned ${tog ? 'on':'off'}.` });
}
