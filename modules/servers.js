//Require modules

const Discord = require("discord.js");
const Client = require("../haseul.js").Client;

//Functions

exports.msg = async function (message, args) {

    //Handle commands
    switch (args[0]) {

        case ".serverinfo":
        case ".sinfo":
        case ".guildinfo":
            message.channel.startTyping();
            guildinfo(message, args[1]).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }

}

const guildinfo = async function (message, target) {

    let guild;
    if (!target) {
        guild = message.guild;
    } else {
        let match = target.match(/^\d+$/);
        if (!match) {
            return "\\⚠ Invalid guild or guild ID.";
        }
        guild = Client.guilds.get(match[0])
        if (!guild) {
            return "\\⚠ Invalid guild or guild ID.";
        }
    }

    return server_embed(guild);

}

const server_embed = async (guild) => {

    guild = await guild.fetchMembers();

    let region = [];
    for (let sec of guild.region.split('-')) {
        region.push(sec[0].toUpperCase() + sec.slice(1));
    }
    region = region.join('-');

    let presences = {};
    for (presence of guild.presences.array()) {
        presences[presence.status] ? presences[presence.status] += 1: presences[presence.status] = 1;
    }
    let statuses = [];
    if (presences.online) statuses.push(`${presences.online} Online`);
    if (presences.idle) statuses.push(`${presences.idle} Idle`);
    if (presences.dnd) statuses.push(`${presences.dnd} Do Not Disturb`);
    let offline = guild.memberCount - ((presences.online || 0) + (presences.idle || 0) + (presences.dnd || 0))
    statuses.push(`${offline} Offline`);
    statuses = statuses.join(', ');

    let embed = new Discord.RichEmbed()
    .setAuthor(guild.name, guild.iconURL)
    .setThumbnail(guild.iconURL)
    .setColor(guild.members.get(Client.user.id).displayColor || 0xffffff)
    .setFooter(`ID #${guild.id}`)
    .setTimestamp(guild.createdAt)
    .addField("Created On", guild.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("Owner", guild.owner.user.tag, true)
    .addField("Text Channels", guild.channels.array().filter(c => c.type == 'text').length, true)
    .addField("Voice Channels", guild.channels.array().filter(c => c.type == 'voice').length, true)
    .addField("Members", guild.memberCount, true)
    .addField("Roles", guild.roles.size, true)
    .addField("Region", region, true)
    .addField("Emojis", guild.emojis.size, true);

    if (statuses) {
        embed.addField("Statuses", statuses);
    }

    return embed;

}