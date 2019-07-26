//Require modules

const Discord = require("discord.js");
// const config = require("./config.json");
const config = require("./config_test.json");
const Client = new Discord.Client({disableEveryone: true})
exports.Client = Client;

//Fetch handlers

const messages = require("./handlers/msg_handler");
const border = require("./handlers/border_handler");

// -- Events --

//Debugging

Client.on("disconnect", closeEvent => {
    console.log(`Fatal error occured... Reason: ${closeEvent.reason}`);
})

Client.on("reconnecting", () => {
    console.log("Reconnecting...");
})

//

Client.on("debug", debug => {
    console.log(debug);
})

Client.on("error", error => {
    console.error(error);
})

Client.on("warn", warning => {
    console.log(warning);
})

//Discord

Client.on("ready", () => {
    console.log("Ready!");
    botchannel = Client.channels.get('417893349039669260');
    botchannel.send("Ready!");
})

Client.on("message", message => {
    messages.handleMsg(message);
})

Client.on("guildMemberAdd", member => {
    border.handleJoins(member);
})

Client.on("guildMemberRemove", member => {
    border.handleLeaves(member);
})

// -- Login --

Client.login(config.token);
