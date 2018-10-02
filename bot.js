const discord = require("discord.js");
const client = new discord.Client({disableEveryone: true});

require('./handlers/msghand.js')(client);

client.on("ready", () => {
    console.log("Ready!");
    botchannel = client.channels.get('417893349039669260');
    botchannel.startTyping(1);
    botchannel.stopTyping(true);
    botchannel.send("Ready!");
})

client.on("message", message => {
    msgHandler(message);
})

client.login("TOKEN");
