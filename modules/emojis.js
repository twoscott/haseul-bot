// Require modules

const Discord = require("discord.js");

const functions = require("../functions/functions.js");

// Functions 

exports.msg = async function (message, args) {
    
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
            }

    }

}

const listEmojis = async function (message) {

    let { guild } = message;
    let emojis = guild.emojis.array()

    if (emojis.length < 1) {
        return "⚠ There are no emojis added to this server.";    
    }

    let staticEmojis = emojis.filter(x => !x.animated).sort((a,b) => a.name.localeCompare(b.name));
    let animatedEmojis = emojis.filter(x => x.animated).sort((a,b) => a.name.localeCompare(b.name));
    let emojiString = staticEmojis.concat(animatedEmojis).map(x => `:${x.name}:` + (x.animated ? ` (animated)` : ``)).join('\n');

    let descriptions = [];
    while (emojiString.length > 2048 || emojiString.split('\n').length > 20) {
        let currString = emojiString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
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
            attachments: {embed: {
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

const searchEmojis = async function (message, query) {

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
    }).map(x => `:${x.name}:` + (x.animated ? ` (animated)` : ``)).join('\n');

    let descriptions = [];
    while (emojiString.length > 2048 || emojiString.split('\n').length > 20) {
        let currString = emojiString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
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
            attachments: {embed: {
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