const Discord = require("discord.js");
const { checkPermissions, embedPages, withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const axios = require("axios");

const database = require("../db_queries/vlive_db.js");

const vlive = axios.create({
    baseURL: 'http://api.vfan.vlive.tv/vproxy/channelplus/',
    timeout: 10000
})
const app_id = '8c6cc7b45d2568fb668be6e05b6e5a3b';

exports.onCommand = async function(message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "vlive":
            switch (args[1]) {
                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, vliveNotifAdd, [message, args.slice(3)]);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, vliveNotifRemove, [message, args.slice(3)]);
                            break;
                        case "list":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, vliveNotifList, [message, args.slice(3)]);
                            break;
                    }
                    break;
                case "toggle":
                    switch (args[2]) {
                        case "vpick":
                            if (checkPermissions(member, ["MANAGE_GUILD"]))
                                withTyping(channel, vpickToggle, [message, args.slice(3)]);
                            break;
                    }
                    break;
                case "channelinfo":
                case "channel":
                    withTyping(channel, vliveChannelInfo, [message, args.slice(2)]);
                    break;
                case "help":
                default:
                    message.channel.send(`Help with VLIVE can be found here: https://haseulbot.xyz/#vlive`);
                    break;
            }
            break;
    }

}

function channelSearch(channelList, query) {

    let chanResult = channelList.find(chan => chan.channelCode.toLowerCase() == query);
    if (!chanResult) {
        chanResult = channelList.find(chan => chan.channelName.toLowerCase() == query);
    }
    if (!chanResult) {
        let results = channelList.filter(chan => chan.channelName.toLowerCase().includes(query));
        chanResult = results ? results.sort((a,b) => a.length - b.length)[0] : null;
    }
    if (!chanResult) {
        let results = channelList.filter(chan => chan.channelName.toLowerCase().replace(/[^0-9A-z]/g, '').includes(query));
        chanResult = results ? results.sort((a,b) => a.length - b.length)[0] : null;
    }
    return chanResult;

}

async function getChannel(query) {

    let channelList = await database.getChannelArchive();
    let chanResult = channelSearch(channelList, query);

    if (!chanResult) {
        let response;
        try {
            console.log("fetching channels from API...");
            response = await vlive.get('getSearchChannelList', { params: {app_id} });
        } catch(e) {
            console.error(Error(e));
            return null;
        }

        channelList = response.data.result.items;
        for (let channel of channelList) {
            database.updateArchiveChannel(channel.channelCode, channel.channelName, channel.channelPlusType);
        }
        chanResult = channelSearch(channelList, query);
    }

    return chanResult;

}

async function vliveNotifAdd(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+?)(?:\/home\/?)?\s+<?#?(\d{8,})>?\s*((<@&)?(.*?)(>)?)?$/i);
    if (!formatMatch) {
        message.channel.send(`⚠ Incorrect formatting. For help with VLIVE, see: https://haseulbot.xyz/#vlive`);
        return;
    }

    let vliveQuery = formatMatch[1];
    let discordChannel = formatMatch[2];
    let mentionRole = formatMatch[3];

    let channel = guild.channels.cache.get(discordChannel);
    if (!channel) {
        message.channel.send(`⚠ The Discord channel provided does not exist in this server.`);
        return;
    }
    if (channel.type !== "text" && channel.type !== "news") {
        message.channel.send(`⚠ Please provide a text channel to send notifications to.`);
        return;
    }

    let member;
    try {
        member = await guild.members.fetch(Client.user.id);
    } catch (e) {
        member = null;
    }
    if (!member) {
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    
    let botCanRead = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
    if (!botCanRead) {
        message.channel.send(`⚠ I cannot see this channel!`);
        return;
    }

    let role;
    if (mentionRole) {
        if (formatMatch[4] && formatMatch[6]) {
            role = await guild.roles.fetch(formatMatch[5])
            if (!role) {
                message.channel.send(`⚠ A role with the ID \`${formatMatch[5]}\` does not exist in this server.`);
                return;
            }
        } else {
            role = guild.roles.cache.find(role => role.name == formatMatch[5]);
            if (!role) {
                message.channel.send(`⚠ The role \`${formatMatch[5]}\` does not exist in this server.`);
                return;
            }
        }
    }

    let query = vliveQuery.toLowerCase();
    let chanResult = await getChannel(query);    
    if (!chanResult) {
        message.channel.send(`⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`);
        return;
    }
    if (!chanResult) {
        message.channel.send(`⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`);
        return;
    }

    let { channelName, channelCode } = chanResult;
    try {
        response = await vlive.get('decodeChannelCode', { params: {app_id, channelCode} });
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    let { channelSeq } = response.data.result;

    try {
        response = await vlive.get('getChannelVideoList', { params: {app_id, channelSeq, maxNumOfRows: 10, pageNo: 1} });
    } catch(e) {
        console.error(channelSeq + ' ' + Error(e));
        message.channel.send(`⚠ Error occurred.`);
        return;
    }

    let channelData = response.data["result"];
    if (!channelData) {
        message.channel.send(`⚠ Error occurred.`);
        return;
    }

    let { videoList } = channelData;
    if (videoList && videoList.length > 0) {
        let now = Date.now();
        for (let video of videoList) {
            let { videoSeq, onAirStartAt } = video; 

            let releaseTimestamp = new Date(onAirStartAt + " UTC+9:00").getTime();
            if (releaseTimestamp > (now - 1000*60)) continue; // don't add videos in last minute; prevent conflicts with task

            await database.addVideo(videoSeq, channelSeq);
        }
    }

    let added;
    try {
        added = await database.addVliveChannel(guild.id, channel.id, channelSeq, channelCode, channelName, role ? role.id : null);
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    
    message.channel.send(added ? `${role ? `\`${role.name}\``:'You'} will now be notified when \`${channelName}\` posts a new VLIVE in ${channel}.` :
                   `⚠ ${channel} is already set up to be notified when \`${channelName}\` posts a new VLIVE.`);

}


async function vliveNotifRemove(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+?)(?:\/home\/?)?\s+<?#?(\d{14,})>?/i);
    if (!formatMatch) {
        message.channel.send(`⚠ Incorrect formatting. For help with VLIVE, see: https://haseulbot.xyz/#vlive`);
        return;
    }

    let vliveQuery = formatMatch[1];
    let discordChannel = formatMatch[2];

    let channel = guild.channels.cache.get(discordChannel);
    if (!channel) {
        message.channel.send(`⚠ The Discord channel provided does not exist in this server.`);
        return;
    }

    let query = vliveQuery.toLowerCase();
    let chanResult = await getChannel(query);    
    if (!chanResult) {
        message.channel.send(`⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`);
        return;
    }

    let { channelName, channelCode } = chanResult;
    try {
        response = await vlive.get('decodeChannelCode', { params: {app_id, channelCode} });
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    let { channelSeq } = response.data.result;

    let deleted;
    try {
        deleted = await database.removeVliveChannel(channel.id, channelSeq);
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    
    message.channel.send(deleted ? `You will no longer be notified when \`${channelName}\` posts a new VLIVE in ${channel}.` :
                                   `⚠ VLIVE notifications for \`${channelName}\` are not set up in ${channel} on this server.`);

}


async function vliveNotifList(message) {

    let { guild } = message;

    let notifs = await database.getGuildVliveChannels(guild.id);
    if (notifs.length < 1) {
        message.channel.send(`⚠ There are no VLIVE notifications added to this server.`);
        return;
    }
    notifString = notifs.sort((a,b) => a.channelName.localeCompare(b.channelName)).map(x => `<#${x.discordChanID}> - [${x.channelName.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://channels.vlive.tv/${x.channelCode.replace(/\)/g, "\\)")}/)${x.VPICK ? `/VPICK`:``}${x.mentionRoleID ? ` <@&${x.mentionRoleID}>`:``}`).join('\n');

    let descriptions = [];
    while (notifString.length > 2048 || notifString.split('\n').length > 25) {
        let currString = notifString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString   = currString.slice(0, lastIndex);
        notifString = notifString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(notifString);

    let pages = descriptions.map((desc, i) => {
        return {
            embed: {
                author: {
                    name: "VLIVE Notifications", icon_url: 'https://i.imgur.com/gHo7BTO.png'
                },
                description: desc,
                color: 0x54f7ff,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }
        }
    })

    embedPages(message, pages);

}


async function vpickToggle(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+?)(?:\/home\/?)?\s+<?#?(\d{14,})>?/i);
    if (!formatMatch) {
        message.channel.send(`⚠ Incorrect formatting. For help with VLIVE, see: https://haseulbot.xyz/#vlive`);
        return;
    }

    let vliveQuery = formatMatch[1];
    let discordChannel = formatMatch[2];

    let channel = guild.channels.cache.get(discordChannel);
    if (!channel) {
        message.channel.send(`⚠ The Discord channel provided does not exist in this server.`);
        return;
    }

    let query = vliveQuery.toLowerCase();
    let chanResult = await getChannel(query);    
    if (!chanResult) {
        message.channel.send(`⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`);
        return;
    }

    let { channelName, channelCode } = chanResult;
    try {
        response = await vlive.get('decodeChannelCode', { params: {app_id, channelCode} });
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    let { channelSeq } = response.data.result;

    let vliveChannel;
    try {
        vliveChannel = await database.getVliveChannel(channel.id, channelSeq);
    } catch (e) {
        console.error(Error(e));
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    if (!vliveChannel) {
        message.channel.send(`⚠ VLIVE notifications for \`${channelName}\` are not set up in <#${discordChannel}> on this server.`);
        return;
    }

    let toggle;
    try {
        toggle = await database.toggleVpick(channel.id, channelSeq);
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    
    message.channel.send(toggle ? `You will now be notified for VPICK uploads from \`${channelName}\` in ${channel}.` :
                    `You will no longer be notified for VPICK uploads from \`${channelName}\` in ${channel}.`);

}


async function vliveChannelInfo(message, args) {

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+)(?:\/home\/?)?/i);
    if (!formatMatch) {
        message.channel.send(`⚠ Incorrect formatting. For help with VLIVE, see: https://haseulbot.xyz/#vlive`);
        return;
    }

    let vliveQuery = formatMatch[1];
    let query = vliveQuery.toLowerCase();
    
    let chanResult = await getChannel(query);    
    if (!chanResult) {
        message.channel.send(`⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`);
        return;
    }
    let { channelName, channelCode } = chanResult;

    let response;
    try {
        response = await vlive.get('decodeChannelCode', { params: {app_id, channelCode} });
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    let { channelSeq } = response.data.result;

    try {
        response = await vlive.get('getChannelVideoList', { params: {app_id, channelSeq, maxNumOfRows: 0, pageNo: 0} });
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    let channelData = response.data.result;
    let { channelInfo } = channelData;
    let {
        comment, 
        fanCount, 
        channelProfileImage, 
        channelCoverImage,
        channelPlusType,
        backgroundColor 
    } = channelInfo;

    let channelColour = parseInt(backgroundColor.replace('#', ''), 16);
    let embed = new Discord.MessageEmbed({
        author: { 
            name: channelName, 
            icon_url: 'https://i.imgur.com/gHo7BTO.png', 
            url: `https://channels.vlive.tv/${channelCode}/home` 
        },
        description: comment,
        url: `https://channels.vlive.tv/${channelCode}/home`,
        thumbnail: { url: channelProfileImage },
        image: { url: channelCoverImage + '?type=nf800_256' },
        color: channelColour,
        fields: [
            { name: 'Followers', value: fanCount.toLocaleString(), inline: true },
            { name: 'Channel Type', value: channelPlusType, inline: true }
        ],
        footer: { text: `Channel Seq: ${channelSeq}  |  Channel Code: ${channelCode}` }
    });

    message.channel.send({embed});

}
