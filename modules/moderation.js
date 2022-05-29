const { Client } = require('../haseul.js');

const { checkPermissions, resolveMember, resolveRole, resolveUser, withTyping } = require('../functions/discord.js');
const { setMuteRolePerms } = require('../functions/moderation.js');

const serverSettings = require('../utils/server_settings.js');
const filterCache = require('../utils/filter_cache');
const { trimArgs } = require('../functions/functions.js');

const userIDsRegex = /^(?:<@\D?)?(\d+)(?:>)?\s*,?\s*/;
const domainRegex = /\S+\.\S+/gi;

exports.onMessage = async function(message) {
    const filterOn = serverSettings.get(message.guild.id, 'spamFilterOn');
    if (filterOn) {
        filterSpam(message);
    }
};

exports.onCommand = async function(message, args) {
    const { channel, member } = message;

    switch (args[0]) {
    case 'ban':
        if (checkPermissions(member, ['BAN_MEMBERS'])) {
            withTyping(channel, banUsers, [message, args]);
        } else {
            channel.send({ content: '⚠ You do not have permission to ban users.' });
        }
        break;
    case 'purge':
        if (checkPermissions(member, ['BAN_MEMBERS'])) {
            withTyping(channel, banUsers, [message, args, 1]);
        } else {
            channel.send({ content: '⚠ You do not have permission to ban users.' });
        }
        break;
    case 'unban':
        if (checkPermissions(member, ['BAN_MEMBERS'])) {
            withTyping(channel, unbanUsers, [message, args]);
        } else {
            channel.send({ content: '⚠ You do not have permission to unban users.' });
        }
        break;
    case 'kick':
        if (checkPermissions(member, ['KICK_MEMBERS'])) {
            withTyping(channel, kickUsers, [message, args]);
        } else {
            channel.send({ content: '⚠ You do not have permission to kick users.' });
        }
        break;
    case 'mute':
        if (checkPermissions(member, ['MANAGE_ROLES'])) {
            withTyping(channel, muteUsers, [message, args]);
        } else {
            channel.send({ content: '⚠ You do not have permission to manage roles.' });
        }
        break;
    case 'unmute':
        if (checkPermissions(member, ['MANAGE_ROLES'])) {
            withTyping(channel, unmuteUsers, [message, args]);
        } else {
            channel.send({ content: '⚠ You do not have permission to manage roles.' });
        }
        break;
    case 'muterole':
        switch (args[1]) {
        case 'set':
            if (checkPermissions(member, ['MANAGE_ROLES'])) {
                withTyping(channel, setMuteRole, [message, args]);
            } else {
                channel.send({ content: '⚠ You do not have permission to manage roles.' });
            }
            break;
        case 'update':
            if (checkPermissions(member, ['MANAGE_ROLES'])) {
                withTyping(channel, updateMuteRole, [message]);
            } else {
                channel.send({ content: '⚠ You do not have permission to manage roles.' });
            }
            break;
        }
        break;
    case 'spamfilter':
        switch (args[1]) {
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_MESSAGES'])) {
                withTyping(channel, toggleSpamFilter, [message]);
            } else {
                channel.send({ content: '⚠ You do not have permission to manage messages.' });
            }
            break;
        }
    }
};

async function filterSpam(message) {
    if (!filterCache.spamDomainsRegex) {
        return;
    }

    const domains = message.content.match(domainRegex);
    if (!domains) {
        return;
    }

    for (const domain of domains) {
        if (filterCache.spamDomainsRegex.test(domain) == true) {
            filterCache.deletedSpamMsgs.push(message.id);
            message.delete();
            return;
        }
    }
}

async function banUsers(message, args, days=0) {
    const botMember = await resolveMember(message.guild, Client.user.id);
    if (!checkPermissions(botMember, ['BAN_MEMBERS'])) {
        message.channel.send({ content: '⚠ I do not have permission to ban users.' });
        return;
    }

    if (args.length < 2) {
        message.channel.send({ content: '⚠ No users provided to ban.' });
        return;
    }

    const banString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = banString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        message.channel.send({ content: '⚠ Invalid formatting, please provide a user or multiple users to ban.' });
        return;
    }

    const isOwner = message.member.id == message.guild.ownerID;
    const reason = banString.slice(userIDEnd) || `User was banned by ${message.author.tag}`;
    const bans = await message.guild.fetchBans();

    let banCount = 0;
    const bannedUsers = []; // users that have been banned
    const alreadyBanned = []; // users who are already banned
    const botBanErrors = []; // users who the bot is unable to ban
    const userBanErrors = []; // users who the banner is unable to ban
    const invalidIDs = []; // IDs that cannot be resolved into users
    const banErrors = []; // generic unknown ban errors
    for (const userID of userIDs) {
        const member = await resolveMember(message.guild, userID);
        const user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (bans.has(user.id)) {
            alreadyBanned.push(user.tag);
        } else if (member && !member.bannable) {
            botBanErrors.push(user.id == message.author.id ? 'you' : user.id == Client.user.id ? 'myself' : user.tag);
        } else if (!isOwner &&
                member &&
                message.member.roles.highest.position <=
                member.roles.highest.position) {
            userBanErrors.push(user.id == message.author.id ? 'yourself' : user.tag);
        } else if (banCount < 5) {
            try {
                await message.guild.members.ban(user.id, { days, reason });
                bannedUsers.push(user.tag);
                banCount++;
            } catch (e) {
                banErrors.push(user.tag);
            }
        }
    }

    let replyString = '';
    if (userIDs.size > 5) replyString += '❌ You may not ban more than 5 users in a single command.\n';
    if (bannedUsers.length > 0) replyString += `✅ Banned ${bannedUsers.length == 1 ? `**${bannedUsers[0]}**` : `**${bannedUsers.length}** users: ${bannedUsers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (alreadyBanned.length > 0) replyString += `❌ ${alreadyBanned.length == 1 ? `**${alreadyBanned[0]}** is already banned` : `**${alreadyBanned.length}** users are already banned: ${alreadyBanned.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (botBanErrors.length > 0) replyString += `❌ I am unable to ban ${botBanErrors.length == 1 ? `**${botBanErrors[0]}**` : `the following users: ${botBanErrors.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (userBanErrors.length > 0) replyString += `❌ You are unable to ban ${userBanErrors.length == 1 ? `**${userBanErrors[0]}**` : `the following users: ${userBanErrors.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (invalidIDs.length > 0) replyString += `❌ The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
    if (banErrors.length > 5) replyString += `⚠ Ban errors: ${banErrors.join(', ')}.\n`;
    message.channel.send(replyString);
}

async function unbanUsers(message, args) {
    const botMember = await resolveMember(message.guild, Client.user.id);
    if (!checkPermissions(botMember, ['BAN_MEMBERS'])) {
        message.channel.send({ content: '⚠ I do not have permission to unban users.' });
        return;
    }

    if (args.length < 2) {
        message.channel.send({ content: '⚠ No users provided to unban.' });
        return;
    }

    const banString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = banString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        message.channel.send({ content: '⚠ Invalid formatting, please provide a user or multiple users to unban.' });
        return;
    }

    const reason = banString.slice(userIDEnd) || `User was unbanned by ${message.author.tag}`;
    const bans = await message.guild.fetchBans();

    let unbanCount = 0;
    const unbannedUsers = []; // users that have been unbanned
    const notBanned = []; // users who are not already banned
    const invalidIDs = []; // IDs that cannot be resolved into users
    const unbanErrors = []; // generic unknown unban errors
    for (const userID of userIDs) {
        const user = await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!bans.has(user.id)) {
            notBanned.push(user.tag);
        } else if (unbanCount < 5) {
            try {
                await message.guild.members.unban(user.id, reason);
                unbannedUsers.push(user.tag);
                unbanCount++;
            } catch (e) {
                unbanErrors.push(user.tag);
            }
        }
    }

    let replyString = '';
    if (userIDs.size > 5) replyString += '❌ You may not unban more than 5 users in a single command.\n';
    if (unbannedUsers.length > 0) replyString += `✅ Unbanned ${unbannedUsers.length == 1 ? `**${unbannedUsers[0]}**` : `**${unbannedUsers.length}** users: ${unbannedUsers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (notBanned.length > 0) replyString += `❌ ${notBanned.length == 1 ? `**${notBanned[0]}** is already unbanned` : `**${notBanned.length}** users are already unbanned: ${notBanned.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (invalidIDs.length > 0) replyString += `❌ The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
    if (unbanErrors.length > 5) replyString += `⚠ Unban errors: ${unbanErrors.join(', ')}.\n`;
    message.channel.send(replyString);
}

async function kickUsers(message, args) {
    const botMember = await resolveMember(message.guild, Client.user.id);
    if (!checkPermissions(botMember, ['KICK_MEMBERS'])) {
        message.channel.send({ content: '⚠ I do not have permission to kick users.' });
        return;
    }

    if (args.length < 2) {
        message.channel.send({ content: '⚠ No users provided to kick.' });
        return;
    }

    const kickString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = kickString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        message.channel.send({ content: '⚠ Invalid formatting, please provide a user or multiple users to kick.' });
        return;
    }

    const isOwner = message.member.id == message.guild.ownerID;
    const reason = kickString.slice(userIDEnd) || `User was kicked by ${message.author.tag}`;

    let kickCount = 0;
    const kickedUsers = []; // users that have been kicked
    const notMembers = []; // users who cannot be kicked
    const botKickErrors = []; // users who the bot is unable to kick
    const userKickErrors = []; // users who the banner is unable to kick
    const invalidIDs = []; // IDs that cannot be resolved into users
    const kickErrors = []; // generic unknown kick errors
    for (const userID of userIDs) {
        const member = await resolveMember(message.guild, userID);
        const user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (!member.kickable) {
            botKickErrors.push(user.id == message.author.id ? 'you' : user.id == Client.user.id ? 'myself' : user.tag);
        } else if (!isOwner &&
            message.member.roles.highest.position <=
            member.roles.highest.position) {
            userKickErrors.push(user.id == message.author.id ? 'yourself' : user.tag);
        } else if (kickCount < 5) {
            try {
                await member.kick(reason);
                kickedUsers.push(user.tag);
                kickCount++;
            } catch (e) {
                kickErrors.push(user.tag);
            }
        }
    }

    let replyString = '';
    if (userIDs.size > 5) replyString += '❌ You may not kick more than 5 users in a single command.\n';
    if (kickedUsers.length > 0) replyString += `✅ Kicked ${kickedUsers.length == 1 ? `**${kickedUsers[0]}**` : `**${kickedUsers.length}** users: ${kickedUsers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (botKickErrors.length > 0) replyString += `❌ I am unable to kick ${botKickErrors.length == 1 ? `**${botKickErrors[0]}**` : `the following users: ${botKickErrors.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (userKickErrors.length > 0) replyString += `❌ You are unable to kick ${userKickErrors.length == 1 ? `**${userKickErrors[0]}**` : `the following users: ${userKickErrors.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (notMembers.length > 0) replyString += `❌ ${notMembers.length == 1 ? `**${notMembers[0]}** is not a server member` : `The following users are not server members: ${notMembers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (invalidIDs.length > 0) replyString += `❌ The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
    if (kickErrors.length > 5) replyString += `⚠ Kick errors: ${kickErrors.join(', ')}.\n`;
    message.channel.send(replyString);
}

async function muteUsers(message, args) {
    const botMember = await resolveMember(message.guild, Client.user.id);
    if (!checkPermissions(botMember, ['MANAGE_ROLES'])) {
        message.channel.send({ content: '⚠ I do not have permission to manage roles.' });
        return;
    }

    const muteroleID = await serverSettings.get(message.guild.id, 'muteroleID');
    if (!muteroleID) {
        message.channel.send({ content: '⚠ No mute role has been set in this server.' });
        return;
    }

    const muterole = await message.guild.roles.fetch(muteroleID);
    if (!muterole) {
        message.channel.send({ content: '⚠ The mute role set for this server no longer exists.' });
        return;
    }

    const isOwner = message.member.id == message.guild.ownerID;
    const userRole = message.member.roles.highest;
    const botRole = botMember.roles.highest;
    if (!isOwner && userRole.position <= muterole.position) {
        message.channel.send({ content: '⚠ You do not have access to the mute role.' });
        return;
    }
    if (botRole.position <= muterole.position) {
        message.channel.send({ content: '⚠ I do not have access to the mute role.' });
        return;
    }

    if (args.length < 2) {
        message.channel.send({ content: '⚠ No users provided to mute.' });
        return;
    }

    const muteString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = muteString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        message.channel.send({ content: '⚠ Invalid formatting, please provide a user or multiple users to mute.' });
        return;
    }

    const reason = muteString.slice(userIDEnd) || `User was muted by ${message.author.tag}`;

    let muteCount = 0;
    const mutedUsers = []; // users that have been muted
    const alreadyMuted = []; // users who are already muted
    const cannotMute = []; // users you cannot mute
    const notMembers = []; // users who are not members
    const invalidIDs = []; // IDs that cannot be resolved into users
    const muteErrors = []; // generic unknown mute errors
    for (const userID of userIDs) {
        const member = await resolveMember(message.guild, userID);
        const user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (checkPermissions(member, ['MANAGE_ROLES'])) {
            cannotMute.push(user.id == message.author.id ? 'yourself' : user.id == Client.user.id ? 'me' : user.tag);
        } else if (member.roles.cache.has(muterole.id)) {
            alreadyMuted.push(user.tag);
        } else if (muteCount < 5) {
            try {
                await member.roles.add(muterole, reason);
                mutedUsers.push(user.tag);
                muteCount++;
            } catch (e) {
                muteErrors.push(user.tag);
            }
        }
    }

    let replyString = '';
    if (userIDs.size > 5) replyString += '❌ You may not mute more than 5 users in a single command.\n';
    if (mutedUsers.length > 0) replyString += `✅ Muted ${mutedUsers.length == 1 ? `**${mutedUsers[0]}**` : `**${mutedUsers.length}** users: ${mutedUsers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (alreadyMuted.length > 0) replyString += `❌ ${alreadyMuted.length == 1 ? `**${alreadyMuted[0]}** is already muted` : `**${alreadyMuted.length}** users are already muted: ${alreadyMuted.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (cannotMute.length > 0) replyString += `❌ You are unable to mute ${cannotMute.length == 1 ? `**${cannotMute[0]}**` : `the following users: ${cannotMute.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (notMembers.length > 0) replyString += `❌ ${notMembers.length == 1 ? `**${notMembers[0]}** is not a server member` : `The following users are not server members: ${notMembers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (invalidIDs.length > 0) replyString += `❌ The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
    if (muteErrors.length > 5) replyString += `⚠ Mute errors: ${muteErrors.join(', ')}.\n`;
    message.channel.send(replyString);
}

async function unmuteUsers(message, args) {
    const botMember = await resolveMember(message.guild, Client.user.id);
    if (!checkPermissions(botMember, ['MANAGE_ROLES'])) {
        message.channel.send({ content: '⚠ I do not have permission to manage roles.' });
        return;
    }

    const muteroleID = await serverSettings.get(message.guild.id, 'muteroleID');
    if (!muteroleID) {
        message.channel.send({ content: '⚠ No mute role has been set in this server.' });
        return;
    }

    const muterole = await message.guild.roles.fetch(muteroleID);
    if (!muterole) {
        message.channel.send({ content: '⚠ The mute role set for this server no longer exists.' });
        return;
    }

    const isOwner = message.member.id == message.guild.ownerID;
    const userRole = message.member.roles.highest;
    const botRole = botMember.roles.highest;
    if (!isOwner && userRole.position <= muterole.position) {
        message.channel.send({ content: '⚠ You do not have access to the mute role.' });
        return;
    }
    if (botRole.position <= muterole.position) {
        message.channel.send({ content: '⚠ I do not have access to the mute role.' });
        return;
    }

    if (args.length < 2) {
        message.channel.send({ content: '⚠ No users provided to mute.' });
        return;
    }

    const muteString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = muteString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        message.channel.send({ content: '⚠ Invalid formatting, please provide a user or multiple users to mute.' });
        return;
    }

    const reason = muteString.slice(userIDEnd) || `User was unmuted by ${message.author.tag}`;

    let unmuteCount = 0;
    const unmutedUsers = []; // users that have been muted
    const notMuted = []; // users who are already muted
    const cannotUnmute = []; // users you cannot mute
    const notMembers = []; // users who are not members
    const invalidIDs = []; // IDs that cannot be resolved into users
    const muteErrors = []; // generic unknown mute errors
    for (const userID of userIDs) {
        const member = await resolveMember(message.guild, userID);
        const user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (checkPermissions(member, ['MANAGE_ROLES'])) {
            cannotUnmute.push(user.id == message.author.id ? 'yourself' : user.id == Client.user.id ? 'me' : user.tag);
        } else if (!member.roles.cache.has(muterole.id)) {
            notMuted.push(user.tag);
        } else if (unmuteCount < 5) {
            try {
                await member.roles.remove(muterole, reason);
                unmutedUsers.push(user.tag);
                unmuteCount++;
            } catch (e) {
                muteErrors.push(user.tag);
            }
        }
    }

    let replyString = '';
    if (userIDs.size > 5) replyString += '❌ You may not unmute more than 5 users in a single command.\n';
    if (unmutedUsers.length > 0) replyString += `✅ Unmuted ${unmutedUsers.length == 1 ? `**${unmutedUsers[0]}**` : `**${unmutedUsers.length}** users: ${unmutedUsers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (notMuted.length > 0) replyString += `❌ ${notMuted.length == 1 ? `**${notMuted[0]}** is already unmuted` : `**${notMuted.length}** users are already muted: ${notMuted.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (cannotUnmute.length > 0) replyString += `❌ You are unable to unmute ${cannotUnmute.length == 1 ? `**${cannotUnmute[0]}**` : `the following users: ${cannotUnmute.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (notMembers.length > 0) replyString += `❌ ${notMembers.length == 1 ? `**${notMembers[0]}** is not a server member` : `The following users are not server members: ${notMembers.map(n => `**${n}**`).join(', ')}`}.\n`;
    if (invalidIDs.length > 0) replyString += `❌ The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
    if (muteErrors.length > 5) replyString += `⚠ Mute errors: ${muteErrors.join(', ')}.\n`;
    message.channel.send(replyString);
}

async function setMuteRole(message, args) {
    const botMember = await resolveMember(message.guild, Client.user.id);
    if (!checkPermissions(botMember, ['MANAGE_ROLES'])) {
        message.channel.send({ content: '⚠ I do not have permission to manage roles.' });
        return;
    }

    const muteRole = args[2];
    if (!muteRole) {
        message.channel.send({ content: '⚠ Please provide a role name or mention to set as the mute role.' });
        return;
    }
    if (muteRole == '@everyone') {
        message.channel.send({ content: '⚠ You cannot use the @everyone role for the mute role.' });
        return;
    }

    let role;
    const roleIDMatch = muteRole.match(/<@&(\d+)>/);
    if (roleIDMatch) {
        const roleID = roleIDMatch[1];
        role = await resolveRole(message.guild, roleID);
        if (!role) {
            message.channel.send({ content: '⚠ Invalid role provided.' });
            return;
        } else if (role.id == message.guild.roles.everyone.id) {
            message.channel.send({ content: '⚠ You cannot use the @everyone role as the mute role.' });
            return;
        }
    } else {
        role = message.guild.roles.cache.find(role => role.name == muteRole);
        if (!role) {
            role = await message.guild.roles.create({
                data: { name: muteRole },
                reason: 'Mute role created from muterole set command.',
            });
            const channelsArray = message.guild.channels.cache.values();
            setMuteRolePerms(channelsArray, role.id);
        } else if (message.member.roles.highest.position <= role.position) {
            message.channel.send({ content: '⚠ I cannot use this role to mute users, please move the role below mine or choose another role.' });
            return;
        } else if (role.managed) {
            message.channel.send({ content: '⚠ Please choose a role that is not managed by an external service.' });
            return;
        }
    }

    serverSettings.set(message.guild.id, 'muteroleID', role.id);
    message.channel.send({ content: `Mute role set to \`${role.name}\`.` });
}

async function updateMuteRole(message) {
    const botMember = await resolveMember(message.guild, Client.user.id);
    if (!checkPermissions(botMember, ['MANAGE_ROLES'])) {
        message.channel.send({ content: '⚠ I do not have permission to manage roles.' });
        return;
    }

    const muteroleID = await serverSettings.get(message.guild.id, 'muteroleID');
    if (!muteroleID) {
        message.channel.send({ content: '⚠ No mute role set.' });
        return;
    }

    const role = await message.guild.roles.fetch(muteroleID);
    if (!role) {
        message.channel.send({ content: '⚠ The mute role no longer exists on this server.' });
        return;
    }

    const channelsArray = message.guild.channels.cache.values();
    await setMuteRolePerms(channelsArray, role.id);
    message.channel.send({ content: `Updated channel permissions for the mute role: \`${role.name}\`` });
}

async function toggleSpamFilter(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'spamFilterOn');
    message.channel.send({ content: `Spam filter turned ${tog ? 'on':'off'}.` });
}
