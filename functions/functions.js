// Require modules

const Discord = require("discord.js");
const Client = require("../haseul").Client;

const levelsdb = require("../db_queries/levels_db.js");

//Functions

exports.capitalise = (text) => {
    return text[0].toUpperCase() + text.slice(1).toLowerCase();
}

exports.randomHexColor = () => {
    
    let rgb = [];
    let full = Math.floor(Math.random() * 3);
    rgb[full] = 'ff';

    for (let i = 0; i < 3; i++) {
        if (i == full) continue;
        rgb[i] = Math.floor(Math.random() * 256).toString(16);
    }

    return parseInt(rgb.join(''), 16);

}

exports.searchMembers = async (guild, query) => {
    
    query = query.toLowerCase();
    members = guild.members.array();

    let member;
    let memberResults = [];
    
    memberResults = members.filter(m => m.user.tag.toLowerCase() == query.toLowerCase().replace(/^@/, ''));
    if (memberResults.length < 1) {
        memberResults = members.filter(m => m.user.username.toLowerCase() == query);
    }
    if (memberResults.length < 1) {
        memberResults = members.filter(m => m.user.username.toLowerCase().includes(query));
    }
    if (memberResults.length < 1) {
        memberResults = members.filter(m => m.nickname ? m.nickname.toLowerCase() == query : false);
    }
    if (memberResults.length < 1) {
        memberResults = members.filter(m => m.nickname ? m.nickname.toLowerCase().includes(query) : false);
    }

    if (memberResults.length > 1) {
        let ranks = await levelsdb.get_all_guild_xp(guild.id);
        memberResults = memberResults.sort((a,b) => {
            return a.user.username.localeCompare(b.user.username);
        }).sort((a,b)=> {
            let diff = query.length / b.length - query.length / a.length;
            if (diff == 0) return a.indexOf(query.toLowerCase()) - b.indexOf(query.toLowerCase());
            else return diff;
        }).sort((a,b) => {
            let aMem = ranks.find(x => x.userID == a.id);
            let bMem = ranks.find(x => x.userID == b.id);
            aXp = aMem ? aMem.xp : 0; bXp = bMem ? bMem.xp : 0;
            return bXp - aXp;
        });
    }

    [ member ] = memberResults;
    return member;

}

exports.getTimeAgo = (time, limit) => {

    let currTime = Date.now() / 1000;
    let timeDiffSecs = currTime - time;
    let timeAgoText;
    let timeAgo;

    if (timeDiffSecs < 60 || limit == 'seconds') {            //60 = minute
        timeAgo = Math.floor(timeDiffSecs);
        timeAgoText = timeAgo > 1 ? `${timeAgo}secs ago` : `${timeAgo}sec ago`;
    } else if (timeDiffSecs < 3600 || limit == 'minutes') {   //3600 = hour
        timeAgo = Math.floor((timeDiffSecs) / 60);
        timeAgoText = timeAgo > 1 ? `${timeAgo}mins ago` : `${timeAgo}min ago`;
    } else if (timeDiffSecs < 86400 || limit == 'hours') {  //86400 = day
        timeAgo = Math.floor((timeDiffSecs) / 3600);
        timeAgoText = timeAgo > 1 ?  `${timeAgo}hrs ago` :  `${timeAgo}hr ago`;
    } else if (timeDiffSecs < 604800 || limit == 'days') { //604800 = week
        timeAgo = Math.floor((timeDiffSecs) / 86400);
        timeAgoText = timeAgo > 1 ? `${timeAgo}days ago` : `${timeAgo}day ago`;
    } else {                            //More than a week
        timeAgo = Math.floor((timeDiffSecs) / 604800)
        timeAgoText = timeAgo > 1 ?  `${timeAgo}wks ago` :  `${timeAgo}wk ago`;
    }

    return timeAgoText;
    
}

exports.getTimeFrom = (startTime, endTime) => {

    startTimeSec = startTime / 1000;
    endTimeSec = endTime / 1000;
    let timeDiffSecs = Math.ceil(endTimeSec - startTimeSec);
    let hours, minutes, seconds;

    if (timeDiffSecs > 0) { // more than 0 seconds
        seconds = Math.floor(timeDiffSecs % 60);
    }
    if (timeDiffSecs > 60) { // more than a minute
        minutes = Math.floor(timeDiffSecs % 3600 / 60);
    }
    if (timeDiffSecs > 60*60) { // more than an hour
        hours   = Math.floor(timeDiffSecs / 3600);
    }

    return { ms: endTime - startTime, hours: hours, minutes: minutes, seconds: seconds };

}

exports.pages = async (message, pages, lock, timeout=600000/*ms*/) => {
    let p = 0;

    if (pages.length < 2) {
        message.channel.send(pages[p].content, pages[p].options);
    } else {
        message.channel.send(pages[p].content, pages[p].options).then(async reply => {

            let listeners = [];

            let locked = false;
            let lockListener;
            if (lock) {
                await reply.react("🔒");
                lockListener = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "🔒" && !user.bot, {time: timeout});
                listeners.push(lockListener);
                lockListener.on("end", () => {
                    reply.clearReactions();
                    lockListener.stop()
                })

                lockListener.on("collect", reaction => {
                    let users = reaction.users.array();
                    if (users[users.length - 1].id != message.author.id) {
                        for (i=0; i < users.length; i++) {
                            let user = users[i];
                            if (user != Client.user) {
                                reaction.remove(user);
                            }
                        }
                        return;
                    }
                    
                    locked = true;
                    for (i=0; i < listeners.length; i++) {
                        listeners[i].stop();
                    }
                    reply.clearReactions();
                })
            
            }

            if (!locked) {
                await reply.react("⏮");
                const pageBeginning = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏮" && !user.bot, {time: timeout});
                listeners.push(pageBeginning);
                pageBeginning.on("end", () => {
                    reply.clearReactions();
                    pageBeginning.stop()
                })
                pageBeginning.on("collect", reaction => {
                    let users = reaction.users.array();
                    if (lock && users[users.length - 1].id != message.author.id) {
                        for (i=0; i < users.length; i++) {
                            let user = users[i];
                            if (user != Client.user) {
                                reaction.remove(user);
                            }
                        }
                        return;
                    }
                    if (p != 0) {
                        p = 0;
                        reply.edit(pages[p].content, pages[p].options);
                    }

                    for (i=0; i < users.length; i++) {
                        let user = users[i];
                        if (user != Client.user) {
                            reaction.remove(user);
                        }
                    }
                })
            }
            
            if (!locked) {
                await reply.react("⬅");
                const pageBack = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⬅" && !user.bot, {time: timeout});
                listeners.push(pageBack);
                pageBack.on("end", () => {
                    reply.clearReactions();
                    pageBack.stop()
                })
                pageBack.on("collect", reaction => {
                    let users = reaction.users.array();
                    if (lock && users[users.length - 1].id != message.author.id) {
                        for (i=0; i < users.length; i++) {
                            let user = users[i];
                            if (user != Client.user) {
                                reaction.remove(user);
                            }
                        }
                        return;
                    }
                    if (p < 1) {
                        p = pages.length - 1;
                    } else {
                        p--;
                    }
                    reply.edit(pages[p].content, pages[p].options);

                    for (i=0; i < users.length; i++) {
                        let user = users[i];
                        if (user != Client.user) {
                            reaction.remove(user);
                        }
                    }
                })   
            }
            
            if (!locked) {
                await reply.react("➡");
                const pageForward = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "➡" && !user.bot, {time: timeout});
                listeners.push(pageForward);
                pageForward.on("end", () => {
                    reply.clearReactions();
                    pageForward.stop()
                })
                pageForward.on("collect", reaction => {
                    let users = reaction.users.array();
                    if (lock && users[users.length - 1].id != message.author.id) {
                        for (i=0; i < users.length; i++) {
                            let user = users[i];
                            if (user != Client.user) {
                                reaction.remove(user);
                            }
                        }
                        return;
                    }
                    if (p >= pages.length - 1) {
                        p = 0;
                    } else {
                        p++;
                    }
                    reply.edit(pages[p].content, pages[p].options);

                    for (i=0; i < users.length; i++) {
                        let user = users[i];
                        if (user != Client.user) {
                            reaction.remove(user);
                        }
                    }
                })
            }  

            if (!locked) {
                await reply.react("⏭");
                const pageEnd = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏭" && !user.bot, {time: timeout});
                listeners.push(pageEnd);
                pageEnd.on("end", () => {
                    reply.clearReactions();
                    pageEnd.stop()
                })        
                pageEnd.on("collect", reaction => {
                    let users = reaction.users.array();
                    if (lock && users[users.length - 1].id != message.author.id) {
                        for (i=0; i < users.length; i++) {
                            let user = users[i];
                            if (user != Client.user) {
                                reaction.remove(user);
                            }
                        }
                        return;
                    }
                    if (p != pages.length - 1) {
                        p = pages.length - 1;
                        reply.edit(pages[p].content, pages[p].options);
                    }

                    for (i=0; i < users.length; i++) {
                        let user = users[i];
                        if (user != Client.user) {
                            reaction.remove(user);
                        }
                    }
                })
            }

            if (locked) listeners.forEach(l => l.stop());
            

        })
    }
    
}
