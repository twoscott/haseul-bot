const { checkPermissions, embedPages, withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const axios = require('axios');

const config = require('../config.json');
const database = require('../db_queries/twitter_db.js');

const twitter = axios.create({
    baseURL: 'https://api.twitter.com',
    timeout: 10000,
    headers: { 'authorization': 'Bearer ' + config.twt_bearer },
});
const { patreon } = require('../utils/patreon.js');

exports.onCommand = async function(message, args) {
    const { channel, member } = message;

    switch (args[0]) {
    case 'twitter':
    case 'twt':
        switch (args[1]) {
        case 'noti':
        case 'notif':
        case 'notifs':
        case 'notification':
            switch (args[2]) {
            case 'add':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(
                        channel, twitterNotifAdd, [message, args.slice(3)],
                    );
                }
                break;
            case 'remove':
            case 'delete':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(
                        channel, twitterNotifRemove, [message, args.slice(3)],
                    );
                }
                break;
            case 'list':
                if (checkPermissions(member, ['MANAGE_CHANNELS'])) {
                    withTyping(channel, twitterNotifList, [message]);
                }
                break;
            }
            break;
        case 'toggle':
            switch (args[2]) {
            case 'retweets':
            case 'rts':
                if (checkPermissions(member, ['MANAGE_GUILD'])) {
                    withTyping(
                        channel, retweetToggle, [message, args.slice(3)],
                    );
                }
                break;
            }
            break;
        case 'help':
        default:
            channel.send({ content: 'Help with Twitter can be found here: https://haseulbot.xyz/#twitter' });
            break;
        }
        break;
    }
};

async function twitterNotifAdd(message, args) {
    const { guild } = message;

    const formatMatch = args.join(' ').trim().match(/^(?:https:\/\/twitter\.com\/)?@?(.+?)(?:\/media\/?)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        message.channel.send({ content: '⚠ Incorrect formatting. For help with Twitter, see: https://haseulbot.xyz/#twitter' });
        return;
    }

    const screenNameTarget = formatMatch[1];
    const channelID = formatMatch[2];
    const mentionRole = formatMatch[3];

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send({ content: '⚠ The channel provided does not exist in this server.' });
        return;
    }
    if (channel.type !== 'GUILD_TEXT' && channel.type !== 'GUILD_NEWS') {
        message.channel.send({ content: '⚠ Please provide a text channel to send notifications to.' });
        return;
    }

    let member;
    try {
        member = await guild.members.fetch(Client.user.id);
    } catch (e) {
        member = null;
    }
    if (!member) {
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    const botCanRead = channel.permissionsFor(member).has('VIEW_CHANNEL', true);
    if (!botCanRead) {
        message.channel.send({ content: '⚠ I cannot see this channel!' });
        return;
    }

    let role;
    if (mentionRole) {
        if (formatMatch[4] && formatMatch[6]) {
            role = await guild.roles.fetch(formatMatch[5]);
            if (!role) {
                message.channel.send({ content: `⚠ A role with the ID \`${formatMatch[5]}\` does not exist in this server.` });
                return;
            }
        } else {
            role = guild.roles.cache.find(role => role.name == formatMatch[5]);
            if (!role) {
                message.channel.send({ content: `⚠ The role \`${formatMatch[5]}\` does not exist in this server.` });
                return;
            }
        }
    }

    let response;
    try {
        response = await twitter.get('/1.1/users/show.json', { params: { screen_name: screenNameTarget } });
    } catch (e) {
        switch (e.response.status) {
        case 403:
        case 404:
            message.channel.send({ content: `⚠ \`${screenNameTarget}\` is an invalid Twitter handle.` });
            break;
        case 429:
            message.channel.send({ content: '⚠ API rate limit exceeded.' });
            break;
        default:
            message.channel.send({ content: '⚠ Unknown error occurred.' });
            break;
        }
        return;
    }

    const { id_str: idString, screen_name: screenName } = response.data;

    try {
        response = await patreon.get('/campaigns/'+config.haseul_campaign_id+'/members?include=user,currently_entitled_tiers&fields'+encodeURI('[member]')+'=full_name,patron_status,pledge_relationship_start,currently_entitled_amount_cents&fields'+encodeURI('[tier]')+'title,&fields'+encodeURI('[user]')+'=social_connections');
    } catch (e) {
        console.error('Patreon error: ' + e.response.status);
        return;
    }

    let ownerPatronT4 = false;
    try {
        const patreonMembers = response.data.data;
        const patreonUsers = response.data.included.filter(x => x.type == 'user' && x.attributes.social_connections.discord);

        for (let i = 0; i < patreonUsers.length && !ownerPatronT4; i++) {
            const user = patreonUsers[i];
            const userDiscord = user.attributes.social_connections.discord;
            const userDiscordID = userDiscord ? userDiscord.user_id : null;
            if (userDiscordID == guild.ownerID) {
                const member = patreonMembers
                    .find(m => m.relationships.user.data.id == user.id);
                const entitledCents = member
                    .attributes.currently_entitled_amount_cents;
                if (entitledCents >= 1000 && member.attributes.patron_status == 'active_patron') {
                    ownerPatronT4 = true;
                    console.log(`Active patron: ${userDiscordID}`);
                }
            }
        }
    } catch (e) {
        console.error(Error('Patreon guild join check error: ' + e));
    }

    const twitterNotifs = await database.getGuildTwitterChannels(guild.id);
    const twitterIDs = new Set(twitterNotifs.map(x => x.twitterID));

    if (ownerPatronT4) {
        if (twitterIDs.size >= 10) {
            message.channel.send({ content: '⚠ No more than 10 Twitter accounts may be set up for notifications on this server.' });
            return;
        }
    } else {
        if (twitterIDs.size >= 3) {
            message.channel.send({ content: '⚠ No more than 3 Twitter accounts may be set up for notifications on a server.' });
            return;
        }
    }

    try {
        response = await twitter.get('/1.1/statuses/user_timeline.json', { params: { user_id: idString, count: 20, trim_user: 1, exclude_replies: 1 } });
    } catch (e) {
        console.error(e);
        message.channel.send({ content: '⚠ Unknown error occurred.' });
        return;
    }
    const recentTweets = response.data;

    const now = Date.now();
    for (const tweet of recentTweets) {
        const createdAt = new Date(tweet.created_at).getTime();

        // don't add tweets in last minute; prevent conflicts with task
        if (createdAt > (now - 1000*60)) continue;

        await database.addTweet(idString, tweet.id_str);
    }

    let added;
    try {
        added = await database
            .addTwitterChannel(
                guild.id,
                channel.id,
                idString,
                screenName,
                role ? role.id : null,
            );
    } catch (e) {
        console.error(Error(e));
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    message.channel.send(added ? `${role ? `\`${role.name}\``:'You'} will now be notified when \`@${screenName}\` posts a new tweet in ${channel}.` :
        `⚠ ${channel} is already set up to be notified when \`@${screenName}\` posts a new tweet.`);
}

async function twitterNotifRemove(message, args) {
    const { guild } = message;

    const formatMatch = args.join(' ').trim().match(/^(?:https:\/\/twitter\.com\/)?@?(.+?)(?:\/media\/?)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        message.channel.send({ content: '⚠ Incorrect formatting. For help with Twitter, see: https://haseulbot.xyz/#twitter' });
        return;
    }

    const screenNameTarget = formatMatch[1];
    const channelID = formatMatch[2];

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send({ content: '⚠ The channel provided does not exist in this server.' });
        return;
    }

    let response;
    try {
        response = await twitter.get('/1.1/users/show.json', { params: { screen_name: screenNameTarget } });
    } catch (e) {
        switch (e.response.status) {
        case 403:
        case 404:
            message.channel.send({ content: `⚠ \`${screenNameTarget}\` is an invalid Twitter handle.` });
            break;
        case 429:
            message.channel.send({ content: '⚠ API rate limit exceeded.' });
            break;
        default:
            message.channel.send({ content: '⚠ Unknown error occurred.' });
            break;
        }
        return;
    }
    const { id_str: idString, screen_name: screenName } = response.data;

    let deleted;
    try {
        deleted = await database.removeTwitterChannel(channel.id, idString);
    } catch (e) {
        console.error(Error(e));
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    message.channel.send(deleted ? `You will no longer be notified when \`@${screenName}\` posts a new tweet in ${channel}.` :
        `⚠ Twitter notifications for \`@${screenName}\` are not set up in ${channel} on this server.`);
}

async function twitterNotifList(message) {
    const { guild } = message;

    const notifs = await database.getGuildTwitterChannels(guild.id);
    if (notifs.length < 1) {
        message.channel.send({ content: '⚠ There are no Twitter notifications added to this server.' });
        return;
    }
    notifString = notifs.sort((a, b) => a.screenName.localeCompare(b.screenName)).map(x => `<#${x.channelID}> - [@${x.screenName}](https://twitter.com/${x.screenName}/)${x.retweets ? ' + <:retweet:618184292820058122>':''}${x.mentionRoleID ? ` <@&${x.mentionRoleID}>`:''}`).join('\n');

    const descriptions = [];
    while (notifString.length > 2048 || notifString.split('\n').length > 25) {
        let currString = notifString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        notifString = notifString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(notifString);

    const pages = descriptions.map((desc, i) => ({
        embeds: [{
            author: {
                name: 'Twitter Notifications', icon_url: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
            },
            description: desc,
            color: 0x1da1f2,
            footer: {
                text: `Page ${i+1} of ${descriptions.length}`,
            },
        }],
    }));

    embedPages(message, pages);
}

async function retweetToggle(message, args) {
    const { guild } = message;

    const formatMatch = args.join(' ').trim().match(/^(?:https:\/\/twitter\.com\/)?@?(.+?)(?:\/media\/?)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        message.channel.send({ content: '⚠ Incorrect formatting. For help with Twitter, see: https://haseulbot.xyz/#twitter' });
        return;
    }

    const screenNameTarget = formatMatch[1];
    const channelID = formatMatch[2];

    const channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send({ content: '⚠ The channel provided does not exist in this server.' });
        return;
    }

    let response;
    try {
        response = await twitter.get('/1.1/users/show.json', { params: { screen_name: screenNameTarget } });
    } catch (e) {
        switch (e.response.status) {
        case 403:
        case 404:
            message.channel.send({ content: `⚠ \`${screenNameTarget}\` is an invalid Twitter handle.` });
            break;
        case 429:
            message.channel.send({ content: '⚠ API rate limit exceeded.' });
            break;
        default:
            message.channel.send({ content: '⚠ Unknown error occurred.' });
            break;
        }
        return;
    }

    const { id_str: idString, screen_name: screenName } = response.data;

    let twitterChannel;
    try {
        twitterChannel = await database.getTwitterChannel(channel.id, idString);
    } catch (e) {
        console.error(Error(e));
        message.channel.send({ content: '⚠ Unknown error occurred.' });
        return;
    }
    if (!twitterChannel) {
        message.channel.send({ content: `⚠ Twitter notifications for \`@${screenName}\` are not set up in ${channel} on this server.` });
        return;
    }

    let toggle;
    try {
        toggle = await database.toggleRetweets(channel.id, idString);
    } catch (e) {
        console.error(Error(e));
        message.channel.send({ content: '⚠ Unknown error occurred.' });
        return;
    }

    message.channel.send(toggle ? `You will now be notified for retweets from \`@${screenName}\` in ${channel}.` :
        `You will no longer be notified for retweets from \`@${screenName}\` in ${channel}.`);
}
