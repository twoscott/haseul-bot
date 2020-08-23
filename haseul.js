const Discord = require("discord.js");
const Client = new Discord.Client({ disableMentions: "everyone", messageCacheLifetime: 1800, messageSweepInterval: 1800 });
module.exports = { Client };

const config = require("./config.json");
const messages = require("./handlers/msg_handler.js");
const reactions = require("./handlers/react_handler.js");
const border = require("./handlers/border_handler.js");
const checklist = require("./handlers/ready_handler.js");

let initialised = false;

// Debugging

Client.on("shardDisconnected", closeEvent => {
    console.error(`Fatal error occured... Reason: ${closeEvent.reason}`);
})

Client.on("shardReconnecting", () => {
    console.log("Reconnecting...");
})

Client.on("error", error => {
    console.error(error);
})

Client.on("warn", warning => {
    console.error(warning);
})

// Discord

Client.on("ready", () => {
    console.log("Ready!");

    let botChannel = Client.channels.cache.get(config.bot_channel, true);    
    botChannel.send(`Ready!`);

    if (!initialised) {
        checklist.handleTasks();
        initialised = true;
    }
})

Client.on("message", message => {
    messages.onMessage(message);
})

Client.on("messageDelete", message => {
    messages.onMessageDelete(message);
})

Client.on("messageUpdate", (oldMessage, newMessage) => {
    messages.onMessageEdit(oldMessage, newMessage);
})

Client.on("messageReactionAdd", (reaction, user) => {
    reactions.onReact(reaction, user);
})

Client.on("guildMemberAdd", member => {
    border.handleJoins(member);
})

Client.on("guildMemberRemove", member => {
    border.handleLeaves(member);
})

Client.on("guildCreate", guild => {
    border.handleNewGuild(guild);
})

Client.on("guildDelete", guild => {
    border.handleRemovedGuild(guild);
})

// Login

Client.login(config.token);
