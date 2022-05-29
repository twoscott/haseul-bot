const Discord = require('discord.js');

const intents = new Discord.Intents();
intents.add(
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_BANS,
    Discord.Intents.FLAGS.GUILD_INVITES,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING
);

const Client = new Discord.Client({
    disableMentions: 'everyone',
    messageCacheLifetime: 600,
    messageSweepInterval: 300,
    intents,
});
module.exports = { Client };

const config = require('./config.json');
const messages = require('./handlers/msg_handler.js');
const reactions = require('./handlers/react_handler.js');
const border = require('./handlers/border_handler.js');
const checklist = require('./handlers/ready_handler.js');

let initialised = false;

// Debugging

Client.on('shardDisconnected', closeEvent => {
    console.error(`Fatal error occured... Reason: ${closeEvent.reason}`);
});

Client.on('shardReconnecting', () => {
    console.log('Reconnecting...');
});

Client.on('error', error => {
    console.error(error);
});

Client.on('debug', debug => {
    console.error(debug);
});

Client.on('warn', warning => {
    console.error(warning);
});

// Discord

Client.on('ready', async () => {
    console.log('Ready!');

    const botChannel = await Client.channels.fetch(config.bot_channel, true);
    if (botChannel) {
        botChannel.send({ content: 'Ready!' });
    }

    if (!initialised) {
        checklist.handleTasks();
        initialised = true;
    }
});

Client.on('messageCreate', message => {
    messages.onMessage(message);
});

Client.on('messageDelete', message => {
    messages.onMessageDelete(message);
});

Client.on('messageUpdate', (oldMessage, newMessage) => {
    messages.onMessageEdit(oldMessage, newMessage);
});

Client.on('messageReactionAdd', (reaction, user) => {
    reactions.onReact(reaction, user);
});

Client.on('guildMemberAdd', member => {
    border.handleJoins(member);
});

Client.on('guildMemberRemove', member => {
    border.handleLeaves(member);
});

Client.on('guildCreate', guild => {
    border.handleNewGuild(guild);
});

Client.on('guildDelete', guild => {
    border.handleRemovedGuild(guild);
});

// Login

Client.login(config.token);
