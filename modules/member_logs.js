const Discord = require('discord.js');
const {
    checkPermissions,
    resolveMember,
    withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const serverSettings = require('../utils/server_settings.js');
const { resolveUsedInvite } = require('../utils/invite_cache.js');
const { parseChannelID, trimArgs } = require('../functions/functions.js');
const { colours, getImgColours } = require('../functions/colours.js');

exports.join = async function(member) {
    welcomeMsgPromise = welcome(member);
    logJoin(member, welcomeMsgPromise);
};

exports.leave = async function(member) {
    logLeave(member);
};

exports.onCommand = async function(message, args) {
    const { channel, member } = message;

    switch (args[0]) {
    case 'joins':
    case 'joinlogs':
    case 'memberlogs':
        switch (args[1]) {
        case 'channel':
            switch (args[2]) {
            case 'set':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(channel, setJoinChannel, [message, args[3]]);
                }
                break;
            }
            break;
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_GUILD'])) {
                withTyping(channel, toggleJoin, [message]);
            }
            break;
        default:
            message.channel.send({ content: 'Help with member logs can be found here: https://haseulbot.xyz/#logs' });
            break;
        }
        break;
    case 'greeter':
        switch (args[1]) {
        case 'channel':
            switch (args[2]) {
            case 'set':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(channel, setWelcomeChannel, [message, args[3]]);
                }
                break;
            }
            break;
        case 'message':
        case 'msg':
            switch (args[2]) {
            case 'set':
                if (checkPermissions(member, ['MANAGE_GUILD'])) {
                    withTyping(channel, setWelcomeMsg, [message, args]);
                }
                break;
            }
            break;
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_GUILD'])) {
                withTyping(channel, toggleWelcome, [message]);
            }
            break;
        }
        break;
    }
};

async function welcome(member) {
    const { user, guild } = member;

    if (user.bot) return;
    const welcomeOn = serverSettings.get(guild.id, 'welcomeOn');
    if (!welcomeOn) return;
    const welcomeChannelID = serverSettings.get(guild.id, 'welcomeChan');
    const channel = Client.channels.cache.get(welcomeChannelID);
    if (!channel) return;

    const defaultText = `**{username}**#{discriminator} has ${['arrived', 'joined', 'appeared'][Math.floor(Math.random() * 3)]}!`;
    const welcomeText = serverSettings.get(guild.id, 'welcomeMsg');

    const dpColours = await getImgColours(user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }));
    dpColours.sort((a, b) => {
        const bAltRgb = b.rgb().sort((a, b) => b - a);
        const aAltRgb = a.rgb().sort((a, b) => b - a);
        const bAltSat = bAltRgb[0] / bAltRgb[2];
        const aAltSat = aAltRgb[0] / aAltRgb[2];
        return (
            (bAltSat * (bAltRgb[0] - bAltRgb[2]) +
            (b.hsl()[2] * 50)) -
            (aAltSat * (aAltRgb[0] - aAltRgb[2]) +
            (a.hsl()[2] * 50))
        );
    });

    const dpColour = dpColours ?
        dpColours[0].saturate().hex() :
        colours.embedColour;
    const embed = new Discord.MessageEmbed({
        title: 'New Member!',
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        description: (welcomeText || defaultText).replace('{default}', defaultText).replace('{user}', user).replace('{username}', user.username).replace('{discriminator}', user.discriminator).replace('{usertag}', user.tag).replace('{server}', guild.name).replace('{memberno}', guild.memberCount),
        color: dpColour,
        footer: { text: `Member #${guild.memberCount} 🔖` },
        timestamp: member.joinedTimestamp,
    });

    const welcomeMsg = await channel.send(embed);
    return welcomeMsg.url;
}

async function logJoin(member, welcomeMsgPromise) {
    const { user, guild } = member;

    const logsOn = serverSettings.get(guild.id, 'joinLogsOn');
    if (!logsOn) return;
    const logChannelID = serverSettings.get(guild.id, 'joinLogsChan');
    const channel = Client.channels.cache.get(logChannelID);
    if (!channel) return;

    const usedInvite = await resolveUsedInvite(guild);
    const embed = new Discord.MessageEmbed({
        title: 'Member Joined',
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }) },
        description: `**${user.tag}** (${user}) joined ${guild}.`,
        fields: [
            { name: 'Joined On', value: member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: true },
            { name: 'Account Created On', value: user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: true },
        ],
        color: colours.joinColour,
        footer: { text: `Member #${guild.memberCount}` },
    });

    if (usedInvite) {
        embed.addField('Invite Used', `${usedInvite.url}${usedInvite.uses ? ` (${usedInvite.uses.toLocaleString()} uses)` : ''}${usedInvite.inviter ? `\nCreated by ${usedInvite.inviter.tag} (<@${usedInvite.inviter.id}>)` : ''}`, false);
    }

    const welcomeMsgUrl = await welcomeMsgPromise;
    if (welcomeMsgUrl) {
        embed.addField('Welcome Message', `[View Message](${welcomeMsgUrl})`, !!usedInvite);
    }

    embed.addField('User ID', user.id, !!welcomeMsgUrl);

    channel.send(embed);
}

const logLeave = async function(member) {
    const leaveDate = new Date(Date.now());
    const { user, guild } = member;

    const logsOn = serverSettings.get(guild.id, 'joinLogsOn');
    if (!logsOn) return;
    const logChannelID = serverSettings.get(guild.id, 'joinLogsChan');
    const channel = Client.channels.cache.get(logChannelID);
    if (!channel) return;

    const embed = new Discord.MessageEmbed({
        title: 'Member Left',
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        description: `**${user.tag}** (${user}) left ${guild}.`,
        fields: [
            { name: 'Left On', value: leaveDate.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: true },
            { name: 'Account Created On', value: user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: true },
            { name: 'User ID', value: user.id, inline: false },
        ],
        color: colours.leaveColour,
    });

    channel.send(embed);
};

async function setJoinChannel(message, channelArg) {
    const { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send({ content: '⚠ Invalid channel or channel ID.' });
        return;
    }

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send({ content: '⚠ Channel doesn\'t exist in this server.' });
        return;
    }

    const member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    const botPerms = channel.permissionsFor(member);
    if (!botPerms.has('VIEW_CHANNEL', true)) {
        message.channel.send({ content: '⚠ I cannot see this channel!' });
        return;
    }
    if (!botPerms.has('SEND_MESSAGES', true)) {
        message.channel.send({ content: '⚠ I cannot send messages to this channel!' });
        return;
    }

    await serverSettings.set(message.guild.id, 'joinLogsChan', channelID);
    message.channel.send({ content: `Join logs channel set to <#${channelID}>.` });
}

async function toggleJoin(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'joinLogsOn');
    message.channel.send({ content: `Join logs turned ${tog ? 'on':'off'}.` });
}

async function setWelcomeChannel(message, channelArg) {
    const { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send({ content: '⚠ Invalid channel or channel ID.' });
        return;
    }

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send({ content: '⚠ Channel doesn\'t exist in this server.' });
        return;
    }

    const member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    const botPerms = channel.permissionsFor(member);
    if (!botPerms.has('VIEW_CHANNEL', true)) {
        message.channel.send({ content: '⚠ I cannot see this channel!' });
        return;
    }
    if (!botPerms.has('SEND_MESSAGES', true)) {
        message.channel.send({ content: '⚠ I cannot send messages to this channel!' });
        return;
    }

    await serverSettings.set(message.guild.id, 'welcomeChan', channelID);
    message.channel.send({ content: `Welcome channel set to <#${channelID}>.` });
}

async function setWelcomeMsg(message, args) {
    if (args.length < 4) {
        message.channel.send({ content: '⚠ Please provide a message.' });
        return;
    }

    const msg = trimArgs(args, 3, message.content);
    await serverSettings.set(message.guild.id, 'welcomeMsg', msg);
    message.channel.send({ content: 'Welcome message set.' });
}

async function toggleWelcome(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'welcomeOn');
    message.channel.send({ content: `Welcome turned ${tog ? 'on':'off'}.` });
}
