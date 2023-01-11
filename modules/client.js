const Discord = require('discord.js');
const { Client } = require('../haseul.js');
const { embedPages, isTextChannel, resolveMember, withTyping } = require('../functions/discord.js');
const { getPrefix } = require('../functions/bot.js');
const { getDelta } = require('../functions/functions.js');

const fs = require('fs');
const process = require('process');

exports.onReady = async function() {
    await Client.user.setActivity(`in ${Client.guilds.cache.size.toLocaleString()} servers`, { type: 'PLAYING' });
};

exports.newGuild = async function() {
    await Client.user.setActivity(`in ${Client.guilds.cache.size.toLocaleString()} servers`, { type: 'PLAYING' });
};

exports.removedGuild = async function() {
    await Client.user.setActivity(`in ${Client.guilds.cache.size.toLocaleString()} servers`, { type: 'PLAYING' });
};

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'botinfo':
    case 'binfo':
    case 'clientinfo':
        withTyping(channel, botInfo, [message]);
        break;
    case 'cachestats':
        withTyping(channel, cacheStats, [message]);
        break;
    case 'serverlist':
    case 'guildlist':
        if (message.author.id === '125414437229297664') {
            withTyping(channel, serverList, [message]);
        }
        break;
    }
};

exports.onMention = async function(message, args) {
    if (args.length == 1) {
        message.channel.send({ content: `Prefix: \`${getPrefix(message.guild.id)}\`` });
    }
};

async function botInfo(message) {
    const { guild } = message;

    let stat;
    try {
        stat = fs.readFileSync(`/proc/${process.pid}/stat`);
    } catch (e) {
        console.error(Error(e));
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }
    const statArray = stat.toString().split(/(?<!\(\w+)\s(?!\w+\))/i);
    const memory = Math.round((parseInt(statArray[23]) * 4096)/10000)/100;
    // let threads = statArray[19];

    const botMember = await resolveMember(guild, Client.user.id);
    if (!botMember) {
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }
    const uptime = getDelta(Client.uptime, 'days');
    let uptimeString = '';
    if (uptime.days) uptimeString += `${uptime.days}d `;
    if (uptime.hours) uptimeString += `${uptime.hours}h `;
    if (uptime.minutes) uptimeString += `${uptime.minutes}m `;
    if (uptime.seconds) uptimeString += `${uptime.seconds}s `;

    const status = {
        '0': 'Ready',
        '1': 'Connecting',
        '2': 'Reconnecting',
        '3': 'Idle',
        '4': 'Nearly',
        '5': 'Offline',
    };

    const embed = new Discord.MessageEmbed({
        author: { name: `${Client.user.username} Info`, icon_url: Client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        description: `<@${Client.user.id}>`,
        thumbnail: { url: Client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: botMember.displayColor || 0xffffff,
        fields: [
            { name: 'Author', value: '<@125414437229297664>', inline: true },
            { name: 'Status', value: status[Client.ws.status], inline: true },
            { name: 'Uptime', value: uptimeString, inline: true },
            { name: 'Ping', value: `${Math.floor(Client.ws.ping)}ms`, inline: true },
            { name: 'Server Count', value: Client.guilds.cache.size.toLocaleString(), inline: true },
            { name: 'Cached Users', value: Client.users.cache.size.toLocaleString(), inline: true },
            { name: 'Bot Joined', value: botMember.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: 'Bot Created', value: Client.user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: 'Memory Usage', value: memory + 'MB', inline: true },
            { name: 'Links', value: '[Website](https://haseulbot.xyz/) - [Discord](https://discord.gg/w4q5qux) - [Patreon](https://www.patreon.com/haseulbot)' },
        ],
        footer: { text: `Type ${getPrefix(message.guild.id)}help for help with ${Client.user.username}` },
    });

    message.channel.send({ embeds: [embed] });
}

async function cacheStats(message) {
    const { guild } = message;

    let stat;
    try {
        stat = fs.readFileSync(`/proc/${process.pid}/stat`);
    } catch (e) {
        console.error(Error(e));
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }
    const statArray = stat.toString().split(/(?<!\(\w+)\s(?!\w+\))/i);
    const memory = Math.round((parseInt(statArray[23]) * 4096)/10000)/100;
    // let threads = statArray[19];

    const botMember = await resolveMember(guild, Client.user.id);
    if (!botMember) {
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    const uptime = getDelta(Client.uptime, 'days');
    let uptimeString = '';
    if (uptime.days) uptimeString += `${uptime.days}d `;
    if (uptime.hours) uptimeString += `${uptime.hours}h `;
    if (uptime.minutes) uptimeString += `${uptime.minutes}m `;
    if (uptime.seconds) uptimeString += `${uptime.seconds}s `;

    let cachedMessageCount = 0;
    let cachedMembers = 0;
    let cachedPresences = 0;
    let cachedRoles = 0;
    for (const guild of Client.guilds.cache.values()) {
        cachedPresences += guild.presences.cache.size;
        cachedMembers += guild.members.cache.size;
        cachedRoles += guild.roles.cache.size;
        for (const channel of guild.channels.cache.values()) {
            if (isTextChannel(channel)) {
                cachedMessageCount += channel.messages.cache.size;
            }
        }
    }

    const embed = new Discord.MessageEmbed({
        author: { name: `${Client.user.username} Cache Statistics`, icon_url: Client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        color: botMember.displayColor || 0xffffff,
        fields: [
            { name: 'Cached Servers', value: Client.guilds.cache.size.toLocaleString(), inline: true },
            { name: 'Cached Channels', value: Client.channels.cache.size.toLocaleString(), inline: true },
            { name: 'Cached Server Members', value: cachedMembers.toLocaleString(), inline: true },
            { name: 'Cached Messages', value: cachedMessageCount.toLocaleString(), inline: true },
            { name: 'Cached Emojis', value: Client.emojis.cache.size.toLocaleString(), inline: true },
            { name: 'Cached Users', value: Client.users.cache.size.toLocaleString(), inline: true },
            { name: 'Cached Roles', value: cachedRoles.toLocaleString(), inline: true },
            { name: 'Cached Presences', value: cachedPresences.toLocaleString(), inline: true },
            { name: 'Uptime', value: uptimeString, inline: true },
            { name: 'Memory Usage', value: memory + 'MB', inline: true },
        ],
    });

    message.channel.send({ embeds: [embed] });
}

async function serverList(message) {
    let guildString = Client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).map(guild => `${guild.name} (${guild.id}) (${guild.memberCount} members)`).join('\n');

    const descriptions = [];
    while (guildString.length > 2048 || guildString.split('\n').length > 25) {
        let currString = guildString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        guildString = guildString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(guildString);

    const pages = descriptions.map((desc, i) => ({
        embeds: [{
            title: 'Server List',
            description: desc,
            color: 0xffffff,
            footer: {
                text: `Page ${i+1} of ${descriptions.length}`,
            },
        }],
    }));

    embedPages(message, pages);
}
