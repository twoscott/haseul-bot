//Require modules

const discord = require("discord.js");
const client = require("../haseul").client;

//Functions

handle = (message) => {

    let args = message.content.trim().split(" ");

    //Handle commands

    switch (args[0]) {

        case ".github":
            message.channel.startTyping();
            message.channel.send("https://github.com/haseul/haseul-bot");
            message.channel.stopTyping();
            break;

    }
}

module.exports = {
    handle: handle
}