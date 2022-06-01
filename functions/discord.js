const { Client } = require('../haseul.js');
const { getAllGuildXp } = require('../db_queries/levels_db.js');

exports.checkPermissions = function(member, permissions, checkAdmin=true) {
    if (!member) {
        const err = new Error('Invalid member to check permissions for');
        console.error(err);
    } else {
        return member.permissions.any(permissions, checkAdmin);
    }
};

exports.getMemberNumber = async function(member) {
    if (!member || !member.joinedTimestamp) {
        const err = new Error('Invalid member given.');
        console.error(err);
    } else {
        let members = await member.guild.members.fetch().catch(console.error);
        if (members) {
            members = members.values();
            members = members
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
            const memberNumber = members.findIndex(e => e.id == member.id) + 1;
            return memberNumber;
        }
    }
};

exports.resolveUser = async function(userID, cache=false) {
    if (!userID) {
        const err = new Error('No user ID provided.');
        console.error(err);
    } else {
        try {
            const user = await Client.users.fetch(userID, cache);
            return user;
        } catch (e) {
            return null;
        }
    }
};

exports.resolveMember = async function(guild, userID, cache=false) {
    if (!guild || !userID) {
        const err = new Error('Invalid parameters given.');
        console.error(err);
    } else {
        try {
            const member = await guild.members.fetch({ user: userID, cache });
            return member;
        } catch (e) {
            return null;
        }
    }
};

exports.resolveMessage = async function(channel, messageID, cache=false) {
    if (!channel || !messageID || channel.messages === undefined) {
        const err = new Error('Invalid parameters given.');
        console.error(err);
    } else {
        try {
            const message = await channel.messages.fetch(messageID, cache);
            return message;
        } catch (e) {
            return null;
        }
    }
};

exports.resolveRole = async function(guild, roleID, cache=false) {
    if (!guild || !roleID) {
        const err = new Error('Invalid parameters given.');
        console.error(err);
    } else {
        try {
            const role = await guild.roles.fetch(roleID);
            return role;
        } catch (e) {
            return null;
        }
    }
};

exports.sendAndDelete = async function(channel, options, timeout=1000) {
    if (!channel || !options) {
        const err = new Error('Invalid parameters given.');
        console.error(err);
    } else {
        const message = await channel.send(options);
        message.delete({ timeout });
    }
};

exports.withTyping = async function(channel, task, args) {
    if (!channel || (channel.type !== 'GUILD_TEXT' && channel.type !== 'GUILD_NEWS')) {
        const err = new Error('Invalid channel to type in');
        console.error(err);
    } else {
        channel.sendTyping().catch(console.error);
        const rv = await task(...args).catch(console.error);
        return rv;
    }
};

exports.searchMembers = async function(members, query) {
    query = query.toLowerCase();
    members = members.array();

    let memberResults = [];
    memberResults = members.filter(m => m.user.tag.toLowerCase() == query.toLowerCase().replace(/^@/, ''));
    if (memberResults.length < 1) {
        memberResults = members
            .filter(m => m.user.username.toLowerCase() == query);
        if (memberResults.length < 1) {
            memberResults = members
                .filter(m => m.user.username.toLowerCase().includes(query));
        }
        if (memberResults.length > 1) {
            memberResults = memberResults
                .sort((a, b) => a.user.username.localeCompare(b.user.username))
                .sort((a, b)=> {
                    const diff = a.user.username.length -
                        b.user.username.length;
                    if (diff == 0) {
                        return a.user.username
                            .indexOf(query.toLowerCase()) - b.user.username
                            .indexOf(query.toLowerCase());
                    } else {
                        return diff;
                    }
                })
                .filter(m => m.user.username.length <=
                        memberResults[0].user.username.length,
                );
        }
    }

    if (memberResults.length < 1) {
        memberResults = members
            .filter(m => m.nickname ?
                m.nickname.toLowerCase() == query :
                false,
            );
        if (memberResults.length < 1) {
            memberResults = members
                .filter(m => m.nickname ?
                    m.nickname.toLowerCase().includes(query) :
                    false,
                );
        }
        if (memberResults.length > 1) {
            memberResults = memberResults
                .sort((a, b) => a.nickname.localeCompare(b.nickname))
                .sort((a, b)=> {
                    const diff = a.nickname.length - b.nickname.length;
                    if (diff == 0) {
                        return a.nickname
                            .indexOf(query.toLowerCase()) - b.nickname
                            .indexOf(query.toLowerCase());
                    } else {
                        return diff;
                    }
                })
                .filter(m => m.nickname.length <=
                memberResults[0].nickname.length,
                );
        }
    }

    if (memberResults.length > 1) {
        const ranks = await getAllGuildXp(memberResults[0].guild.id);
        memberResults = memberResults.sort((a, b) => {
            const aMem = ranks.find(x => x.userID == a.id);
            const bMem = ranks.find(x => x.userID == b.id);
            aXp = aMem ? aMem.xp : 0; bXp = bMem ? bMem.xp : 0;
            return bXp - aXp;
        });
    }

    const [member] = memberResults;
    return member;
};

exports.embedPages = async function(
    { channel, author }, pages, lock, time=600000) {
    let page = 0;

    if (pages.length < 2) {
        channel.send(pages[page]);
    } else {
        const reply = await channel.send(pages[page]);
        await reply.react('⏮');
        await reply.react('⬅');
        await reply.react('➡');
        await reply.react('⏭');
        const firstPageCollector = reply.createReactionCollector((reaction, user) => reaction.emoji.name == '⏮', { time });
        const prevPageCollector = reply.createReactionCollector((reaction, user) => reaction.emoji.name == '⬅', { time });
        const nextPageCollector = reply.createReactionCollector((reaction, user) => reaction.emoji.name == '➡', { time });
        const lastPageCollector = reply.createReactionCollector((reaction, user) => reaction.emoji.name == '⏭', { time });

        firstPageCollector.on('collect', (reaction, user) => {
            if (user.id != Client.user.id) {
                if (!lock || user.id == author.id) {
                    if (page != 0) {
                        page = 0;
                        reply.edit(pages[page]);
                    }
                }
                reaction.users.remove(user.id);
            }
        }).on('end', collection => {
            reply.reactions.removeAll();
        });

        prevPageCollector.on('collect', (reaction, user) => {
            if (user.id != Client.user.id) {
                if (!lock || user.id == author.id) {
                    if (page < 1) {
                        page = pages.length - 1;
                    } else {
                        page--;
                    }
                    reply.edit(pages[page]);
                }
                reaction.users.remove(user.id);
            }
        }).on('end', collection => {
            reply.reactions.removeAll();
        });

        nextPageCollector.on('collect', (reaction, user) => {
            if (user.id != Client.user.id) {
                if (!lock || user.id == author.id) {
                    if (page >= pages.length - 1) {
                        page = 0;
                    } else {
                        page++;
                    }
                    reply.edit(pages[page]);
                }
                reaction.users.remove(user.id);
            }
        }).on('end', collection => {
            reply.reactions.removeAll();
        });

        lastPageCollector.on('collect', (reaction, user) => {
            if (user.id != Client.user.id) {
                if (!lock || user.id == author.id) {
                    if (page != pages.length - 1) {
                        page = pages.length - 1;
                        reply.edit(pages[page]);
                    }
                }
                reaction.users.remove(user.id);
            }
        }).on('end', collection => {
            reply.reactions.removeAll();
        });
    }
};
