//Require modules

const discord = require("discord.js");
const config = require("./config.json");
const client = new discord.Client({disableEveryone: true})
exports.client = client;

//Fetch handlers

const messages = require("./handlers/msg_handler");
const border = require("./handlers/border_handler");

// -- Events --

//Debugging

client.on("disconnect", closeEvent => {
    console.log(`Fatal error occured... Reason: ${closeEvent.reason}`);
})

client.on("reconnecting", () => {
    console.log("Reconnecting...");
})

//

client.on("debug", debug => {
    console.log(debug);
})

client.on("error", error => {
    console.error(error);
})

client.on("warn", warning => {
    console.log(warning);
})

//Discord

client.on("ready", () => {
    console.log("Ready!");
    botchannel = client.channels.get('417893349039669260');
    botchannel.send("Ready!");
})

client.on("message", message => {
    messages.handle(message);
})

client.on("guildMemberAdd", member => {
    border.handleJoins(member);
})

client.on("guildMemberRemove", member => {
    border.handleLeaves(member);
})

// -- Login --

client.login(config.token);
