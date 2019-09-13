// Require modules

const Client = require("../haseul.js").Client;

const functions = require("../functions/functions.js");
const database = require("../db_queries/instagram_db.js");

const { 
    instagram, 
    graphql, 
    timeline_hash, 
    stories_hash, 
    login
} = require("../utils/instagram.js");

// Functions

exports.msg = async function(message, args) {

    let perms;

    // Handle commands

    switch (args[0]) {

        case ".instagram":
        case ".insta":
            switch (args[1]) {

                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    perms = ["ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_CHANNELS"];
                    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
                    if (!perms.some(p => message.member.hasPermission(p))) break;
                    switch (args[2]) {

                        case "add":
                            message.channel.startTyping();
                            insta_notif_add(message, args.slice(3)).then(() => {
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "remove":
                        case "delete":
                            message.channel.startTyping();
                            insta_notif_del(message, args.slice(3)).then(() => {
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "list":
                            message.channel.startTyping();
                            insta_notif_list(message).then(() => {
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;

                    case "toggle":
                        switch (args[2]) {
        
                            case "stories":
                            case "story":
                                perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
                                if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
                                if (!perms.some(p => message.member.hasPermission(p))) break;
                                message.channel.startTyping();
                                stories_toggle(message, args.slice(3)).then(() => {
                                    message.channel.stopTyping();
                                }).catch(error => {
                                    console.error(error);
                                    message.channel.stopTyping();
                                })
                                break;
        
        
                        }
                        break;
                
                case "help":
                default:
                    message.channel.send("Help with Instagram can be found here: https://haseulbot.xyz/#instagram");
                    break;

            }
            break;
        
    }

}

// add insta notification
async function insta_notif_add(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        message.channel.send("⚠ Incorrect formatting. For help with Instagram, see: https://haseulbot.xyz/#instagram");
        return;
    }

    let instaUser = formatMatch[1];
    let channelID = formatMatch[2];
    let mentionRole = formatMatch[3];

    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ The channel provided does not exist in this server.");
        return;
    }
    if (channel.type != "text") {
        message.channel.send("⚠ Please provide a text channel to send notifications to.");
        return;
    }
    
    let member;
    try {
        member = await guild.fetchMember(Client.user.id);
    } catch (e) {
        member = null;
    }
    if (!member) {
        message.channel.send("⚠ Error occurred.");
        return;
    }

    let botCanRead = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
    if (!botCanRead) {
        message.channel.send("⚠ I cannot see this channel!");
        return;
    }

    let role;
    if (mentionRole) {
        if (formatMatch[4] && formatMatch[6]) {
            role = guild.roles.get(formatMatch[5])
            if (!role) {
                message.channel.send(`⚠ A role with the ID \`${formatMatch[5]}\` does not exist in this server.`);
                return;
            }
        } else {
            role = guild.roles.find(role => role.name == formatMatch[5]);
            if (!role) {
                message.channel.send(`⚠ The role \`${formatMatch[5]}\` does not exist in this server.`);
                return;
            }
        }
    }

    let response;
    try {
        response = await instagram.get(`/${instaUser}/`, { params: {'__a': 1} })
    } catch(e) {
        console.log(e.response.status);
        switch (e.response.status) {
            case 404:
            case 403:
                message.channel.send(`⚠ \`${instaUser}\` is an invalid Instagram account.`);
                break;
            case 429:
                message.channel.send(`⚠ API rate limit exceeded.`);
                break;
            default:
                message.channel.send(`⚠ Unknown error occurred.`);
                break;
        }
        return;
    }

    let { user } = response.data.graphql;
    let { username, id } = user;

    let instaNotifs = await database.get_guild_insta_channels(guild.id)
    let instaIDs = new Set(instaNotifs.map(x => x.instaID));
    if (instaIDs.size >= 5) {
        message.channel.send("⚠ No more than 5 Instagram accounts may be set up for notifications on a server.");
        return;
    }

    // store current posts
    try {
        response = await graphql.get('/query/', { params: {query_hash: timeline_hash, variables: {id, first: 20}} })
    } catch(e) {
        console.error(e);
        message.channel.send("⚠ Unknown error occurred.");
        return;
    }
    let posts = response.data.data.user['edge_owner_to_timeline_media'].edges;

    let now;
    now = Date.now();
    for (let post of posts) {
        post = post.node;
        let createdAt = new Date(post.taken_at_timestamp).getTime();
        if (createdAt > (now - 1000*60)) continue; // don't add posts in last minute; prevent conflicts with task

        await database.add_post(id, post.id);
    }

    // store current stories
    let LOGGED_IN = false;
    for (let i = 0; i < 3 && !LOGGED_IN; i++) {
        let { csrf_token, cookie } = require("../utils/instagram.js").credentials;
        try {
            response = await graphql.get('/query/', { 
                params: {
                    query_hash: stories_hash, 
                    variables: {
                        reel_ids: [id], precomposed_overlay: false, show_story_viewer_list: false, stories_video_dash_manifest: false 
                    }
                },
                headers: { 'X-CSRFToken': csrf_token, 'Cookie': cookie }
            });
            LOGGED_IN = true;
        } catch(e) {
            switch (e.response.status) {
                case 403:
                    await login();
                    break;
            }
            console.error(e);
        } 
    }
    if (!LOGGED_IN) {
        message.channel.send("⚠ Failed to log in to Instagram.");
        return;
    }

    let storyReel = response.data.data['reels_media'];
    if (storyReel.length > 0) {
        let stories = storyReel[0].items;
        now = Date.now();
        for (let story of stories) {
            let createdAt = new Date(story.taken_at_timestamp).getTime();
            if (createdAt > (now - 1000*60)) continue; // don't add story in last minute; prevent conflicts with task

            await database.add_story(id, story.id, story.expiring_at_timestamp);
        }
    }

    let added;
    try {
        added = await database.add_insta_channel(guild.id, channel.id, id, username, role ? role.id : null);
    } catch(e) {
        console.error(Error(e));
        message.channel.send("⚠ Error occurred.");
        return;
    }
    
    message.channel.send(added ? `${role ? `\`${role.name}\``:'You'} will now be notified when \`${username}\` posts a new Instagram update in ${channel}.` :
                                 `⚠ ${channel} is already set up to be notified when \`${username}\` posts a new Instagram update.`);

}

// remove instagram notification
async function insta_notif_del(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        message.channel.send("⚠ Incorrect formatting. For help with Twitter, see: https://haseulbot.xyz/#twitter");
        return;
    }

    let instaUser = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ The channel provided does not exist in this server.");
        return;
    }

    let response;
    try {
        response = await instagram.get(`/${instaUser}/`, { params: {'__a': 1} })
    } catch(e) {
        switch (e.response.status) {
            case 404:
            case 403:
                message.channel.send(`⚠ \`${instaUser}\` is an invalid Instagram account.`);
                break;
            case 429:
                message.channel.send(`⚠ API rate limit exceeded.`);
                break;
            default:
                message.channel.send(`⚠ Unknown error occurred.`);
                break;
        }
        return;
    }

    let { user } = response.data.graphql;
    let { username, id } = user;

    let deleted;
    try {
        deleted = await database.del_insta_channel(channel.id, id);
    } catch(e) {
        console.error(Error(e));
        message.channel.send("⚠ Error occurred.");
        return;
    }
    
    message.channel.send(deleted ? `You will no longer be notified when \`${username}\` posts a new Instagram update in ${channel}.` :
                                   `⚠ Instagram notifications for \`${username}\` are not set up in ${channel} on this server.`);

}

// list insta notifications
async function insta_notif_list(message) {

    let { guild } = message;

    let notifs = await database.get_guild_insta_channels(guild.id);
    if (notifs.length < 1) {
        message.channel.send("⚠ There are no Instagram notifications added to this server.");
        return;
    }
    notifString = notifs.sort((a,b) => a.username.localeCompare(b.username)).map(x => `<#${x.channelID}> - [@${x.username.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.instagram.com/${x.username}/)${x.stories ? ` + :book:`:``}${x.mentionRoleID ? ` <@&${x.mentionRoleID}>`:``}`).join('\n');

    let descriptions = [];
    while (notifString.length > 2048 || notifString.split('\n').length > 25) {
        let currString = notifString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        notifString = notifString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(notifString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: "Instagram Notifications", icon_url: 'https://i.imgur.com/NNzsisb.png'
                },
                description: desc,
                color: 0xffffff,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    functions.pages(message, pages);

}

// toggle stories for insta/channel
async function stories_toggle(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        message.channel.send("⚠ Incorrect formatting. For help with Twitter, see: https://haseulbot.xyz/#twitter");
        return;
    }

    let instaUser = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ The channel provided does not exist in this server.");
        return;
    }

    let response;
    try {
        response = await instagram.get(`/${instaUser}/`, { params: {'__a': 1} })
    } catch(e) {
        switch (e.response.status) {
            case 404:
            case 403:
                message.channel.send(`⚠ \`${instaUser}\` is an invalid Instagram account.`);
                break;
            case 429:
                message.channel.send(`⚠ API rate limit exceeded.`);
                break;
            default:
                message.channel.send(`⚠ Unknown error occurred.`);
                break;
        }
        return;
    }

    let { user } = response.data.graphql;
    let { username, id } = user;

    let toggle;
    try {
        toggle = await database.toggle_stories(channel.id, id)
    } catch(e) {
        console.error(Error(e));
        message.channel.send("⚠ Unknown error occurred.");
        return;
    }

    if (toggle === null) {
        message.channel.send(`⚠ Instagram notifications for \`@${screen_name}\` are not set up in ${channel} on this server.`);
        return;
    }
    
    message.channel.send(toggle ? `You will now be notified for Instagram stories from \`@${username}\` in ${channel}.` :
                                  `You will no longer be notified for Instagram stories from \`@${username}\` in ${channel}.`);

}
