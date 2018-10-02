const discord = require("discord.js");
const client = new discord.Client({disableEveryone: true});
exports.client = client;

//Fetch handlers

messages = require("./handlers/msghandler");

//Events

client.on("ready", () => {
    console.log("Ready!");
    botchannel = client.channels.get('417893349039669260');
    botchannel.send("Ready!");
})

client.on("message", message => {
    messages.handle(message);
})

//Login

client.login("TOKEN");
