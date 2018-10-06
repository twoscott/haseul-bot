//Require modules

const discord = require("discord.js");
const client = require("../haseul").client;

//Functions

handle = (message) => {

    var args = message.content.trim().split(" ");

    //Handle commands

    switch (args[0]) {

        case ".github":
            message.channel.startTyping();
            message.channel.send("https://github.com/haseul/haseul-bot");
            message.channel.stopTyping(true);
            break;

    }
}

module.exports = {
    handle: handle
}