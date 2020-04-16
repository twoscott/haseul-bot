const Discord = require("discord.js");
const { 
    checkPermissions, 
    getMemberNumber, 
    resolveMember,
    withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const serverSettings = require("../utils/server_settings.js");
const { parseChannelID, trimArgs } = require("../functions/functions.js");

const joinColour = 0x01b28f;
const leaveColour = 0xf93452;
const welcomeColour = 0x7c62d1;

exports.join = async function(member) {

    welcomeMsgPromise = welcome(member);
    logJoin(member, welcomeMsgPromise);

}

exports.leave = async function(member) {

    logLeave(member);

}

exports.onCommand = async function(message, args) {

    let { channel, member } = message;
    
    switch (args[0]) {
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
                    message.channel.send(`Help with logs can be found here: https://haseulbot.xyz/#member-logs`);
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

async function welcome(member) {
    
    let { user, guild } = member;

    if (user.bot) return;
    let welcomeOn = serverSettings.get(member.guild.id, "welcomeOn");
    if (!welcomeOn) return;
    let welcomeChannelID = serverSettings.get(member.guild.id, "welcomeChan");
    let channel = Client.channels.cache.get(welcomeChannelID)
    if (!channel) return;

    let memberNumber = await getMemberNumber(member);
    let defaultText = `**{username}**#{discriminator} has ${['arrived', 'joined', 'appeared'][Math.floor(Math.random() * 3)]}!`;
    let welcomeText = serverSettings.get(member.guild.id, "welcomeMsg");

    let embed = new Discord.MessageEmbed({
        title: "New Member!",
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        description: (welcomeText || defaultText).replace('{default}', defaultText).replace('{user}', user).replace('{username}', user.username).replace('{discriminator}', user.discriminator).replace('{usertag}', user.tag).replace('{server}', guild.name).replace('{memberno}', memberNumber),
        color: welcomeColour,
        footer: { text: `Member #${memberNumber} 🎐` },
        timestamp: member.joinedTimestamp
    })

    let welcomeMsg = await channel.send(embed);
    return welcomeMsg.url;

}

async function logJoin(member, welcomeMsgPromise) {

    let { user, guild } = member;

    let logsOn = serverSettings.get(member.guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(member.guild.id, "joinLogsChan");
    let channel = Client.channels.cache.get(logChannelID);
    if (!channel) return;
    
    let memberNumber = await getMemberNumber(member);
    let embed = new Discord.MessageEmbed({
        title: "Member Joined!",
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        description: `**${user.tag}** (${user}) joined ${guild}.`,
        fields: [
            { name: "Joined On", value: member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: "Account Created On", value: user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: "User ID", value: user.id, inline: false }
        ],
        color: joinColour,
        footer: { text: `Member #${memberNumber}` },
    });

    let welcomeMsgUrl = await welcomeMsgPromise;
    if (welcomeMsgUrl) {
        embed.addField("Welcome Message", `[View Message](${welcomeMsgUrl})`, false);
    }
    
    channel.send(embed);
}

const logLeave = async function (member) {
    
    let leaveDate = new Date(Date.now());
    let { user, guild } = member;

    let logsOn = serverSettings.get(member.guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(member.guild.id, "joinLogsChan");
    let channel = Client.channels.cache.get(logChannelID);
    if (!channel) return;

    let embed = new Discord.MessageEmbed({
        title: "Member Left!",
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        description: `**${user.tag}** (${user}) left ${guild}.`,
        fields: [
            { name: "Left On", value: leaveDate.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: "Account Created On", value: user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: "User ID", value: user.id, inline: false }
        ],
        color: leaveColour
    })
    
    channel.send(embed);

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
        message.channel.send(`⚠ Invalid channel or channel ID.`);
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send(`⚠ Channel doesn't exist in this server.`);
        return;
    }

    let member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    
    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        message.channel.send(`⚠ I cannot see this channel!`);
        return;
    }
    if (!botPerms.has("SEND_MESSAGES", true)) {
        message.channel.send(`⚠ I cannot send messages to this channel!`);
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
        message.channel.send(`⚠ Invalid channel or channel ID.`);
        return;
    }
    
    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send(`⚠ Channel doesn't exist in this server.`);
        return;
    }

    let member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    
    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        message.channel.send(`⚠ I cannot see this channel!`);
        return;
    }
    if (!botPerms.has("SEND_MESSAGES", true)) {
        message.channel.send(`⚠ I cannot send messages to this channel!`);
        return;
    }
    
    await serverSettings.set(message.guild.id, "welcomeChan", channelID)
    message.channel.send(`Welcome channel set to <#${channelID}>.`);

}

async function setWelcomeMsg(message, args) {

    if (args.length < 4) {
        message.channel.send(`⚠ Please provide a message.`);
        return;
    }
    
    let msg = trimArgs(args, 3, message.content);
    await serverSettings.set(message.guild.id, "welcomeMsg", msg)
    message.channel.send(`Welcome message set.`);

}

async function toggleWelcome(message) {

    let tog = await serverSettings.toggle(message.guild.id, "welcomeOn");
    message.channel.send(`Welcome turned ${tog ? "on":"off"}.`);

}
