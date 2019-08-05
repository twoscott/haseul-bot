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
    
    let { author, guild, channel, createdTimestamp } = message;
    
    let exclusionChannels = await database.get_xp_exclusions()
    if (exclusionChannels.find(row => row.channelID == channel.id)) return;

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

    if (createdTimestamp - globalXp.lastMsgTimestamp < 10000 /*10 seconds*/) {
        addXp = Math.floor(addXp/5);
    }

    await database.update_global_xp(author.id, addXp);
    await database.update_guild_xp(author.id, guild.id, addXp);

}

exports.msg = async function(message, args) {

    updateUserXp(message);

    // Handle commands

    switch (args[0]) {

        case ".level":
        case ".levels":
            switch (args[1]) {

                case "exclude":
                    message.channel.startTyping();
                    exclude_channel(message, args.slice(2)).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "include":
                        message.channel.startTyping();
                        include_channel(message, args.slice(2)).then(response => {
                            if (response) message.channel.send(response);
                            message.channel.stopTyping();
                        }).catch(error => {
                            console.error(error);
                            message.channel.stopTyping();
                        })
                        break;

            }
            break;

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

async function exclude_channel(message, args) {

    let perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
    if (!perms.some(p => message.member.hasPermission(p))) return `⚠ You are not authorised to do this!`;

    let { guild, channel } = message;
    let channel_id;
    if (args.length < 1) {
        channel_id = channel.id;
    } else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return"⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    
    channel = guild.channels.get(channel_id);
    if (!channel) {
        return "⚠ Channel doesn't exist in this server.";
    }

    switch (channel.type) {
        case "text":
            let added = await database.add_xp_exclusion(guild.id, channel_id);
            if (!added) {
                return `⚠ <#${channel_id}> is already excluded from awarding users with xp.`;
            }
            return `<#${channel_id}> is now excluded from awarding users with xp.`;
        case "category":
            if (channel.children.size == 0) return `⚠ There are no channels in ${channel.name}`;
            
            let textChans = 0;
            let addedTotal = 0;
            let children = channel.children.array();
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child.type != 'text') continue;
                let added = await database.add_xp_exclusion(guild.id, child.id);
                addedTotal += +added; textChans += 1;
            }

            if (textChans <= 0) {
                return `⚠ There are no text channels belonging to \`${channel.name}\`.`;
            } else if (addedTotal <= 0) {
                return `⚠ All text channels in \`${channel.name}\` are already excluded from awarding users with xp.`;
            } else if (addedTotal == channel.children.size) {
                return `All text channels in \`${channel.name}\` are now excluded from awarding users with xp.`;
            }
            return `${addedTotal} channel${addedTotal != 1 ? 's':''} in \`${channel.name}\` are now excluded from awarding users with xp.`;
        default:
            return `⚠ \`${channel.name}\` is not a text chanel.`;
    }

}

async function include_channel(message, args) {

    let perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
    if (!perms.some(p => message.member.hasPermission(p))) return `⚠ You are not authorised to do this!`;

    let { guild, channel } = message;
    let channel_id;
    if (args.length < 1) {
        channel_id = channel.id;
    } else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return"⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    
    channel = guild.channels.get(channel_id);
    if (!channel) {
        return "⚠ Channel doesn't exist in this server.";
    }

    switch (channel.type) {
        case "text":
            let added = database.del_xp_exclusion(guild.id, channel_id);
            if (!added) {
                return `⚠ <#${channel_id}> is not excluded from awarding users with xp.`;
            }
            return `<#${channel_id}> is now included in awarding users with xp.`;
        case "category":
            if (channel.children.size == 0) return `⚠ There are no channels in ${channel.name}`;
            
            let textChans = 0;
            let addedTotal = 0;
            let children = channel.children.array();
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child.type != 'text') continue;
                let added = await database.del_xp_exclusion(guild.id, child.id);
                addedTotal += +added; textChans += 1;
            }

            if (textChans <= 0) {
                return `⚠ There are no text channels belonging to \`${channel.name}\`.`;
            } else if (addedTotal <= 0) {
                return `⚠ All text channels in \`${channel.name}\` are already included in awarding users with xp.`;
            } else if (addedTotal == channel.children.size) {
                return `All text channels in \`${channel.name}\` are now included from awarding users with xp.`;
            }
            return `${addedTotal} channel${addedTotal != 1 ? 's':''} in \`${channel.name}\` are now included from awarding users with xp.`;
        default:
            return `⚠ \`${channel.name}\` is not a text chanel.`;
    }

}

async function leaderboard(message, local) {

    let { guild } = message;
    let ranks = local ? await database.get_all_guild_xp(guild.id) :
                        await database.get_all_global_xp();

    ranks = ranks.slice(0,100); // show only top 100
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

    let rankString = ranks.sort((a,b) => a.name.localeCompare(b.name)).sort((a,b) => b.xp - a.xp).map((data, i) => `${i+1}. **${data.name}** (Lvl **${data.lvl}** - ${data.xp.toLocaleString()} XP)`).join('\n');

    let descriptions = [];
    while (rankString.length > 2048 || rankString.split('\n').length > 20) {
        let currString = rankString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
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