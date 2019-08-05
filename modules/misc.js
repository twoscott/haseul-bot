// Require modules

const { Client } = require("../haseul.js");

const axios = require("axios");

// Functions

exports.msg = async function(message, args) {

    // Handle commands

    switch (args[0]) {

        case `<@${Client.user.id}>`:
        case ".emoji":
            mention_function(message, args).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }

}

async function mention_function(message, args) {

    if (args[0] == ".emoji") {
        if (args.length < 2) {
            return "⚠ Please provide an emoji to enlarge.";
        }
    } else {
        if (message.mentions.length < 1 || args.length < 2) return;
    }
    
    let emojiMatch = args[1].match(/<(a)?:([^<>:]+):(\d+)>/i);

    if (args[0] == ".emoji") {
        if (!emojiMatch) {
            return "⚠ Invalid emoji provided!";
        }
    }
    if (!emojiMatch) return;

    message.channel.startTyping();
    let animated = emojiMatch[1];
    let emojiName = emojiMatch[2];
    let emojiID = emojiMatch[3];

    let imageUrl = `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? 'gif':'png'}`;
    let response = await axios.get(imageUrl);
    let imageType = response.headers['content-type'].split('/')[1];
    let imageSize = Math.max(Math.round(response.headers['content-length']/10)/100, 1/100);

    let embed = {
        title: `Emoji \`:${emojiName}:\``,
        image: { url: imageUrl },
        footer: { text: `Type: ${imageType.toUpperCase()}  |  Size: ${imageSize}KB` }
    }

    return {embed: embed};

}
