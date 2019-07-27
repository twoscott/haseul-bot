// Require modules

const Discord = require("discord.js");
const Client = require("../haseul.js").Client;

const serverSettings = require("../modules/server_settings.js");

// Functions

exports.msg = async function (message, args) {

    // Handle commands
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
            return "⚠ Invalid guild or guild ID.";
        }
        guild = Client.guilds.get(match[0])
        if (!guild) {
            return "⚠ Invalid guild or guild ID.";
        }
    }

    return server_embed(guild);

}

const server_embed = async (guild) => {

    guild = await guild.fetchMembers();

    let regions = {
        "amsterdam":   ":flag_nl: Amsterdam",    
        "brazil":      ":flag_br: Brazil", 
        "eu-central":  ":flag_eu: EU Central",   
        "eu-west":     ":flag_eu: EU West", 
        "frankfurt":   ":flag_de: Frankfurt",    
        "hongkong":    ":flag_hk: Hong Kong", 
        "japan":       ":flag_jp: Japan",        
        "london":      ":flag_gb: London", 
        "russia":      ":flag_ru: Russia",       
        "singapore":   ":flag_sg: Singapore", 
        "southafrica": ":flag_za: South Africa", 
        "sydney":      ":flag_au: Sydney",
        "us-central":  ":flag_us: US Central",   
        "us-east":     ":flag_us: US East", 
        "us-south":    ":flag_us: US South",     
        "us-west":     ":flag_us: US West"
    }

    let statusObj = {
        online : { emoji: "<:online_cb:533459049765928970>",  count: 0 },
        idle   : { emoji: "<:idle_cb:533459049702752266>",    count: 0 },
        dnd    : { emoji: "<:dnd_cb:533459049547563008>",     count: 0 },
        offline: { emoji: "<:offline_cb:533459049648226317>", count: 0 } 
    }
    guild.presences.array().forEach(p => statusObj[p.status].count += 1);
    let statusData = Object.values(statusObj);
    statusObj.offline.count = guild.memberCount - statusData.slice(0, 3).reduce((a, c) => a + c.count, 0);
    let statuses = statusData.map(d => d.emoji + d.count).join('  ');
    let autoroleID = await serverSettings.get(guild.id, "autoroleID");
    let autoroleColour = autoroleID ? guild.roles.get(autoroleID).color : null;

    let embed = new Discord.RichEmbed()
    .setAuthor(guild.name, guild.iconURL)
    .setThumbnail(guild.iconURL)
    .setColor(autoroleColour || guild.members.get(Client.user.id).displayColor || 0xffffff)
    .setFooter(`ID #${guild.id}`)
    .setTimestamp(guild.createdAt)
    .addField("Owner", guild.owner.user.tag, true)
    .addField("Created On", guild.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), true)
    .addField("Text Channels", guild.channels.array().filter(c => c.type == 'text').length, true)
    .addField("Voice Channels", guild.channels.array().filter(c => c.type == 'voice').length, true)
    .addField("Members", guild.memberCount, true)
    .addField("Roles", guild.roles.size, true)
    .addField("Region", regions[guild.region], true)
    .addField("Emojis", `${guild.emojis.size} (${guild.emojis.array().filter(e=>e.animated).length} animated)`, true);

    if (statuses) {
        embed.addField("Statuses", statuses);
    }

    return embed;

}