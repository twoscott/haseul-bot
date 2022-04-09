const { embedPages, resolveUser, withTyping } = require('../functions/discord.js');

const database = require('../db_queries/levels_db.js');
const { globalRank, guildRank, cleanMsgCache } = require('../functions/levels.js');

const lastMsgCache = new Map();
setInterval(cleanMsgCache, 300000, lastMsgCache);

exports.onMessage = async function(message) {
    updateUserXp(message);
};

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'leaderboard':
        switch (args[1]) {
        case 'global':
            withTyping(channel, leaderboard, [message, false]);
            break;
        case 'local':
        default:
            withTyping(channel, leaderboard, [message, true]);
            break;
        }
        break;
    }
};

function updateUserXp(message) {
    const { author, guild, createdTimestamp } = message;

    let addXp = 5;
    const wordcount = message.content.split(/\s+/).length;
    if (wordcount > 12) {
        addXp += 10;
    } else if (wordcount > 3) {
        addXp += 5;
    }
    if (message.attachments.size > 0) {
        addXp += 10;
    }

    if (createdTimestamp - lastMsgCache
        .get(author.id) < 15000 /* 15 seconds*/) {
        addXp = Math.floor(addXp/5);
    }

    lastMsgCache.set(author.id, createdTimestamp);
    database.updateGlobalXp(author.id, addXp);
    database.updateGuildXp(author.id, guild.id, addXp);
}

async function leaderboard(message, local) {
    const { guild } = message;
    let ranks = local ? await database.getAllGuildXp(guild.id) :
        await database.getAllGlobalXp();

    if (ranks.length < 1) {
        message.channel.send(`⚠ Nobody${local ? ' on this server ':' '}currently has any xp!`);
        return;
    }

    const entries = ranks.length;
    const originalRanks = ranks.slice();
    ranks = ranks.sort((a, b) => b.xp - a.xp)
        .slice(0, 100); // show only top 100
    for (let i = 0; i < ranks.length; i++) {
        const rank = ranks[i];
        const user = await resolveUser(rank.userID);
        const name = user ? user.username.replace(/([\`\*\~\_])/g, '\\$&') : rank.userID;
        ranks[i] = {
            userID: rank.userID, name,
            lvl: local ?
                guildRank(rank.xp).lvl :
                globalRank(rank.xp).lvl, xp: rank.xp,
        };
    }

    let rankString = ranks.map((data, i) => `${i+1}. **${data.name.replace(/([\(\)\`\*\~\_])/g, '\\$&')}** (Lvl ${data.lvl} - ${data.xp.toLocaleString()} XP)`).join('\n');

    const descriptions = [];
    while (rankString.length > 2048 || rankString.split('\n').length > 25) {
        let currString = rankString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rankString = rankString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(rankString);

    const pages = descriptions.map((desc, i) => ({
        embed: {
            author: {
                name: `${local ? guild.name : 'Global'} Leaderboard`, icon_url: 'https://i.imgur.com/qfUfBps.png',
            },
            description: desc,
            color: 0x6d5ffb,
            footer: {
                text: `Entries: ${entries}  |  Avg. Lvl: ${Math.round(originalRanks.reduce((acc, curr) => acc + local ? guildRank(curr.xp).lvl : globalRank(curr.xp).lvl, 0) / originalRanks.length)}  |  Page ${i+1} of ${descriptions.length}`,
            },
        },
    }));

    embedPages(message, pages);
}
