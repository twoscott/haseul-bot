const { Client } = require("../haseul.js");

const levels = require("../functions/levels.js");
const functions = require("../functions/functions.js");
const database = require("../db_queries/levels_db.js");

let lastMsgCache = new Map();

function cleanMsgCache(lastMsgCache) {
    let now = Date.now();
    console.log("Clearing message timestamp cache...");
    console.log("Cache size before: " + lastMsgCache.size);
    for (let [userID, lastMsgTime] of lastMsgCache) {
        if (now - lastMsgTime > 300000 /*5 mins*/) {
            lastMsgCache.delete(userID);
        }
    }
    console.log("Cache size after:  " + lastMsgCache.size);
}
setInterval(cleanMsgCache, 300000 /*5 mins*/, lastMsgCache);

async function updateUserXp(message) {
    
    let { author, guild, createdTimestamp } = message;

    let addXp = 5;
    let wordcount = message.content.split(/\s+/).length;
    if (wordcount > 12) {
        addXp += 10;
    } else if (wordcount > 3) {
        addXp += 5;
    }
    if (message.attachments.size > 0) {
        addXp += 10;
    }

    if (createdTimestamp - lastMsgCache.get(author.id) < 15000 /*15 seconds*/) {
        addXp = Math.floor(addXp/5);
    }

    lastMsgCache.set(author.id, createdTimestamp);
    database.updateGlobalXp(author.id, addXp);
    database.updateGuildXp(author.id, guild.id, addXp);

}

exports.msg = async function(message, args) {

    updateUserXp(message);
    
    switch (args[0]) {

        case ".leaderboard":
            switch(args[1]) {

                case "global":
                    message.channel.startTyping();
                    leaderboard(message, false).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;
                
                case "local":
                default:
                    message.channel.startTyping();
                    leaderboard(message, true).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

            }
            break;
        

    }

}

async function leaderboard(message, local) {

    let { guild } = message;
    let ranks = local ? await database.getAllGuildXp(guild.id) :
                        await database.getAllGlobalXp();

    ranks = ranks.sort((a,b) => b.xp - a.xp).slice(0,100); // show only top 100
    for (let i = 0; i < ranks.length; i++) {
        let rank = ranks[i]
        let user = Client.users.get(rank.userID);
        if (!user) user = await Client.fetchUser(rank.userID);
        let name = user ? user.username.replace(/([\`\*\~\_])/g, "\\$&") : rank.userID;
        ranks[i] = {
            userID: rank.userID, name: name,
            lvl: local ? levels.guildRank(rank.xp).lvl : levels.globalRank(rank.xp).lvl, xp: rank.xp
        }
    }

    let rankString = ranks.sort((a,b) => a.name.localeCompare(b.name)).sort((a,b) => b.xp - a.xp).map((data, i) => `${i+1}. **${data.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}** (Lvl ${data.lvl} - ${data.xp.toLocaleString()} XP)`).join('\n');

    let descriptions = [];
    while (rankString.length > 2048 || rankString.split('\n').length > 25) {
        let currString = rankString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rankString = rankString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(rankString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: `${local ? guild.name : `Global`} Leaderboard`, icon_url: 'https://i.imgur.com/qfUfBps.png'
                },
                description: desc,
                color: 0x6d5ffb,
                footer: {
                    text: `Entries: ${ranks.length}  |  Avg. Lvl: ${Math.round(ranks.reduce((acc, curr) => acc + curr.lvl, 0) / ranks.length)}  |  Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    functions.pages(message, pages);

}
