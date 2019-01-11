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

    let status_emojis = {
        "online" : "<:online:532078078063673355>",
        "offline": "<:offline:532078078210473994>",
        "idle"   : "<:idle:532078078269194263>",
        "dnd"    : "<:dnd:532078078382571540>" 
    }

    let flags = {
        "brazil": ':flag_br:', "eu-central": ':flag_eu:',
        "hongkong": ':flag_hk:', "japan": ':flag_jp:',
        "russia": ':flag_ru:', "singapore": ':flag_sg:',
        "south-africa": ':flag_za:', "sydney": ':flag_au:',
        "us-central": ':flag_us:', "us-east": ':flag_us:',
        "us-south": ':flag_us:', "us-west": ':flag_us:',
        "eu-west": ':flag_eu:', "london": ':flag_gb:'
    }
    let flag = flags[guild.region];

    let region = [];
    guild.region = guild.region.replace("hongkong", "hong-kong").replace("southafrica", "south-africa");
    for (let sec of guild.region.split('-')) {
        region.push(sec.length < 3 ?
                    sec.toUpperCase() :
                    sec[0].toUpperCase() + sec.slice(1));
    }
    region = region.join(' ');
    region = flag ? `${flag} ${region}` : region;

    let presences = {};
    for (presence of guild.presences.array()) {
        presences[presence.status] ? presences[presence.status] += 1: presences[presence.status] = 1;
    }
    let statuses = [];
    if (presences.online) statuses.push(`${status_emojis.online}${presences.online}`);
    if (presences.idle) statuses.push(`${status_emojis.idle}${presences.idle}`);
    if (presences.dnd) statuses.push(`${status_emojis.dnd}${presences.dnd}`);
    let offline = guild.memberCount - ((presences.online || 0) + (presences.idle || 0) + (presences.dnd || 0))
    statuses.push(`${status_emojis.offline}${offline}`);
    statuses = statuses.join(' ');

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