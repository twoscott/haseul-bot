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

    let flags = {
        "brazil": ':flag_br:', "eu-central": ':flag_eu:',
        "hongkong": ':flag_hk:', "japan": ':flag_jp:',
        "russia": ':flag_ru:', "singapore": ':flag_sg:',
        "south-africa": ':flag_za:', "sydney": ':flag_au:',
        "us-central": ':flag_us:', "us-east": ':flag_us:',
        "us-south": ':flag_us:', "us-west": ':flag_us:',
        "eu-west": ':flag_eu:', "london": ':flag_gb:'
    }
    let flag = flags[guild.region] ? flags[guild.region] + ' ' : '';
    let region = guild.region.replace("hongkong", "hong-kong").replace("southafrica", "south-africa").replace("us", "US").replace("eu", "EU");
    region = flag + region.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');

    let statusObj = {
        online : { emoji: "<:online_cb:533459049765928970>", count: 0 },
        idle   : { emoji: "<:idle_cb:533459049702752266>", count: 0 },
        dnd    : { emoji: "<:dnd_cb:533459049547563008>", count: 0 },
        offline: { emoji: "<:offline_cb:533459049648226317>", count: 0 } 
    }
    guild.presences.array().forEach(p => statusObj[p.status].count += 1);
    let statusData = Object.values(statusObj);
    statusObj.offline.count = guild.memberCount - statusData.slice(0, 3).reduce((a, c) => a + c.count, 0);
    let statuses = statusData.map(d => d.emoji + d.count).join('  ');

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
    .addField("Emojis", `${guild.emojis.size} (${guild.emojis.array().filter(e=>e.animated).length} animated)`, true);

    if (statuses) {
        embed.addField("Statuses", statuses);
    }

    return embed;

}