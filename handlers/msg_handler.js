const Discord = require('discord.js');
const { resolveMember } = require('../functions/discord.js');
const { Client } = require('../haseul.js');
const { getPrefix } = require('../functions/bot.js');

const client = require('../modules/client.js');
const commands = require('../modules/commands.js');
const emojis = require('../modules/emojis.js');
const information = require('../modules/information.js');
const lastfm = require('../modules/lastfm.js');
const levels = require('../modules/levels.js');
const management = require('../modules/management.js');
const media = require('../modules/media.js');
const memberLogs = require('../modules/member_logs.js');
const messageLogs = require('../modules/message_logs.js');
const misc = require('../modules/misc.js');
const moderation = require('../modules/moderation.js');
const notifications = require('../modules/notifications.js');
const patreon = require('../modules/patreon.js');
const profiles = require('../modules/profiles.js');
const reminders = require('../modules/reminders.js');
const reps = require('../modules/reps.js');
const roles = require('../modules/roles.js');
const twitter = require('../modules/twitter.js');
const utility = require('../modules/utility.js');
const whitelist = require('../modules/whitelist.js');

exports.onMessage = async function(message) {
    if (message.system) return;
    if (message.author.bot) return;
    if (message.channel.type === Discord.Constants.ChannelTypes.DM) return;

    const { author, content, guild } = message;
    const prefix = getPrefix(guild.id);

    if (content.startsWith(prefix)) {
        const args = content.slice(1).split(/\s+/);
        if (!message.member) {
            message.member = await resolveMember(guild, author.id);
        }
        processCommand(message, args);
    }

    if (message.mentions.users.has(Client.user.id) && !message.reference) {
        const args = content.split(/\s+/);
        if (!message.member) {
            message.member = await resolveMember(guild, author.id);
        }
        processMention(message, args);
    }

    processMessage(message);
};

exports.onMessageDelete = async function(message) {
    if (message.system) return;
    if (message.author.bot) return;
    if (message.channel.type === Discord.Constants.ChannelTypes.DM) return;
    message.deletedTimestamp = Date.now();
    message.deletedAt = new Date(message.deletedTimestamp);

    processMessageDelete(message);
};

exports.onMessageEdit = async function(oldMessage, newMessage) {
    if (oldMessage.system || newMessage.system) return;
    if (oldMessage.author.bot || newMessage.author.bot) return;
    if (oldMessage.channel.type === Discord.Constants.ChannelTypes.DM ||
        newMessage.channel.type === Discord.Constants.ChannelTypes.DM) {
        return;
    }

    processMessageEdit(oldMessage, newMessage);
};

async function processCommand(message, args) {
    client.onCommand(message, args);
    commands.onCommand(message, args);
    emojis.onCommand(message, args);
    information.onCommand(message, args);
    lastfm.onCommand(message, args);
    levels.onCommand(message, args);
    management.onCommand(message, args);
    media.onCommand(message, args);
    memberLogs.onCommand(message, args);
    messageLogs.onCommand(message, args);
    misc.onCommand(message, args);
    moderation.onCommand(message, args);
    notifications.onCommand(message, args);
    patreon.onCommand(message, args);
    profiles.onCommand(message, args);
    reminders.onCommand(message, args);
    reps.onCommand(message, args);
    roles.onCommand(message, args);
    twitter.onCommand(message, args);
    utility.onCommand(message, args);
    whitelist.onCommand(message, args);
}

async function processMention(message, args) {
    emojis.onMention(message, args);
    client.onMention(message, args);
}

async function processMessage(message) {
    levels.onMessage(message);
    management.onMessage(message);
    moderation.onMessage(message);
    notifications.onMessage(message);
    roles.onMessage(message);
    whitelist.onMessage(message);
}

async function processMessageDelete(message) {
    messageLogs.onMessageDelete(message);
}

async function processMessageEdit(oldMessage, newMessage) {
    messageLogs.onMessageEdit(oldMessage, newMessage);
}
