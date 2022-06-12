const Discord = require('discord.js');
const { embedPages, withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const axios = require('axios');

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'emojis':
    case 'emoji':
        switch (args[1]) {
        case 'list':
            withTyping(channel, listEmojis, [message]);
            break;
        case 'search':
            withTyping(channel, searchEmojis, [message, args[2]]);
            break;
        case 'help':
            channel.send({ content: 'Help with emojis can be found here: https://haseulbot.xyz/#emoji' });
            break;
        default:
            withTyping(channel, largeEmoji, [message, args]);
            break;
        }
        break;
    }
};

exports.onMention = async function(message, args) {
    switch (args[0]) {
    case `<@${Client.user.id}>`:
    case `<@!${Client.user.id}>`:
        largeEmoji(message, args);
        break;
    }
};

async function listEmojis(message) {
    const { guild } = message;
    let emojis = guild.emojis.cache;

    if (emojis.size < 1) {
        message.channel.send({ content: '⚠ There are no emojis added to this server.' });
        return;
    }

    emojis = emojis.filter(x => x['_roles'].size < 1);
    const staticEmojis = emojis
        .filter(x => !x.animated).sort((a, b) => a.name.localeCompare(b.name));
    const animatedEmojis = emojis
        .filter(x => x.animated).sort((a, b) => a.name.localeCompare(b.name));
    let emojiString = staticEmojis.concat(animatedEmojis).map(x => `<${x.animated ? 'a':''}:${x.name}:${x.id}> \`:${x.name}:\`` + (x.animated ? ' (animated)' : '')).join('\n');

    const descriptions = [];
    while (emojiString.length > 2048 || emojiString.split('\n').length > 25) {
        let currString = emojiString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        emojiString = emojiString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(emojiString);

    const pages = descriptions.map((desc, i) => ({
        embeds: [{
            author: {
                name: `${emojis.length} Emoji${emojis.length != 1 ? 's':''} - ${staticEmojis.length} Static; ${animatedEmojis.length} Animated`, icon_url: 'https://i.imgur.com/hIpmRU2.png',
            },
            description: desc,
            color: 0xffcc4d,
            footer: {
                text: `Page ${i+1} of ${descriptions.length}`,
            },
        }],
    }));

    embedPages(message, pages);
}

async function searchEmojis(message, query) {
    if (!query) {
        message.channel.send({ content: '⚠ Please provide a search query.' });
        return;
    }

    const { guild } = message;
    const emojis = guild.emojis.cache
        .filter(x => x.name.toLowerCase().includes(query.toLowerCase()));

    if (emojis.size < 1) {
        message.channel.send({ content: `⚠ No results were found searching for "${query}".` });
        return;
    }

    let emojiString = emojis
        .sort((a, b) => a.name.localeCompare(b.name))
        .sort((a, b)=> {
            const diff = query.length / b.name.length -
                query.length / a.name.length;
            if (diff == 0) {
                return a.name.indexOf(query.toLowerCase()) -
                    b.name.indexOf(query.toLowerCase());
            } else {
                return diff;
            }
        }).map(x => `<${x.animated ? 'a':''}:${x.name}:${x.id}> \`:${x.name}:\`` + (x.animated ? ' (animated)' : '')).join('\n');

    const descriptions = [];
    while (emojiString.length > 2048 || emojiString.split('\n').length > 25) {
        let currString = emojiString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        emojiString = emojiString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(emojiString);

    const pages = descriptions.map((desc, i) => ({
        embeds: [{
            author: {
                name: `${emojis.length} Result${emojis.length != 1 ? 's':''} Found for "${query.slice(0, 30)}"`, icon_url: 'https://i.imgur.com/hIpmRU2.png',
            },
            description: desc,
            color: 0xffcc4d,
            footer: {
                text: `Page ${i+1} of ${descriptions.length}`,
            },
        }],
    }));

    embedPages(message, pages);
}

async function largeEmoji(message, args) {
    if (args[0] == 'emoji' && args.length < 2) {
        message.channel.send({ content: '⚠ Please provide an emoji to enlarge.' });
        return;
    } else if (message.mentions.length < 1 || args.length < 2) {
        return;
    }

    const emojiMatch = args[1].match(/<(a)?:([^<>:]+):(\d+)>/i);

    if (!emojiMatch) {
        if (args[0] == 'emoji') {
            message.channel.send({ content: '⚠ Invalid emoji provided!' });
        }
        return;
    }

    message.channel.sendTyping();
    const animated = emojiMatch[1];
    const emojiName = emojiMatch[2];
    const emojiID = emojiMatch[3];

    const imageUrl = `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? 'gif':'png'}`;
    const response = await axios.head(imageUrl);
    const imageType = response.headers['content-type'].split('/')[1];
    const imageSize = Math.max(Math.round(response.headers['content-length']/10)/100, 1/100);

    const embed = new Discord.MessageEmbed({
        title: `Emoji \`:${emojiName}:\``,
        image: { url: imageUrl },
        footer: { text: `Type: ${imageType.toUpperCase()}  |  Size: ${imageSize}KB` },
    });

    message.channel.send({ embeds: [embed] });
}
