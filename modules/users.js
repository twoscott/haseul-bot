const Discord = require("discord.js");
const { 
    checkPermissions, 
    getMemberNumber, 
    searchMembers, 
    resolveMember, 
    resolveUser, 
    withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const axios = require("axios");

const colours = require("../functions/colours.js");
const serverSettings = require("./server_settings.js");
const { parseChannelID, parseUserID, trimArgs } = require("../functions/functions.js");
const { Image } = require("../functions/images.js");

exports.join = async function(member) {

    let colour = parseInt(colours.randomHexColour(true), 16);
    welcome(member, colour);
    log(member, colour, logJoin);

}

exports.leave = async function(member) {

    let colour = parseInt(colours.randomHexColour(true), 16);
    log(member, colour, logLeave);

}

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
        case "joins":
        case "joinlogs":
        case "memberlogs":
            switch (args[1]) {
                case "channel":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, setJoinChannel, [message, args[3]])
                            break;
                    }
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, toggleJoin, [message]);
                    break;
                default:
                    message.channel.send("Help with logs can be found here: https://haseulbot.xyz/#member-logs");
                    break;
            }
            break;
        case "greeter":
            switch (args[1]) {
                case "channel":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, setWelcomeChannel, [message, args[3]]);
                            break;
                    }
                    break;
                case "message":
                case "msg":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["MANAGE_GUILD"]))
                                withTyping(channel, setWelcomeMsg, [message, args]);
                            break;
                    }
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, toggleWelcome, [message]);
                    break;
            }
            break;
    }

}


async function log(member, colour, logEvent) {
    let logsOn = serverSettings.get(member.guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(member.guild.id, "joinLogsChan");
    if (!member.guild.channels.has(logChannelID)) return;
    if (logChannelID) logEvent(member, logChannelID, colour); //Log
}

async function welcome(member, colour) {
    
    let { user, guild } = member;

    if (user.bot) return;
    let welcomeOn = serverSettings.get(member.guild.id, "welcomeOn");
    if (!welcomeOn) return;
    let welcomeChannelID = serverSettings.get(member.guild.id, "welcomeChan");
    if (!member.guild.channels.has(welcomeChannelID)) return;
    if (!welcomeChannelID) return;

    let memberNumber = await getMemberNumber(member);
    let defaultMsg = `**{username}**#{discriminator} has ${['arrived', 'joined', 'appeared'][Math.floor(Math.random() * 3)]}!`;
    let welcomeMsg = serverSettings.get(member.guild.id, "welcomeMsg");

    let embed = new Discord.RichEmbed()
    .setTitle(`New Member!`)
    .setThumbnail(user.displayAvatarURL)
    .setDescription((welcomeMsg || defaultMsg).replace('{default}', defaultMsg).replace('{user}', user).replace('{username}', user.username).replace('{discriminator}', user.discriminator).replace('{usertag}', user.tag).replace('{server}', guild.name).replace('{memberno}', memberNumber))
    .setColor(colour)
    .setFooter(`Member #${memberNumber} 🎐`)
    .setTimestamp(member.joinedTimestamp);

    let channel = Client.channels.get(welcomeChannelID) || guild.channels.get(welcomeChannelID);
    channel.send(embed);

}

async function logJoin(member, destination, colour) {
    
    let memNo = await getMemberNumber(member);
    let {
        user,
        guild
    } = member;
    let embed = new Discord.RichEmbed()
    .setTitle("Member Joined!")
    .setThumbnail(user.displayAvatarURL)
    .setDescription(`${user} (**${user.tag}**) joined ${guild}.`)
    .addField("Joined On", member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("Account Created On", user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("User ID", user.id)
    .setFooter(`Member #${memNo}`)
    .setColor(colour);
    
    let channel = Client.channels.get(destination) || guild.channels.get(destination);
    channel.send(embed);
}

const logLeave = async function (member, destination, colour) {

    member.leftAt = new Date(Date.now());
    let {
        user,
        guild
    } = member;
    let embed = new Discord.RichEmbed()
    .setTitle("Member Left!")
    .setThumbnail(user.displayAvatarURL)
    .setDescription(`${user} (**${user.tag}**) left ${guild}.`)
    .addField("Left On", member.leftAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("Account Created On", user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("User ID", user.id)
    .setColor(colour);
    
    let channel = Client.channels.get(destination) || guild.channels.get(destination);
    channel.send(embed);

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
        guild = await guild.fetchMembers();

        member = await searchMembers(guild, target)
        if (!member) {
            message.channel.send("⚠ Invalid user or user ID.");
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
        message.channel.send("⚠ Invalid user.");
    }

}

async function memberEmbed(author, member) {

    let { user, guild } = member;
    let lastMsg = member.lastMessage

    let status = {
        "online" : "<:online_cb:533459049765928970>Online",
        "idle"   : "<:idle_cb:533459049702752266>Idle",
        "dnd"    : "<:dnd_cb:533459049547563008>Do Not Disturb", 
        "offline": "<:offline_cb:533459049648226317>Offline"
    }

    let embed = new Discord.RichEmbed()
    .setAuthor(user.tag, user.displayAvatarURL)
    .setURL(user.displayAvatarURL.split('?')[0]+'?size=1024')
    .setDescription(user)
    .setThumbnail(user.displayAvatarURL)
    .setColor(member.displayColor || 0xffffff)
    .setFooter(`Member #${await getMemberNumber(member)}`)
    .setTimestamp(member.joinedAt)
    .addField("Status", status[user.presence.status], true)
    .addField("Account Created", user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("Joined On",  member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("User ID", user.id, true);

    if (lastMsg && user.id != author.id) {
        embed.addField("Last Seen", `[View Message](https://discordapp.com/channels/${guild.id}/${lastMsg.channel.id}/${lastMsg.id} "Go To User's Last Message")`, true);
    }

    if (member.roles && member.roles.size > 1) {
        let allRoles = member.roles.array().sort((a,b) => b.comparePositionTo(a)).slice(0,-1);
        let modRoles = [];
        let roles = [];
        let perms = [
            "ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_CHANNELS", "VIEW_AUDIT_LOG", 
            "KICK_MEMBERS", "BAN_MEMBERS"
        ];
        for (let role of allRoles) {
            if (perms.some(p => role.hasPermission(p, false, true))) {
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
            embed.addField("Mod Roles", modRoles, true);
        }
        if (roles.length > 0) {
            roles = roles.join(" ");
            if (roles.length > 1024) {
                roles = roles.substring(0, 1024);
                roles = roles.substring(0, roles.lastIndexOf('>')+1);
                roles += '.'.repeat(roles.length > 1021 ? 1024-roles.length : 3);
            }
            embed.addField("Roles", roles, true);
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

    let embed = new Discord.RichEmbed()
    .setAuthor(user.tag, user.displayAvatarURL)
    .setURL(user.displayAvatarURL.split('?')[0]+'?size=1024')
    .setDescription(user)
    .setThumbnail(user.displayAvatarURL)
    .setColor(0xffffff)
    .setFooter(`User not in server`)
    .setTimestamp(user.createdAt)
    .addField("Status", status[user.presence.status])
    .addField("User ID", user.id)
    .addField("Account Created", user.createdAt.toUTCString().replace(' GMT', ''));

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
        guild = await guild.fetchMembers();

        member = await searchMembers(guild, target)
        if (!member) {
            message.channel.send("⚠ Invalid user or user ID.");
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
        message.channel.send("⚠ Invalid user.");
        return;
    }

    let res;
    try {
        res = await axios.get(user.displayAvatarURL.split('?')[0] + '?size=2048', {responseType: 'arraybuffer'});
    } catch (e) {
        message.channel.send("Error fetching avatar: " + user.displayAvatarURL);
        return;
    }

    let img_size = Math.max(Math.round(res.headers['content-length']/10000)/100, 1/100);
    let img_type = res.headers['content-type'].split('/')[1];
    let timestamp = new Date(res.headers['last-modified']);

    let img  = new Image(res.data);
    let dims = img.dimensions;
    let username = user.username;
    let p = username.toLowerCase().endsWith('s') ? "'" : "'s";

    let embed = {
        title: `${username+p} Avatar`,
        color: member ? member.displayColor || 0xffffff : 0xffffff
    }

    if (dims[0] < 150) {
        embed.thumbnail = { url: user.displayAvatarURL };
        embed.description = `Type: ${img_type.toUpperCase()}\nSize: ${img_size}MB\nDimensions: ${dims.join('x')}\nUploaded: ${timestamp.toLocaleString('en-GB', { timeZone: 'UTC' }).split(',')[0]}`
    } else {
        embed.image = { url: user.displayAvatarURL.split('?')[0] + '?size=2048' };
        embed.footer = { text: `Type: ${img_type.toUpperCase()}  |  Size: ${dims ? dims.join('x') + ' - ':''}${img_size}MB` }
        embed.timestamp = timestamp;
    }

    message.channel.send({embed});

}

async function setJoinChannel(message, channelArg) {

    let { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send("⚠ Invalid channel or channel ID.");
        return;
    }

    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ Channel doesn't exist in this server.");
        return;
    }

    let member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send("⚠ Error occurred.");
        return;
    }
    
    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        message.channel.send("⚠ I cannot see this channel!");
        return;
    }
    if (!botPerms.has("SEND_MESSAGES", true)) {
        message.channel.send("⚠ I cannot send messages to this channel!");
        return;
    }
    
    await serverSettings.set(message.guild.id, "joinLogsChan", channelID)
    message.channel.send(`Join logs channel set to <#${channelID}>.`);

}

async function toggleJoin(message) {

    let tog = await serverSettings.toggle(message.guild.id, "joinLogsOn");
    message.channel.send(`Join logs turned ${tog ? "on":"off"}.`);
    
}

async function setWelcomeChannel(message, channelArg) {

    let { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send("⚠ Invalid channel or channel ID.");
        return;
    }
    
    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ Channel doesn't exist in this server.");
        return;
    }

    let member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send("⚠ Error occurred.");
        return;
    }
    
    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        message.channel.send("⚠ I cannot see this channel!");
        return;
    }
    if (!botPerms.has("SEND_MESSAGES", true)) {
        message.channel.send("⚠ I cannot send messages to this channel!");
        return;
    }
    
    await serverSettings.set(message.guild.id, "welcomeChan", channelID)
    message.channel.send(`Welcome channel set to <#${channelID}>.`);

}

async function setWelcomeMsg(message, args) {

    if (args.length < 4) {
        message.channel.send("⚠ Please provide a message.");
        return;
    }
    
    let msg = trimArgs(args, 3, message.content);
    await serverSettings.set(message.guild.id, "welcomeMsg", msg)
    message.channel.send("Welcome message set.");

}

async function toggleWelcome(message) {

    let tog = await serverSettings.toggle(message.guild.id, "welcomeOn");
    message.channel.send(`Welcome turned ${tog ? "on":"off"}.`);

}
