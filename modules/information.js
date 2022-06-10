const Discord = require('discord.js');
const {
    embedPages,
    getMemberNumber,
    searchMembers,
    resolveMember,
    resolveUser,
    withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const axios = require('axios');

const { parseUserID, trimArgs } = require('../functions/functions.js');
const { colours, getImgColours } = require('../functions/colours.js');
const { Image } = require('../functions/images.js');

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'userinfo':
    case 'uinfo':
    case 'memberinfo':
        withTyping(channel, userInfo, [message, args]);
        break;
    case 'avatar':
    case 'dp':
        withTyping(channel, userAvatar, [message, args]);
        break;
    case 'serverboosters':
    case 'boosters':
        withTyping(channel, serverBoosters, [message]);
        break;
    case 'serverinfo':
    case 'sinfo':
    case 'guildinfo':
        withTyping(channel, guildInfo, [message, args[1]]);
        break;
    }
};

async function userInfo(message, args) {
    const { author, guild } = message;
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
        target = trimArgs(args, 1, message.content);
        const members = await guild.members.fetch();

        member = await searchMembers(members, target);
        if (!member) {
            message.channel.send({ content: '⚠ Invalid user or user ID.' });
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
        const embed = await memberEmbed(author, member);
        message.channel.send({ embeds: [embed] });
    } else if (user) {
        const embed = await userEmbed(user);
        message.channel.send({ embeds: [embed] });
    } else {
        message.channel.send({ content: '⚠ Invalid user.' });
    }
}

async function memberEmbed(author, member) {
    const { user, guild } = member;
    const memNo = await getMemberNumber(member);
    const lastMsg = member.lastMessage;

    let response;
    try {
        response = await axios.head(user.displayAvatarURL());
    } catch (e) {
        response = null;
    }

    const embed = new Discord.MessageEmbed({
        author: { name: user.tag, icon_url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }),
        description: `<@${user.id}>`,
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: member.displayColor || 0xffffff,
        fields: [
            { name: 'Account Created', value: user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
        ],
    });

    if (memNo) {
        embed.setFooter(`Member #${memNo}`);
    }

    if (response) {
        const timestamp = new Date(response.headers['last-modified']);
        embed.addField('Avatar Uploaded', timestamp.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);
    }

    embed.addField('Joined On', member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);

    if (member.premiumSince) {
        embed.addField('Boosting Since', member.premiumSince.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);
    }

    embed.addField('User ID', user.id, false);

    if (lastMsg && user.id != author.id) {
        embed.addField('Last Seen', `[View Message](https://discordapp.com/channels/${guild.id}/${lastMsg.channel.id}/${lastMsg.id} "Go To User's Last Message")`, false);
    }

    if (member.roles.cache.size > 1) {
        const allRoles = member.roles.cache.sort((a, b) => {
            return b.comparePositionTo(a);
        });
        let modRoles = [];
        let roles = [];
        const perms = [
            'ADMINISTRATOR', 'MANAGE_GUILD', 'MANAGE_CHANNELS', 'VIEW_AUDIT_LOG',
            'KICK_MEMBERS', 'BAN_MEMBERS',
        ];
        for (const [, role] of allRoles) {
            if (perms.some(p => role.permissions.has(p, false, true))) {
                modRoles.push(role);
            } else {
                roles.push(role);
            }
        }
        if (modRoles.length > 0) {
            modRoles = modRoles.join(' ');
            if (modRoles.length > 1024) {
                modRoles = modRoles.substring(0, 1024);
                modRoles = modRoles.substring(0, modRoles.lastIndexOf('>') + 1);
                modRoles += '.'.repeat(modRoles.length > 1021 ? 1024 - roles.length : 3);
            }
            embed.addField('Mod Roles', modRoles, false);
        }
        if (roles.length > 0) {
            roles = roles.join(' ');
            if (roles.length > 1024) {
                roles = roles.substring(0, 1024);
                roles = roles.substring(0, roles.lastIndexOf('>') + 1);
                roles += '.'.repeat(roles.length > 1021 ? 1024 - roles.length : 3);
            }
            embed.addField('Roles', roles, false);
        }
    }

    return embed;
}

async function userEmbed(user) {
    let response;
    try {
        response = await axios.head(user.displayAvatarURL());
    } catch (e) {
        response = null;
    }

    const embed = new Discord.MessageEmbed({
        author: { name: user.tag, icon_url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }),
        description: `<@${user.id}>`,
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: 0xffffff,
        fields: [
            { name: 'Account Created', value: user.createdAt.toUTCString().replace(' GMT', ' UTC'), inline: false },
        ],
        footer: { text: 'User not in server' },
        timestamp: user.createdAt,
    });

    if (response) {
        const timestamp = new Date(response.headers['last-modified']);
        embed.addField('Avatar Uploaded', timestamp.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), false);
    }

    embed.addField('User ID', user.id, false);

    return embed;
}

async function userAvatar(message, args) {
    const { author, guild } = message;
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
        target = trimArgs(args, 1, message.content);
        const members = await guild.members.fetch();

        member = await searchMembers(members, target);
        if (!member) {
            message.channel.send({ content: '⚠ Invalid user or user ID.' });
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
        message.channel.send({ content: '⚠ Invalid user.' });
        return;
    }

    let res;
    try {
        res = await axios.get(user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }), { responseType: 'arraybuffer' });
    } catch (e) {
        message.channel.send('Error fetching avatar: ' + user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }));
        return;
    }

    const imgSize = Math.max(Math.round(res.headers['content-length'] / 10000) / 100, 1 / 100);
    const imgType = res.headers['content-type'].split('/')[1];
    const timestamp = new Date(res.headers['last-modified']);

    const img = new Image(res.data);
    const dims = img.dimensions;
    const username = user.username;
    const p = username.toLowerCase().endsWith('s') ? '\'' : '\'s';

    const embed = new Discord.MessageEmbed({
        title: `${username + p} Avatar`,
        color: member ? member.displayColor || 0xffffff : 0xffffff,
    });

    if (dims[0] < 150) {
        embed.thumbnail = { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }) };
        embed.description = `Type: ${imgType.toUpperCase()}\nSize: ${imgSize}MB\nDimensions: ${dims.join('x')}\nUploaded: ${timestamp.toLocaleString('en-GB', { timeZone: 'UTC' }).split(',')[0]}`;
    } else {
        embed.image = { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }) };
        embed.footer = { text: `Type: ${imgType.toUpperCase()}  |  Size: ${dims ? dims.join('x') + ' - ' : ''}${imgSize}MB` };
        embed.timestamp = timestamp;
    }

    message.channel.send({ embeds: [embed] });
}

async function guildInfo(message, target) {
    let guild;
    if (!target || message.author.id != '125414437229297664') {
        guild = message.guild;
    } else {
        const match = target.match(/^\d+$/);
        if (!match) {
            message.channel.send({ content: '⚠ Invalid guild ID.' });
            return;
        }
        guild = await Client.guilds.cache.get(match[0]);
        if (!guild) {
            message.channel.send({ content: '⚠ Invalid guild or bot is not in this server.' });
            return;
        }
    }

    guild = await guild.fetch();

    const embed = await serverEmbed(guild);
    message.channel.send({ embeds: [embed] });
}

async function serverEmbed(guild) {
    const onlineCount = guild.approximatePresenceCount;
    const offlineCount = guild.approximateMemberCount - onlineCount;
    const statusString = `Online: ${onlineCount}  Offline: ${offlineCount}`;
    const iconColours = await getImgColours(guild.iconURL({ format: 'png', dynamic: true, size: 512 }));
    const iconColour = iconColours ?
        iconColours[1].saturate().hex() :
        colours.embedColour;

    const embed = {
        author: { name: guild.name, icon_url: guild.iconURL({ format: 'png', dynamic: true, size: 32 }) },
        thumbnail: { url: guild.iconURL({ format: 'png', dynamic: true, size: 512 }) },
        color: iconColour,
        fields: [
            { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Members', value: guild.approximateMemberCount.toLocaleString(), inline: true },
            { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
            { name: 'Text Channels', value: guild.channels.cache.filter(c => c.type == 'GUILD_TEXT').size.toString(), inline: true },
            { name: 'Voice Channels', value: guild.channels.cache.filter(c => c.type == 'GUILD_VOICE').size.toString(), inline: true },
            { name: 'Created On', value: guild.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), inline: false },
            { name: 'Emojis', value: `${guild.emojis.cache.size} (${guild.emojis.cache.filter(e => e.animated).size} animated)`, inline: true },
            { name: 'Statuses', value: statusString, inline: false },
            { name: 'Level', value: guild.premiumTier, inline: true },
            { name: 'Boosters', value: guild.premiumSubscriptionCount.toString(), inline: true },
        ],
        footer: { text: `ID #${guild.id}` },
    };

    const bannerURL = guild.bannerURL({ format: 'png', dynamic: true, size: 2048 });
    if (bannerURL) {
        embed.setImage(bannerURL);
    }

    return embed;
}

async function serverBoosters(message) {
    const { guild } = message;
    guild.members.cache = await guild.members.fetch();
    const boosters = guild.members.cache.filter(member => member.premiumSince);

    if (boosters.size < 1) {
        message.channel.send({ content: '⚠ Nobody is currently boosting this server!' });
        return;
    }

    let boosterString = boosters.sort((a, b) => a.premiumSinceTimestamp - b.premiumSinceTimestamp).map(member => `<@${member.id}> (${member.user.tag})`).join('\n');

    const descriptions = [];
    while (boosterString.length > 2048 || boosterString.split('\n').length > 25) {
        let currString = boosterString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        boosterString = boosterString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(boosterString);

    const pages = descriptions.map((desc, i) => ({
        embeds: [{
            author: {
                name: `${guild.name} Boosters`, icon_url: 'https://i.imgur.com/x0zhlDu.png',
            },
            description: desc,
            color: 0xf47fff,
            footer: {
                text: `${boosters.size} boosters; ${guild.premiumSubscriptionCount} boosts ${descriptions.length > 1 ? `| Page ${i + 1} of ${descriptions.length}` : ''}`,
            },
        }],
    }));

    embedPages(message, pages);
}
