// Require modules

const axios = require("axios");

const functions = require("../functions/functions.js");

const database = require("../db_queries/vlive_db.js");

// Consts

const vlive = axios.create({
    baseURL: 'http://api.vfan.vlive.tv/vproxy/channelplus/',
    timeout: 10000
})
const app_id = '8c6cc7b45d2568fb668be6e05b6e5a3b';

// Functions

function channel_search(channelList, query) {

    let chanResult = channelList.find(chan => chan.channelCode == query);
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

async function get_channel(query) {

    let channelList = await database.get_channel_archive();
    let chanResult = channel_search(channelList, query);

    if (!chanResult) {
        let response;
        try {
            console.log("fetching channels from API...");
            response = await vlive.get('getSearchChannelList', { params: { app_id } });
        } catch(e) {
            console.error(Error(e));
            return "⚠ Unknown error occurred.";
        }

        channelList = response.data.result.items;
        for (let channel of channelList) {
            database.add_update_archive_channel(channel.channelCode, channel.channelName, channel.channelPlusType);
        }
        chanResult = channel_search(channelList, query);
    }

    return chanResult;

}

exports.msg = async function(message, args) {

    let perms;

    // Handle commands

    switch (args[0]) {

        case ".vlive":
            switch (args[1]) {

                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
                    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
                    if (!perms.some(p => message.member.hasPermission(p))) break;
                    switch (args[2]) {

                        case "add":
                            message.channel.startTyping();
                            vlive_notif_add(message, args.slice(3)).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "remove":
                        case "delete":
                            message.channel.startTyping();
                            vlive_notif_del(message, args.slice(3)).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "list":
                            message.channel.startTyping();
                            vlive_notif_list(message).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;

                case "channelinfo":
                case "channel":
                    message.channel.startTyping();
                    vlive_channel_info(message, args.slice(2)).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

            }
            break;

            case ".vpick":
                switch (args[1]) {

                    case "toggle":
                        perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
                        if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
                        if (!perms.some(p => message.member.hasPermission(p))) break;
                        message.channel.startTyping();
                        vpick_toggle(message, args.slice(2)).then(response => {
                            if (response) message.channel.send(response);
                            message.channel.stopTyping();
                        }).catch(error => {
                            console.error(error);
                            message.channel.stopTyping();
                        })
                        break;


                }
                break;
        
    }

}

// add vlive notification
async function vlive_notif_add(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+?)(?:\/home\/?)?\s+<?#?(\d{8,})>?\s*(.+)?/i);
    if (!formatMatch) {
        return "⚠ Incorrect formatting.\nUsage: `.vlive notif add {vlive channel name} {discord channel} [mention role name](optional)`.";
    }

    let vliveQuery = formatMatch[1];
    let discordChannel = formatMatch[2];
    let mentionRole = formatMatch[3];

    let channel = guild.channels.get(discordChannel);
    if (!channel) {
        return "⚠ The Discord channel provided does not exist in this server.";
    }
    if (channel.type != "text") {
        return "⚠ Please provide a text channel to send notifications to.";
    }

    let role;
    if (mentionRole) {
        role = guild.roles.find(role => role.name == mentionRole);
        if (!role) {
            return `⚠ The role \`${mentionRole}\` does not exist in this server.`;
        }
    }

    let query = vliveQuery.toLowerCase();
    let chanResult = await get_channel(query);    
    if (!chanResult) {
        return `⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`;
    }
    if (!chanResult) {
        return `⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`;
    }

    let { channelName, channelCode } = chanResult;
    try {
        response = await vlive.get('decodeChannelCode', { params: { app_id, channelCode } });
    } catch(e) {
        console.error(Error(e));
        return "⚠ Error occurred.";
    }
    let { channelSeq } = response.data.result;

    try {
        response = await vlive.get('getChannelVideoList', { params: { app_id, channelSeq, maxNumOfRows: 10, pageNo: 1 } });
    } catch(e) {
        console.error(channelSeq + ' ' + Error(e));
        return "⚠ Error occurred.";
    }

    let channelData = response.data["result"];
    if (!channelData) {
        return "⚠ Error occurred.";
    }

    let { videoList } = channelData;
    let now = Date.now();
    for (let video of videoList) {
        let { videoSeq, onAirStartAt } = video; 

        let releaseTimestamp = new Date(onAirStartAt + " UTC+9:00").getTime();
        if (releaseTimestamp > (now - 1000*60)) continue; // don't add videos in last minute; prevent conflicts with task

        await database.add_video(videoSeq, channelSeq);
    }

    let added;
    try {
        added = await database.add_vlive_channel(guild.id, channel.id, channelSeq, channelCode, channelName, role ? role.id : null);
    } catch(e) {
        console.error(Error(e));
        return "⚠ Error occurred.";
    }
    
    return added ? `${role ? `\`${role.name}\``:'You'} will now be notified when \`${channelName}\` posts a new VLIVE in ${channel}.` :
                   `⚠ ${channel} is already set up to be notified when \`${channelName}\` posts a new VLIVE.`;

}

// remove vlive notification
async function vlive_notif_del(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+?)(?:\/home\/?)?\s+<?#?(\d{14,})>?/i);
    if (!formatMatch) {
        return "⚠ Incorrect formatting.\nUsage: `.vlive notif remove {vlive channel name} {discord channel}`.";
    }

    let vliveQuery = formatMatch[1];
    let discordChannel = formatMatch[2];

    let channel = guild.channels.get(discordChannel);
    if (!channel) {
        return "⚠ The Discord channel provided does not exist in this server.";
    }

    let query = vliveQuery.toLowerCase();
    let chanResult = await get_channel(query);    
    if (!chanResult) {
        return `⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`;
    }

    let { channelName, channelCode } = chanResult;
    try {
        response = await vlive.get('decodeChannelCode', { params: { app_id, channelCode } });
    } catch(e) {
        console.error(Error(e));
        return "⚠ Unknown error occurred."
    }
    let { channelSeq } = response.data.result;

    let deleted;
    try {
        deleted = await database.del_vlive_channel(guild.id, channel.id, channelSeq);
    } catch(e) {
        console.error(Error(e));
        return "⚠ Unknown error occurred.";
    }
    
    return deleted ? `You will no longer be notified when \`${channelName}\` posts a new VLIVE in <#${discordChannel}>.` :
                     `⚠ VLIVE notifications for \`${channelName}\` are not set up in <#${discordChannel}> on this server.`;

}

// list vlive notifications
async function vlive_notif_list(message) {

    let { guild } = message;

    let notifs = await database.get_guild_vlive_channels(guild.id);
    if (notifs.length < 1) {
        return "⚠ There are no VLIVE notifications added to this server.";
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
            content: undefined,
            options: {embed: {
                author: {
                    name: "VLIVE Notifications", icon_url: 'https://i.imgur.com/gHo7BTO.png'
                },
                description: desc,
                color: 0x54f7ff,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    functions.pages(message, pages);

}

// toggle vpick for vlchannel/dcchannel
async function vpick_toggle(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+?)(?:\/home\/?)?\s+<?#?(\d{14,})>?/i);
    if (!formatMatch) {
        return "⚠ Incorrect formatting.\nUsage: `.vpick toggle {vlive channel name} {discord channel}`.";
    }

    let vliveQuery = formatMatch[1];
    let discordChannel = formatMatch[2];

    let channel = guild.channels.get(discordChannel);
    if (!channel) {
        return "⚠ The Discord channel provided does not exist in this server.";
    }

    let query = vliveQuery.toLowerCase();
    let chanResult = await get_channel(query);    
    if (!chanResult) {
        return `⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`;
    }

    let { channelName, channelCode } = chanResult;
    try {
        response = await vlive.get('decodeChannelCode', { params: { app_id, channelCode } });
    } catch(e) {
        console.error(Error(e));
        return "⚠ Unknown error occurred."
    }
    let { channelSeq } = response.data.result;

    let toggle;
    try {
        toggle = await database.toggle_vpick(guild.id, channel.id, channelSeq);
    } catch(e) {
        console.error(Error(e));
        return "⚠ Unknown error occurred.";
    }

    if (toggle === null) {
        return `⚠ VLIVE notifications for \`${channelName}\` are not set up in <#${discordChannel}> on this server.`
    }
    
    return toggle ? `You will now be notified for VPICK uploads from \`${channelName}\` in <#${discordChannel}>.` :
                    `You will no longer be notified for VPICK uploads from \`${channelName}\` in <#${discordChannel}>.`;

}

// show vlive channel info
async function vlive_channel_info(message, args) {

    let formatMatch = args.join(' ').trim().match(/^(?:https?\:\/\/channels\.vlive\.tv\/)?(.+)(?:\/home\/?)?/i);
    if (!formatMatch) {
        return "⚠ Incorrect formatting.\nUsage: `.vpick toggle {vlive channel name} {discord channel}`.";
    }

    let vliveQuery = formatMatch[1];
    let query = vliveQuery.toLowerCase();
    
    let chanResult = await get_channel(query);    
    if (!chanResult) {
        return `⚠ No VLIVE channel could be found matching the name \`${vliveQuery}\`.`;
    }
    let { channelName, channelCode } = chanResult;

    let response;
    try {
        response = await vlive.get('decodeChannelCode', { params: { app_id, channelCode } });
    } catch(e) {
        console.error(Error(e));
        return "⚠ Unknown error occurred."
    }
    let { channelSeq } = response.data.result;

    try {
        response = await vlive.get('getChannelVideoList', { params: { app_id, channelSeq, maxNumOfRows: 0, pageNo: 0 } });
    } catch(e) {
        console.error(Error(e));
        return "⚠ Unknown error occurred.";
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
    let embed = {
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
    }

    message.channel.send({embed});

}
