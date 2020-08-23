const { checkPermissions, embedPages, resolveMember, withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const config = require("../config.json");
const database = require("../db_queries/instagram_db.js");

const {
    patreon,
    tier1ID,
    tier2ID
} = require("../utils/patreon.js");
const { 
    instagram, 
    graphql, 
    timeline_hash
} = require("../utils/instagram.js");

exports.onCommand = async function(message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "instagram":
        case "insta":
            switch (args[1]) {
                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                // withTyping(channel, instaNotifAdd, [message, args.slice(3)]);
                                message.channel.send(`⚠ Adding and removing Instagram notifications is currently disabled as there are issues with Instagram. This may or may not be resolved. Already-configured Instagram notifications should continue to function as normal.`);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                // withTyping(channel, instaNotifRemove, [message, args.slice(3)]);
                                message.channel.send(`⚠ Adding and removing Instagram notifications is currently disabled as there are issues with Instagram. This may or may not be resolved. Already-configured Instagram notifications should continue to function as normal.`);
                            break;
                        case "list":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, instaNotifList, [message]);
                            break;
                    }
                    break;
                // case "toggle":
                //     switch (args[2]) {
                //         case "stories":
                //         case "story":
                //             if (checkPermissions(member, ["MANAGE_GUILD"]))
                //                 withTyping(channel, storiesToggle, [message, args.slice(3)]);
                //             break;
                //     }
                //     break;
                case "help":
                default:
                    message.channel.send(`Help with Instagram can be found here: https://haseulbot.xyz/#instagram`);
                    break;
            }
            break;
    }
}

// add insta notification
async function instaNotifAdd(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        message.channel.send(`⚠ Incorrect formatting. For help with Instagram, see: https://haseulbot.xyz/#instagram`);
        return;
    }

    let instaUser = formatMatch[1];
    let channelID = formatMatch[2];
    let mentionRole = formatMatch[3];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send(`⚠ The channel provided does not exist in this server.`);
        return;
    }
    if (channel.type != "text") {
        message.channel.send(`⚠ Please provide a text channel to send notifications to.`);
        return;
    }
    
    let member = await resolveMember(guild, Client.user.id);
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

    let instaNotifs = await database.getGuildInstaChannels(guild.id)
    let instaIDs = new Set(instaNotifs.map(x => x.instaID));

    let response;
    try {
        response = await patreon.get('/campaigns/'+config.haseul_campaign_id+'/members?include=user,currently_entitled_tiers&fields'+encodeURI('[member]')+'=full_name,patron_status,pledge_relationship_start,currently_entitled_amount_cents&fields'+encodeURI('[tier]')+'title,&fields'+encodeURI('[user]')+'=social_connections');
    } catch(e) {
        console.error("Patreon error: " + e.response.status);
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    
    let ownerPatronT2 = false;
    try {
        let patreonMembers = response.data.data;
        let patreonUsers = response.data.included.filter(x => {
            return x.type == 'user' && x.attributes.social_connections.discord
        });

        for (let i = 0; i < patreonUsers.length && !ownerPatronT2; i++) {
            let user = patreonUsers[i];
            let userDiscord = user.attributes.social_connections.discord;
            let userDiscordID = userDiscord ? userDiscord.user_id : null;
            if (userDiscordID == guild.ownerID) {
                let member = patreonMembers.find(m => m.relationships.user.data.id == user.id);
                let tier2Member = member.relationships.currently_entitled_tiers.data.find(t => t.id = tier2ID);
                if (tier2Member && member.attributes.patron_status == "active_patron") {
                    ownerPatronT2 = true;
                    console.log(`Active patron: ${userDiscordID}`);
                }
            }
        }
    } catch (e) {
        console.error("Patreon error adding Instagram");
    }

    if (guild.id != '276766140938584085') {
        if (!ownerPatronT2) {
            if (guild.memberCount < 100) {
                message.channel.send(`⚠ Due to Instagram's limitations, you must have more than 100 members in the server to use Instagram notifications!`);
                return;
            } else if (guild.memberCount < 500 && instaIDs.size >= 1) {
                message.channel.send(`⚠ Due to Instagram's limitations, you must have more than 500 members in the server to have 2 Instagram notifications on the server!`);
                return;
            } else if (guild.memberCount < 1000 && instaIDs.size >= 2) {
                message.channel.send(`⚠ Due to Instagram's limitations, you must have more than 1000 members in the server to have 3 Instagram notifications on the server!`);
                return;
            }
        } 
        if (instaIDs.size >= 3) {
            message.channel.send(`⚠ No more than 3 Instagram accounts may be set up for notifications on a server.`);
            return;
        }
    }

    // try {
    //     response = await instagram.get(`/web/search/topsearch/`, { params: { query: instaUser, context: "user" } });
    // } catch(e) {
    //     console.error(e.response.status);
    //     switch (e.response.status) {
    //         case 429:
    //             message.channel.send(`⚠ API rate limit exceeded.`);
    //             break;
    //         default:
    //             message.channel.send(`⚠ Unknown error occurred.`);
    //             break;
    //     }
    //     return;
    // }

    // let usersFound = response.data.users;
    // let user = usersFound.find(user => user.user.username == instaUser);
    // if (!user) {
    //     message.channel.send(`⚠ \`${instaUser}\` is an invalid Instagram account.`);
    //     return;
    // }

    // let { username } = user.user;
    // let id = user.user.pk;

    try {
        response = await instagram.get(`/${instaUser}/`, { params: {'__a': 1} });
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

    // store current posts
    try {
        response = await graphql.get('/query/', { params: {query_hash: timeline_hash, variables: {id, first: 20}} })
    } catch(e) {
        console.error(e);
        message.channel.send(`⚠ Unknown error occurred.`);
        return;
    }
    let posts = response.data.data.user['edge_owner_to_timeline_media'].edges;

    let now = Date.now();
    for (let post of posts) {
        post = post.node;
        let createdAt = new Date(post.taken_at_timestamp).getTime();
        if (createdAt > (now - 1000*60)) continue; // don't add posts in last minute; prevent conflicts with task

        await database.addPost(id, post.id);
    }

    // store current stories
    // let LOGGED_IN = false;
    // for (let i = 0; i < 3 && !LOGGED_IN; i++) {
    //     let { csrf_token, cookie } = require("../utils/instagram.js").credentials;
    //     try {
    //         response = await graphql.get('/query/', { 
    //             params: {
    //                 query_hash: stories_hash, 
    //                 variables: {
    //                     reel_ids: [id], precomposed_overlay: false, show_story_viewer_list: false, stories_video_dash_manifest: false 
    //                 }
    //             },
    //             headers: { 'X-CSRFToken': csrf_token, 'Cookie': cookie }
    //         });
    //         LOGGED_IN = true;
    //     } catch(e) {
    //         switch (e.response.status) {
    //             case 403:
    //                 await login();
    //                 break;
    //         }
    //         console.error(e);
    //     } 
    // }
    // if (!LOGGED_IN) {
    //     message.channel.send(`⚠ Failed to log in to Instagram.`);
    //     return;
    // }

    // let storyReel = response.data.data['reels_media'];
    // if (storyReel.length > 0) {
    //     let stories = storyReel[0].items;
    //     now = Date.now();
    //     for (let story of stories) {
    //         let createdAt = new Date(story.taken_at_timestamp).getTime();
    //         if (createdAt > (now - 1000*60)) continue; // don't add story in last minute; prevent conflicts with task

    //         await database.addStory(id, story.id, story.expiring_at_timestamp);
    //     }
    // }

    let added;
    try {
        added = await database.addInstaChannel(guild.id, channel.id, id, username, role ? role.id : null);
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    
    message.channel.send(added ? `${role ? `\`${role.name}\``:'You'} will now be notified when \`${username}\` posts a new Instagram update in ${channel}.` :
                                 `⚠ ${channel} is already set up to be notified when \`${username}\` posts a new Instagram update.`);

}

// remove instagram notification
async function instaNotifRemove(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        message.channel.send(`⚠ Incorrect formatting. For help with Instagram, see: https://haseulbot.xyz/#instagram`);
        return;
    }

    let instaUser = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        message.channel.send(`⚠ The channel provided does not exist in this server.`);
        return;
    }

    // let response;
    // try {
    //     response = await instagram.get(`/web/search/topsearch/`, { params: { query: instaUser, context: "user" } });
    // } catch(e) {
    //     console.error(e.response.status);
    //     switch (e.response.status) {
    //         case 429:
    //             message.channel.send(`⚠ API rate limit exceeded.`);
    //             break;
    //         default:
    //             message.channel.send(`⚠ Unknown error occurred.`);
    //             break;
    //     }
    //     return;
    // }

    // let usersFound = response.data.users;
    // let user = usersFound.find(user => user.user.username == instaUser);
    // if (!user) {
    //     message.channel.send(`⚠ \`${instaUser}\` is an invalid Instagram account.`);
    //     return;
    // }

    // let { username } = user.user;
    // let id = user.user.pk;

    try {
        response = await instagram.get(`/${instaUser}/`, { params: {'__a': 1} });
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

    let deleted;
    try {
        deleted = await database.removeInstaChannel(channel.id, id);
    } catch(e) {
        console.error(Error(e));
        message.channel.send(`⚠ Error occurred.`);
        return;
    }
    
    message.channel.send(deleted ? `You will no longer be notified when \`${username}\` posts a new Instagram update in ${channel}.` :
                                   `⚠ Instagram notifications for \`${username}\` are not set up in ${channel} on this server.`);

}

// list insta notifications
async function instaNotifList(message) {

    let { guild } = message;

    let notifs = await database.getGuildInstaChannels(guild.id);
    if (notifs.length < 1) {
        message.channel.send(`⚠ There are no Instagram notifications added to this server.`);
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
            embed: {
                author: {
                    name: "Instagram Notifications", icon_url: 'https://i.imgur.com/NNzsisb.png'
                },
                description: desc,
                color: 0xfefefe,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }
        }
    })

    embedPages(message, pages);

}

// toggle stories for insta/channel
// async function storiesToggle(message, args) {

//     let { guild } = message;

//     let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?/i);
//     if (!formatMatch) {
//         message.channel.send(`⚠ Incorrect formatting. For help with Twitter, see: https://haseulbot.xyz/#twitter`);
//         return;
//     }

//     let instaUser = formatMatch[1];
//     let channelID = formatMatch[2];

//     let channel = guild.channels.cache.get(channelID);
//     if (!channel) {
//         message.channel.send(`⚠ The channel provided does not exist in this server.`);
//         return;
//     }

//     let response;
//     try {
//         response = await instagram.get(`/${instaUser}/`, { params: {'__a': 1} })
//     } catch(e) {
//         switch (e.response.status) {
//             case 404:
//             case 403:
//                 message.channel.send(`⚠ \`${instaUser}\` is an invalid Instagram account.`);
//                 break;
//             case 429:
//                 message.channel.send(`⚠ API rate limit exceeded.`);
//                 break;
//             default:
//                 message.channel.send(`⚠ Unknown error occurred.`);
//                 break;
//         }
//         return;
//     }

//     let { user } = response.data.graphql;
//     let { username, id } = user;

//     let instaChannel;
//     try {
//         instaChannel = await database.getInstaChannel(channel.id, id);
//     } catch (e) {
//         console.error(Error(e));
//         message.channel.send(`⚠ Unknown error occurred.`);
//         return;
//     }

//     if (!instaChannel) {
//         message.channel.send(`⚠ Instagram notifications for \`@${screen_name}\` are not set up in ${channel} on this server.`);
//         return;
//     }

//     let toggle;
//     try {
//         toggle = await database.toggleStories(channel.id, id)
//     } catch(e) {
//         console.error(Error(e));
//         message.channel.send(`⚠ Unknown error occurred.`);
//         return;
//     }
    
//     message.channel.send(toggle ? `You will now be notified for Instagram stories from \`@${username}\` in ${channel}.` :
//                                   `You will no longer be notified for Instagram stories from \`@${username}\` in ${channel}.`);

// }
