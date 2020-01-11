const { Client } = require("../haseul.js");

exports.checkPermissions = function(member, permissions) {
    if (!member) {
        let err = new Error("Invalid member to check permissions for");
        console.error(err);
        return false;
    } else {
        let hasPerms = permissions.some(p => member.hasPermission(p, false, true, true));
        return hasPerms;
    }
}

exports.getMemberNumber = async function(member) {
    if (!member || !member.joinedTimestamp) {
        let err = new Error("Invalid member given.");
        console.error(err);
    } else {
        let guild = await member.guild.fetchMembers();
        let members = guild.members.array();
            members = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
        let memberNumber = members.findIndex(e => e.id == member.id) + 1;
        return memberNumber;
    }
}

exports.resolveUser = async function(userID) {
    if (!userID) {
        let err = new Error("No user ID provided.");
        console.error(err);
    } else {
        let user = Client.users.get(userID);
        if (!user) {
            try {
                user = await Client.fetchUser(userID, true);
            } catch(e) {
                return null;
            }
        }
        return user;
    }
}

exports.resolveMember = async function(guild, userID, member) {
    if (!guild || !userID) {
        let err = new Error("Invalid parameters given.");
        console.error(err);
    } else {
        if (!member || !member.joinedTimestamp) {
            try {
                member = await guild.fetchMember(userID, true);
            } catch(e) {
                return null;
            }
        }
        return member;
    }
}

exports.resolveMessage = async function(channel, messageID) {
    if (!channel || !messageID ||channel.messages === undefined) {
        let err = new Error("Invalid parameters given.");
        console.error(err);
    } else {
        let message = channel.messages.get(messageID);
        if (!message) {
            try {
                message = await channel.fetchMessage(messageID);
            } catch(e) {
                return null;
            }
        }
        return message;
    }
}

exports.withTyping = async function(channel, task, args) {
    if (!channel || channel.type !== "text") {
        let err = new Error("Invalid channel to type in");
        console.error(err);
    } else {
        channel.startTyping();
        let rv = await task(...args).catch(console.error);
        channel.stopTyping();
        return rv;
    }
}

exports.searchMembers = async function(guild, query) {
    
    query = query.toLowerCase();
    members = guild.members.array();

    let member;
    let memberResults = [];
    
    memberResults = members.filter(m => m.user.tag.toLowerCase() == query.toLowerCase().replace(/^@/, ''));
    if (memberResults.length < 1) {
        memberResults = members.filter(m => m.user.username.toLowerCase() == query);
        if (memberResults.length < 1) {
            memberResults = members.filter(m => m.user.username.toLowerCase().includes(query));
        }
        if (memberResults.length > 1) {
            memberResults = memberResults.sort((a,b) => {
                return a.user.username.localeCompare(b.user.username);
            }).sort((a,b)=> {
                let diff = a.user.username.length - b.user.username.length;
                if (diff == 0) return a.user.username.indexOf(query.toLowerCase()) - b.user.username.indexOf(query.toLowerCase());
                else return diff;
            }).filter(m => m.user.username.length <= memberResults[0].user.username.length);
        }
    }

    if (memberResults.length < 1) {
            memberResults = members.filter(m => m.nickname ? m.nickname.toLowerCase() == query : false);
        if (memberResults.length < 1) {
            memberResults = members.filter(m => m.nickname ? m.nickname.toLowerCase().includes(query) : false);
        }
        if (memberResults.length > 1) {
            memberResults = memberResults.sort((a,b) => {
                return a.nickname.localeCompare(b.nickname);
            }).sort((a,b)=> {
                let diff = a.nickname.length - b.nickname.length;
                if (diff == 0) return a.nickname.indexOf(query.toLowerCase()) - b.nickname.indexOf(query.toLowerCase());
                else return diff;
            }).filter(m => m.nickname.length <= memberResults[0].nickname.length);
        }
    }

    if (memberResults.length > 1) {
        let ranks = await levelsdb.getAllGuildXp(guild.id);
        memberResults = memberResults.sort((a,b) => {
            let aMem = ranks.find(x => x.userID == a.id);
            let bMem = ranks.find(x => x.userID == b.id);
            aXp = aMem ? aMem.xp : 0; bXp = bMem ? bMem.xp : 0;
            return bXp - aXp;
        })
    }

    [ member ] = memberResults;
    return member;

}

exports.embedPages = async function(message, pages, lock, timeout=600000) {
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