// Require modules

const discord = require("discord.js");
const client = require("../haseul").client;

embedPages = async (message, embed, pages) => {
    let currentPage = 0;
    embed.setDescription(pages[currentPage]);
    embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
        
    if (pages.length < 2) {
        message.channel.send({embed: embed});
    } else {
        message.channel.send({embed: embed}).then(async reply => {            
            await reply.react("⬅");
            await reply.react("➡");

            const pageBack = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⬅" && !user.bot, {time: 600000});
            const pageForward = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "➡" && !user.bot, {time: 600000});

            pageBack.on("end", () => {
                reply.clearReactions();
            })

            pageForward.on("end", () => {
                reply.clearReactions();
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
                    if (user != client.user) {
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
                    if (user != client.user) {
                        reaction.remove(user);
                    }
                }
            })

        })
    }
    
}

embedPagesFields = async (message, embed, pages) => {
    let currentPage = 0;
    for (i=0; i < pages[currentPage].length; i++) {
        embed.addField(pages[currentPage][i].name, pages[currentPage][i].usage);
    }
    embed.setFooter(`Page ${currentPage + 1} of ${pages.length}`);
        
    if (pages.length < 2) {
        message.channel.send({embed: embed});
    } else {
        message.channel.send({embed: embed}).then(async reply => {            
            await reply.react("⬅");
            await reply.react("➡");

            const pageBack = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "⬅" && !user.bot, {time: 600000});
            const pageForward = reply.createReactionCollector((reaction, user) => reaction.emoji.name === "➡" && !user.bot, {time: 600000});

            pageBack.on("end", () => {
                reply.clearReactions();
            })

            pageForward.on("end", () => {
                reply.clearReactions();
            })

            pageBack.on("collect", reaction => {
                if (currentPage < 1) {
                    currentPage = pages.length - 1;
                } else {
                    currentPage--;
                }
                
                let new_embed = new discord.RichEmbed()
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
                    if (user != client.user) {
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

                let new_embed = new discord.RichEmbed()
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
                    if (user != client.user) {
                        reaction.remove(user);
                    }
                }
            })

        })
    }
    
}

module.exports = {
    embedPages: embedPages,
    embedPagesFields: embedPagesFields
}
