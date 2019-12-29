const { Client } = require("../haseul.js");

const axios = require("axios");
const functions = require("../functions/functions.js");

exports.msg = async function(message, args) {
    
    switch (args[0]) {

        case ".emojis":
        case ".emoji":
            switch (args[1]) {

                case "list":
                    message.channel.startTyping();
                    listEmojis(message).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break; 
                    
                case "search":
                    message.channel.startTyping();
                    searchEmojis(message, args[2]).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "help":
                    message.channel.send("Help with emojis can be found here: https://haseulbot.xyz/#emoji");
                    break;

                default:
                    emoji_function(message, args).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

            }
            break;

        case `<@${Client.user.id}>`:
            emoji_function(message, args).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }

}

async function listEmojis(message) {

    let { guild } = message;
    let emojis = guild.emojis.array()

    if (emojis.length < 1) {
        return "⚠ There are no emojis added to this server.";    
    }

    emojis = emojis.filter(x => x['_roles'].length < 1);
    let staticEmojis = emojis.filter(x => !x.animated).sort((a,b) => a.name.localeCompare(b.name));
    let animatedEmojis = emojis.filter(x => x.animated).sort((a,b) => a.name.localeCompare(b.name));
    let emojiString = staticEmojis.concat(animatedEmojis).map(x => `<${x.animated ? 'a':''}:${x.name}:${x.id}> \`:${x.name}:\`` + (x.animated ? ` (animated)` : ``)).join('\n');

    let descriptions = [];
    while (emojiString.length > 2048 || emojiString.split('\n').length > 25) {
        let currString = emojiString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString  = currString.slice(0, lastIndex);
        emojiString = emojiString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(emojiString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: `${emojis.length} Emojis - ${staticEmojis.length} Static; ${animatedEmojis.length} Animated`, icon_url: 'https://i.imgur.com/hIpmRU2.png'
                },
                description: desc,
                color: 0xffcc4d,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    functions.pages(message, pages);

}

async function searchEmojis(message, query) {

    if (!query) {
        return "⚠ Please provide a search query.";
    }

    let { guild } = message;
    let emojis = guild.emojis.array().filter(x => x.name.toLowerCase().includes(query.toLowerCase()));

    if (emojis.length < 1) {
        return `⚠ No results were found searching for "${query}".`;
    }
    
    let emojiString = emojis.sort((a,b) => a.name.localeCompare(b.name)).sort((a, b)=> {
        let diff = query.length / b.name.length - query.length / a.name.length;
        if (diff == 0) return a.name.indexOf(query.toLowerCase()) - b.name.indexOf(query.toLowerCase());
        else return diff;
    }).map(x => `<${x.animated ? 'a':''}:${x.name}:${x.id}> \`:${x.name}:\`` + (x.animated ? ` (animated)` : ``)).join('\n');

    let descriptions = [];
    while (emojiString.length > 2048 || emojiString.split('\n').length > 25) {
        let currString = emojiString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString  = currString.slice(0, lastIndex);
        emojiString = emojiString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(emojiString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: `${emojis.length} Results found for "${query.slice(0,30)}"`, icon_url: 'https://i.imgur.com/hIpmRU2.png'
                },
                description: desc,
                color: 0xffcc4d,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    functions.pages(message, pages);

}

async function emoji_function(message, args) {

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
    let b = Date.now()
    let response = await axios.head(imageUrl);
    console.log('took ' + (Date.now() - b) + 'ms');
    let imageType = response.headers['content-type'].split('/')[1];
    let imageSize = Math.max(Math.round(response.headers['content-length']/10)/100, 1/100);

    let embed = {
        title: `Emoji \`:${emojiName}:\``,
        image: { url: imageUrl },
        footer: { text: `Type: ${imageType.toUpperCase()}  |  Size: ${imageSize}KB` }
    }

    return {embed: embed};

}
