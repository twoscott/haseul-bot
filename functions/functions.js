// Require modules

const Discord = require("discord.js");
const Client = require("../haseul").Client;

//Functions

exports.capitalise = (text) => {
    return text[0].toUpperCase() + text.slice(1).toLowerCase();
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

exports.parseParams = (object) => {
    return Object.entries(object).map(x => `${x[0]}=${encodeURIComponent(x[1])}`).join('&');
}

exports.pages = async (message, pages, timeout, lock) => {
    let currentPage = 0;
    let content = `${pages[currentPage]}`;

    if (pages.length < 2) {
        message.channel.send(content);
    } else {
        message.channel.send(content).then(async reply => {  
            await reply.react("⏮");
            await reply.react("⬅");
            await reply.react("➡");
            await reply.react("⏭");
            if (lock) await reply.react("🔒");

            let lockListener;
            const pageBeginning = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏮" && !user.bot, {time: timeout});
            const pageBack = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⬅" && !user.bot, {time: timeout});
            const pageForward = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "➡" && !user.bot, {time: timeout});
            const pageEnd = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏭" && !user.bot, {time: timeout});
            if (lock) lockListener = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "🔒" && !user.bot, {time: timeout});

            pageBeginning.on("end", () => {
                reply.clearReactions();
            })

            pageBack.on("end", () => {
                reply.clearReactions();
            })

            pageForward.on("end", () => {
                reply.clearReactions();
            })

            pageEnd.on("end", () => {
                reply.clearReactions();
            })

            pageBeginning.on("collect", reaction => {
                if (currentPage != 0) {
                    currentPage = 0;
                    content = `#${currentPage + 1} ${pages[currentPage]}`;
                    reply.edit(content);
                }                
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageBack.on("collect", reaction => {
                if (currentPage < 1) {
                    currentPage = pages.length - 1;
                } else {
                    currentPage--;
                }
                content = `#${currentPage + 1} ${pages[currentPage]}`;
                reply.edit(content);

                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageForward.on("collect", reaction => {
                if (currentPage >= pages.length - 1) {
                    currentPage = 0;
                } else {
                    currentPage++;
                }
                content = `#${currentPage + 1} ${pages[currentPage]}`;
                reply.edit(content);
                
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageEnd.on("collect", reaction => {
                if (currentPage != pages.length - 1) {
                    currentPage = pages.length - 1;
                    content = `#${currentPage + 1} ${pages[currentPage]}`;
                    reply.edit(content);
                }                
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            if (lock && lockListener) {
                lockListener.on("collect", reaction => {
                    let users = reaction.users.array()
                    if (users[users.length - 1].id == message.author.id) {
                        let listeners = [pageBeginning, pageBack, pageForward, pageEnd, lockListener];
                        for (i=0; i < listeners.length; i++) {
                            listeners[i].stop();
                        }
                        reply.clearReactions();
                    } else {
                        for (i=0; i < users.length; i++) {
                            let user = users[i];
                            if (user != Client.user) {
                                reaction.remove(user);
                            }
                        }
                    }
                
                })
            }

        })
    }
    
}

exports.embedPages = async (destination, embed, pages, timeout) => {
    let currentPage = 0;
    embed.setDescription(pages[currentPage]);
    embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
        
    if (pages.length < 2) {
        destination.send({embed: embed});
    } else {
        destination.send({embed: embed}).then(async reply => {            
            await reply.react("⏮");          
            await reply.react("⬅");
            await reply.react("➡");
            await reply.react("⏭");

            const pageBeginning = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏮" && !user.bot, {time: timeout});
            const pageBack = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⬅" && !user.bot, {time: timeout});
            const pageForward = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "➡" && !user.bot, {time: timeout});
            const pageEnd = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏭" && !user.bot, {time: timeout});

            pageBeginning.on("end", () => {
                reply.clearReactions();
            })

            pageBack.on("end", () => {
                reply.clearReactions();
            })

            pageForward.on("end", () => {
                reply.clearReactions();
            })

            pageEnd.on("end", () => {
                reply.clearReactions();
            })

            pageBeginning.on("collect", reaction => {
                if (currentPage != 0) {
                    currentPage = 0;
                    embed.setDescription(pages[currentPage]);
                    embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                    reply.edit({embed: embed});
                }
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageBack.on("collect", reaction => {
                if (currentPage < 1) {
                    currentPage = pages.length - 1;
                } else {
                    currentPage--;
                }
                embed.setDescription(pages[currentPage]);
                embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                reply.edit({embed: embed});

                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageForward.on("collect", reaction => {
                if (currentPage >= pages.length - 1) {
                    currentPage = 0;
                } else {
                    currentPage++;
                }
                embed.setDescription(pages[currentPage]);
                embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                reply.edit({embed: embed});
                
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageEnd.on("collect", reaction => {
                if (currentPage != pages.length - 1) {
                    currentPage = pages.length - 1;
                    embed.setDescription(pages[currentPage]);
                    embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                    reply.edit({embed: embed});
                }
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
                
            })

        })
    }
    
}

exports.embedPagesFields = async (message, embed, pages, timeout, lock) => {
    let currentPage = 0;
    for (i=0; i < pages[currentPage].length; i++) {
        embed.addField(pages[currentPage][i].name, pages[currentPage][i].usage);
    }
    embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
        
    if (pages.length < 2) {
        message.channel.send({embed: embed});
    } else {
        message.channel.send({embed: embed}).then(async reply => {            
            await reply.react("⏮");          
            await reply.react("⬅");
            await reply.react("➡");
            await reply.react("⏭");

            const pageBeginning = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏮" && !user.bot, {time: timeout});
            const pageBack = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⬅" && !user.bot, {time: timeout});
            const pageForward = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "➡" && !user.bot, {time: timeout});
            const pageEnd = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⏭" && !user.bot, {time: timeout});

            pageBeginning.on("end", () => {
                reply.clearReactions();
            })

            pageBack.on("end", () => {
                reply.clearReactions();
            })

            pageForward.on("end", () => {
                reply.clearReactions();
            })

            pageEnd.on("end", () => {
                reply.clearReactions();
            })

            pageBeginning.on("collect", reaction => {
                currentPage = 0;

                let new_embed = new Discord.RichEmbed()
                    .setAuthor(embed.author.name, embed.author.icon_url)
                    .setColor(embed.color)
                    .setDescription(embed.description);

                for (i=0; i < pages[currentPage].length; i++) {
                    new_embed.addField(pages[currentPage][i].name, pages[currentPage][i].usage);
                }
                
                new_embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                reply.edit({embed: new_embed});
                embed = new_embed;
                
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageBack.on("collect", reaction => {
                if (currentPage < 1) {
                    currentPage = pages.length - 1;
                } else {
                    currentPage--;
                }
                
                let new_embed = new Discord.RichEmbed()
                    .setAuthor(embed.author.name, embed.author.icon_url)
                    .setColor(embed.color)
                    .setDescription(embed.description);

                for (i=0; i < pages[currentPage].length; i++) {
                    new_embed.addField(pages[currentPage][i].name, pages[currentPage][i].usage);
                }
                
                new_embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                reply.edit({embed: new_embed});
                embed = new_embed

                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageForward.on("collect", reaction => {
                if (currentPage >= pages.length - 1) {
                    currentPage = 0;
                } else {
                    currentPage++;
                }

                let new_embed = new Discord.RichEmbed()
                    .setAuthor(embed.author.name, embed.author.icon_url)
                    .setColor(embed.color)
                    .setDescription(embed.description);

                for (i=0; i < pages[currentPage].length; i++) {
                    new_embed.addField(pages[currentPage][i].name, pages[currentPage][i].usage);
                }
                
                new_embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                reply.edit({embed: new_embed});
                embed = new_embed;
                
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

            pageEnd.on("collect", reaction => {
                currentPage = pages.length - 1;

                let new_embed = new Discord.RichEmbed()
                    .setAuthor(embed.author.name, embed.author.icon_url)
                    .setColor(embed.color)
                    .setDescription(embed.description);

                for (i=0; i < pages[currentPage].length; i++) {
                    new_embed.addField(pages[currentPage][i].name, pages[currentPage][i].usage);
                }
                
                new_embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
                reply.edit({embed: new_embed});
                embed = new_embed;
                
                let users = reaction.users.array();
                for (i=0; i < users.length; i++) {
                    let user = users[i];
                    if (user != Client.user) {
                        reaction.remove(user);
                    }
                }
            })

        })
    }
    
}
