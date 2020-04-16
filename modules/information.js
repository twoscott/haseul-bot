const Discord = require("discord.js");
const {
    getMemberNumber, 
    searchMembers, 
    resolveMember, 
    resolveUser,
    withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const axios = require("axios");

const serverSettings = require("../utils/server_settings.js");
const { parseUserID, trimArgs } = require("../functions/functions.js");
const { Image } = require("../functions/images.js");

exports.onCommand = async function(message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "userinfo":
        case "uinfo":
        case "memberinfo":
            withTyping(channel, userInfo, [message, args]);
            break;
        case "avatar":
        case "dp":
            withTyping(channel, userAvatar, [message, args]);
            break;
        case "serverinfo":
        case "sinfo":
        case "guildinfo":
            withTyping(channel, guildInfo, [message, args[1]]);
            break;
    }

}

async function userInfo(message, args) {

    let { author, guild } = message;
    let target = args[1];
    let member;
    let user;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        let members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            message.channel.send(`⚠ Invalid user or user ID.`);
            return;
        } else {
            userID = member.id;
        }
    }

    member = member || await resolveMember(guild, userID);
    if (member) {
        user = member.user;
    } else {
        user = await resolveUser(userID);
    }

    if (member) {
        let embed = await memberEmbed(author, member);
        message.channel.send({ embed });
    } else if (user) {
        let embed = await userEmbed(user);
        message.channel.send({ embed });
    } else {
        message.channel.send(`⚠ Invalid user.`);
    }

}

async function memberEmbed(author, member) {

    let { user, guild } = member;
    let memNo = await getMemberNumber(member);
    let lastMsg = member.lastMessage

    let status = {
        "online" : "<:online_cb:533459049765928970>Online",
        "idle"   : "<:idle_cb:533459049702752266>Idle",
        "dnd"    : "<:dnd_cb:533459049547563008>Do Not Disturb", 
        "offline": "<:offline_cb:533459049648226317>Offline"
    }
    
    let response;
    try {
        response = await axios.head(user.displayAvatarURL());
    } catch (e) {
        response = null;
    }

    let embed = new Discord.MessageEmbed({
        author: { name: user.tag, icon_url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }),
        description: `<@${user.id}>`,
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: member.displayColor || 0xffffff,
        fields: [
            { name: "Status", value: status[user.presence.status], inline: false },
            { name: "Account Created", value: user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false }
        ],
        footer: { text: `Member #${memNo}` }
    });

    if (response) {
        let timestamp = new Date(response.headers['last-modified']);
        embed.addField("Avatar Uploaded", timestamp.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);
    }

    embed.addField("Joined On", member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);

    if (member.premiumSince) {
        embed.addField("Boosting Since", user.premiumSince.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);
    }

    embed.addField("User ID", user.id, false);

    if (lastMsg && user.id != author.id) {
        embed.addField("Last Seen", `[View Message](https://discordapp.com/channels/${guild.id}/${lastMsg.channel.id}/${lastMsg.id} "Go To User's Last Message")`, false);
    }

    if (member.roles.cache.size > 1) {
        let allRoles = member.roles.cache.array().sort((a,b) => b.comparePositionTo(a)).slice(0,-1);
        let modRoles = [];
        let roles = [];
        let perms = [
            "ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_CHANNELS", "VIEW_AUDIT_LOG", 
            "KICK_MEMBERS", "BAN_MEMBERS"
        ];
        for (let role of allRoles) {
            if (perms.some(p => role.permissions.has(p, false, true))) {
                modRoles.push(role);
            } else {
                roles.push(role);
            }
        }
        if (modRoles.length > 0) {
            modRoles = modRoles.join(" ");
            if (modRoles.length > 1024) {
                modRoles = modRoles.substring(0, 1024);
                modRoles = modRoles.substring(0, modRoles.lastIndexOf('>')+1);
                modRoles += '.'.repeat(modRoles.length > 1021 ? 1024-roles.length : 3);
            }
            embed.addField("Mod Roles", modRoles, false);
        }
        if (roles.length > 0) {
            roles = roles.join(" ");
            if (roles.length > 1024) {
                roles = roles.substring(0, 1024);
                roles = roles.substring(0, roles.lastIndexOf('>')+1);
                roles += '.'.repeat(roles.length > 1021 ? 1024-roles.length : 3);
            }
            embed.addField("Roles", roles, false);
        }
    }

    return embed;

}

async function userEmbed(user) {

    let status = {
        "online" : "<:online:532078078063673355>Online",
        "offline": "<:offline:532078078210473994>Offline",
        "idle"   : "<:idle:532078078269194263>Idle",
        "dnd"    : "<:dnd:532078078382571540>Do Not Disturb" 
    }

    let response;
    try {
        response = await axios.head(user.displayAvatarURL());
    } catch (e) {
        response = null;
    }

    let embed = new Discord.MessageEmbed({
        author: { name: user.tag, icon_url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }),
        description: `<@${user.id}>`,
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: 0xffffff,
        fields: [
            { name: "Status", value: status[user.presence.status], inline: false },
            { name: "Account Created", value: user.createdAt.toUTCString().replace(' GMT', ' UTC'), inline: false },
        ],
        footer: { text: "User not in server" },
        timestamp: user.createdAt
    });

    if (response) {
        let timestamp = new Date(response.headers['last-modified']);
        embed.addField("Avatar Uploaded", timestamp.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);
    }

    embed.addField("User ID", user.id, false);

    return embed;
    
}

async function userAvatar(message, args) {

    let { author, guild } = message;
    let target = args[1];
    let member;
    let user;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            message.channel.send(`⚠ Invalid user or user ID.`);
            return;
        } else {
            userID = member.id;
        }
    }

    member = member || await resolveMember(guild, userID);
    if (member) {
        user = member.user;
    } else {
        user = await resolveUser(userID);
    }
    
    if (!user) {
        message.channel.send(`⚠ Invalid user.`);
        return;
    }

    let res;
    try {
        res = await axios.get(user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }), {responseType: 'arraybuffer'});
    } catch (e) {
        message.channel.send("Error fetching avatar: " + user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }));
        return;
    }

    let img_size = Math.max(Math.round(res.headers['content-length']/10000)/100, 1/100);
    let img_type = res.headers['content-type'].split('/')[1];
    let timestamp = new Date(res.headers['last-modified']);

    let img  = new Image(res.data);
    let dims = img.dimensions;
    let username = user.username;
    let p = username.toLowerCase().endsWith('s') ? "'" : "'s";

    let embed = new Discord.MessageEmbed({
        title: `${username+p} Avatar`,
        color: member ? member.displayColor || 0xffffff : 0xffffff
    });

    if (dims[0] < 150) {
        embed.thumbnail = { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }) };
        embed.description = `Type: ${img_type.toUpperCase()}\nSize: ${img_size}MB\nDimensions: ${dims.join('x')}\nUploaded: ${timestamp.toLocaleString('en-GB', { timeZone: 'UTC' }).split(',')[0]}`
    } else {
        embed.image = { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }) };
        embed.footer = { text: `Type: ${img_type.toUpperCase()}  |  Size: ${dims ? dims.join('x') + ' - ':''}${img_size}MB` }
        embed.timestamp = timestamp;
    }

    message.channel.send({embed});

}

async function guildInfo(message, target) {

    let guild;
    if (!target || message.author.id != '125414437229297664') {
        guild = message.guild;
    } else {
        let match = target.match(/^\d+$/);
        if (!match) {
            message.channel.send(`⚠ Invalid guild ID.`);
            return;
        }
        guild = Client.guilds.cache.get(match[0])
        if (!guild) {
            message.channel.send(`⚠ Invalid guild or bot is not in this server.`);
            return;
        }
    }

    let embed = await serverEmbed(guild);
    message.channel.send({ embed });

}

async function serverEmbed(guild) {

    guild.members.cache = await guild.members.fetch({ cache: false });

    let regions = {
        "amsterdam":   ":flag_nl: Amsterdam",    
        "brazil":      ":flag_br: Brazil",
        "europe":      ":flag_eu: Europe",
        "eu-central":  ":flag_eu: EU Central",   
        "eu-west":     ":flag_eu: EU West", 
        "frankfurt":   ":flag_de: Frankfurt",    
        "hongkong":    ":flag_hk: Hong Kong", 
        "india":       ":flag_in: India",
        "japan":       ":flag_jp: Japan",        
        "london":      ":flag_gb: London", 
        "russia":      ":flag_ru: Russia",       
        "singapore":   ":flag_sg: Singapore", 
        "southafrica": ":flag_za: South Africa",
        "south-korea": ":flag_kr: South Korea", 
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

    let boostLvlEmojis = [
        "<:boostlvl0:697919960302878790>",
        "<:boostlvl1:697919571775979570>",
        "<:boostlvl2:697919571893551104>",
        "<:boostlvl3:697919571998539916>",
    ]

    guild.presences.cache.array().forEach(p => statusObj[p.status].count += 1);
    let statusData = Object.values(statusObj);
    statusObj.offline.count = guild.memberCount - statusData.slice(0, 3).reduce((a, c) => a + c.count, 0);
    let statuses = statusData.map(d => d.emoji + d.count.toLocaleString()).join('  ');
    let autoroleID = serverSettings.get(guild.id, "autoroleID");
    let autoroleColour = 0xdddddd;
    if (autoroleID) {
        let autorole = guild.roles.cache.get(autoroleID);
        autoroleColour = autorole ? autorole.color : 0xdddddd;
    }

    let embed = new Discord.MessageEmbed({
        author: { name: guild.name, icon_url: guild.iconURL({ format: 'png', dynamic: true, size: 32 }) },
        thumbnail: { url: guild.iconURL({ format: 'png', dynamic: true, size: 512 }) },
        color: autoroleColour || guild.members.cache.get(Client.user.id).displayColor || 0xffffff,
        fields: [
            { name: "Owner", value: `<@${guild.owner.user.id}>`, inline: true },
            { name: "Members", value: guild.memberCount.toLocaleString(), inline: true },
            { name: "Roles", value: guild.roles.cache.size, inline: true },
            { name: "Text Channels", value: guild.channels.cache.array().filter(c => c.type == 'text').length, inline: true },
            { name: "Voice Channels", value: guild.channels.cache.array().filter(c => c.type == 'voice').length, inline: true },
            { name: "Created On", value: guild.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: "Region", value: regions[guild.region] || guild.region, inline: true },
            { name: "Emojis", value: `${guild.emojis.cache.size} (${guild.emojis.cache.array().filter(e=>e.animated).length} animated)`, inline: true },
            { name: "Statuses", value: statuses, inline: false },
            { name: "Level", value: `${boostLvlEmojis[guild.premiumTier]} ${guild.premiumTier}`, inline: true },
            { name: "Boosters", value: `<:nitroboost:595699920422436894> ${guild.premiumSubscriptionCount}`, inline: true }
        ],
        footer: { text: `ID #${guild.id}` }
    })

    let bannerURL = guild.bannerURL({ format: 'png', dynamic: true, size: 2048 })
    if (bannerURL) {
        embed.setImage(bannerURL);
    }

    return embed;

}
