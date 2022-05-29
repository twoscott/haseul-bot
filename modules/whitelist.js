const { Client } = require('../haseul.js');
const { resolveMember, withTyping } = require('../functions/discord.js');

const config = require('../config.json');
const clientSettings = require('../utils/client_settings.js');
const serverSettings = require('../utils/server_settings.js');

const { parseChannelID } = require('../functions/functions.js');
const { patreon } = require('../utils/patreon.js');

exports.onReady = async function() {
    const whitelistChannelID = clientSettings.get('whitelistChan');
    if (whitelistChannelID) {
        const whitelistChannel = await Client.channels
            .fetch(whitelistChannelID);
        whitelistChannel.messages.fetch({ limit: 100 }, true);
    }

    Client.guilds.cache.forEach(guild => {
        const guildEntry = serverSettings.getServer(guild.id);
        if (!guildEntry) { // << SERVER NOT WHITELISTED >> \\
            // await guild.leave();
            console.log(`[DRY RUN] LEFT ${guild.name} ${guild.id}`);
        }
    })
};

exports.newGuild = async function(guild) {
    const guildEntry = serverSettings.getServer(guild.id);
    console.log(`Bot added to new server, ID: ${guild.id}`);
    if (!guildEntry) { // << SERVER NOT WHITELISTED >> \\
        let response;
        try {
            response = await patreon.get('/campaigns/'+config.haseul_campaign_id+'/members?include=user,currently_entitled_tiers&fields'+encodeURI('[member]')+'=full_name,patron_status,pledge_relationship_start,currently_entitled_amount_cents&fields'+encodeURI('[tier]')+'title,&fields'+encodeURI('[user]')+'=social_connections');
        } catch (e) {
            console.error('Patreon error: ' + e.response.status);
            console.log(`Left ${guild.name} (${guild.id}) - NOT WHITELISTED & PATREON REQUEST FAILED.`);
            await guild.leave();
            return;
        }

        let ownerPatronT3 = false;
        try {
            console.log(JSON.stringify(response.data));
            const patreonMembers = response.data.data;
            const patreonUsers = response.data.included.filter(x => x.type == 'user' && x.attributes.social_connections.discord);

            console.log('Checking if guild owner is Patreon...');
            for (let i = 0; i < patreonUsers.length && !ownerPatronT3; i++) {
                const user = patreonUsers[i];
                const userDiscord = user.attributes.social_connections.discord;
                const userDiscordID = userDiscord ? userDiscord.user_id : null;

                if (userDiscordID == guild.ownerID) {
                    const member = patreonMembers
                        .find(m => m.relationships.user.data.id == user.id);

                    const entitledCents = member
                        .attributes
                        .currently_entitled_amount_cents;

                    if (entitledCents >= 500 && member.attributes.patron_status == 'active_patron') {
                        console.log('Owner is patron');
                        ownerPatronT3 = true;
                        console.log(`Active patron: ${userDiscordID}`);
                    }
                }
            }
        } catch (e) {
            console.error(Error('Patreon guild join check error: ' + e));
        }

        if (ownerPatronT3) {
            try {
                await serverSettings.initGuild(guild.id);
            } catch (e) {
                console.error(e);
            }
        } else {
            console.log(`Left ${guild.name} (${guild.id}) - NOT WHITELISTED & OWNER NOT PATRON.`);
            await guild.leave();
        }
    }
};

exports.onMessage = async function(message) {
    whitelistReact(message);
};

exports.onCommand = async function(message, args) {
    const { author, channel } = message;

    switch (args[0]) {
    case 'whitelist':
        switch (args[1]) {
        case 'channel':
            switch (args[2]) {
            case 'set':
                if (author.id === '125414437229297664') {
                    withTyping(
                        channel, setWhitelistChannel, [message, args[3]],
                    );
                }
                break;
            }
            break;
        case 'toggle':
            if (author.id === '125414437229297664') {
                withTyping(channel, toggleWhitelist, [message]);
            }
            break;
        default:
            if (author.id === '125414437229297664') {
                withTyping(channel, whitelistServer, [message, args[1]]);
            }
            break;
        }
        break;
    }
};

exports.onReact = async function(reaction, user) {
    const { emoji, message } = reaction;
    const whitelistChannelID = clientSettings.get('whitelistChan');
    if (message.channel.id == whitelistChannelID && user.id === '125414437229297664') {
        switch (emoji.name) {
        case '✅':
            const inviteMatch = message.content.match(/(?:\W|^)(?:https?\:\/\/)?discord(?:\.gg|\.com\/invite)\/(\S+)/);
            if (!inviteMatch) {
                await message.react('📎');
                break;
            }

            const inviteCode = inviteMatch[1];
            let invite;
            try {
                invite = await Client.fetchInvite(inviteCode);
            } catch (e) {
                console.error(e);
                const warnReact = await message.react('⚠️');
                setTimeout(() => warnReact.remove(), 3000);
                break;
            }
            const guild = invite.guild || invite.channel ?
                invite.channel.guild || null :
                null || null;
            const guildID = invite.guildID || guild ? guild.id : null;
            const guildName = guild ? guild.name : null;
            if (!guildID) {
                const warnReact = await message.react('🆔');
                setTimeout(() => warnReact.remove(), 3000);
                break;
            }

            const currentWhitelistEntry = serverSettings.getServer(guildID);
            if (currentWhitelistEntry) {
                await message.react('🗒️');
                message.channel.send({ content: `<@${message.author.id}> ${guildName ? `**${guildName}**` : 'Your submitted server'} is already whitelisted.` });
                break;
            }

            try {
                await serverSettings.initGuild(guildID);
            } catch (e) {
                console.error(e);
                const warnReact = await message.react('🚫');
                setTimeout(() => warnReact.remove(), 3000);
                break;
            }
            await message.reactions.removeAll();
            message.react('✅');
            message.channel.send({ content: `<@${message.author.id}> ${guildName ? `**${guildName}**` : 'your submitted server'} has been whitelisted. You can now use this link to invite Haseul Bot: <https://haseulbot.xyz/invite>` });
            break;
        case '❌':
            await message.reactions.removeAll();
            message.react('❌');
            break;
        case '✏️':
            await message.reactions.removeAll();
            message.react('✏️');
            message.channel.send({ content: `<@${message.author.id}> please follow the provided instructions.` });
            break;
        }
    }
};

async function whitelistReact(message) {
    const whitelistChannelID = clientSettings.get('whitelistChan');
    const whitelistOn = clientSettings.get('whitelistOn');
    if (message.channel.id == whitelistChannelID && whitelistOn) {
        const inviteMatch = message.content.match(/(?:\W|^)(?:https?\:\/\/)?discord(?:\.gg|\.com\/invite)\/(\S+)/);
        if (inviteMatch) {
            const inviteCode = inviteMatch[1];
            let invite;
            try {
                invite = await Client.fetchInvite(inviteCode);
            } catch (e) {
                console.error(e);
            }
            const guild = invite.guild || invite.channel ?
                invite.channel.guild || null :
                null || null;
            const guildID = invite.guildID || guild ? guild.id : null;
            const guildName = guild ? guild.name : null;
            if (guildID) {
                const currentWhitelistEntry = serverSettings.getServer(guildID);
                if (currentWhitelistEntry) {
                    await message.react('🗒️');
                    message.channel.send({ content: `<@${message.author.id}> ${guildName ? `**${guildName}**` : 'Your submitted server'} is already whitelisted.` });
                    return;
                }
            }

            await message.react('✅');
            await message.react('❌');
            await message.react('✏️');
        }
    }
}

async function whitelistServer(message, invLink) {
    const inviteMatch = invLink.match(/(?:\W|^)(?:https?\:\/\/)?discord(?:\.gg|\.com\/invite)\/(\S+)/);
    if (!inviteMatch) {
        message.channel.send({ content: '⚠ Invalid invite link.' });
        return;
    }

    const inviteCode = inviteMatch[1];
    let invite;
    try {
        invite = await Client.fetchInvite(inviteCode);
    } catch (e) {
        console.error(e);
        message.channel.send({ content: '⚠ Unable to fetch invite link' });
        return;
    }
    const guild = invite.guild || invite.channel ?
        invite.channel.guild || null :
        null || null;
    const guildID = invite.guildID || guild ? guild.id : null;
    const guildName = guild ? guild.name : null;
    if (!guildID) {
        message.channel.send({ content: '⚠ Unable to fetch guild ID from invite link.' });
        return;
    }

    const currentWhitelistEntry = serverSettings.getServer(guildID);
    if (currentWhitelistEntry) {
        message.channel.send({ content: '⚠ This server is already whitelisted.' });
        return;
    }

    try {
        await serverSettings.initGuild(guildID);
    } catch (e) {
        console.error(e);
        message.channel.send({ content: '⚠ Error occurred whitelisting server' });
        return;
    }
    message.channel.send({ content: `${guildName ? `**${guildName}**` : `<${invLink}>`} has been whitelisted.` });
}

async function setWhitelistChannel(message, channelArg) {
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

    await clientSettings.set('whitelistChan', channelID);
    message.channel.send({ content: `Whitelist channel set to <#${channelID}>.` });
}

async function toggleWhitelist(message) {
    const tog = await clientSettings.toggle('whitelistOn');
    message.channel.send({ content: `Whitelist turned ${tog ? 'on':'off'}.` });
}
