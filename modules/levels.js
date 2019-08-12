// Require modules

const Client = require("../haseul.js").Client;

const functions = require("../functions/functions.js");

const database = require("../db_queries/levels_db.js");

// Functions

function guildRank(xp) {
    let lvl = Math.floor(Math.log(xp/1000+100)/Math.log(10) * 200 - 399);
    let baseXp = Math.ceil(((10**((lvl+399)/200))-100)*1000);
    let nextXp = Math.ceil(((10**((lvl+400)/200))-100)*1000);
    return { lvl, baseXp, nextXp };
}

function globalRank(xp) {
    let lvl = Math.floor(Math.log(xp/1000+100)/Math.log(10) * 150 - 299);
    let baseXp = Math.ceil(((10**((lvl+299)/150))-100)*1000);
    let nextXp = Math.ceil(((10**((lvl+1+300)/150))-100)*1000);
    return { lvl, baseXp, nextXp };
}

async function updateUserXp(message) {
    
    let { author, guild, createdTimestamp } = message;

    let globalXp = await database.get_global_xp(author.id);
    if (!globalXp) {
        await database.init_global_xp(author.id);
        globalXp = await database.get_global_xp(author.id);
    }

    await database.set_last_msg(author.id, createdTimestamp);
    await database.init_guild_xp(author.id, guild.id);

    let addXp = 5;
    let wordcount = message.content.split(/\s+/).length;
    if (wordcount > 12) {
        addXp += 10;
    } 
    else if (wordcount > 3) {
        addXp += 5;
    }
    if (message.attachments.size > 0) {
        addXp += 10;
    }

    if (createdTimestamp - globalXp.lastMsgTimestamp < 15000 /*15 seconds*/) {
        addXp = Math.floor(addXp/5);
    }

    await database.update_global_xp(author.id, addXp);
    await database.update_guild_xp(author.id, guild.id, addXp);

}

exports.msg = async function(message, args) {

    updateUserXp(message);

    // Handle commands

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
    let ranks = local ? await database.get_all_guild_xp(guild.id) :
                        await database.get_all_global_xp();

    ranks = ranks.sort((a,b) => b.xp - a.xp).slice(0,100); // show only top 100
    for (let i = 0; i < ranks.length; i++) {
        let rank = ranks[i]
        let user = Client.users.get(rank.userID);
        if (!user) user = await Client.fetchUser(rank.userID);
        let name = user ? user.username.replace(/([\`\*\~\_])/g, "\\$&") : rank.userID;
        ranks[i] = {
            userID: rank.userID, name: name,
            lvl: local ? guildRank(rank.xp).lvl : globalRank(rank.xp).lvl, xp: rank.xp
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

exports.guildRank = guildRank;
exports.globalRank = globalRank;