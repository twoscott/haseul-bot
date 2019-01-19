//Require modules

const Discord = require("discord.js");
const axios = require("axios");

const config = require("../config.json");
const countries = require("../resources/countries.json");
const functions = require("../functions/functions.js");

//Init

// const yt_key = config.yt_key;
// const youtube = axios.create({
//     baseURL: 'https://www.googleapis.com/youtube/v3',
//     timeout: 10000
// })

//Functions

exports.msg = async function (message, args) {

    //Handle commands

    if (args.length < 1) return;
    switch (args[0]) {

        case ".youtube":
        case ".yt":
            switch (args[1]) {

                // case "vid":
                // case "video":
                //     switch (args[2]) {
                //         case "search":
                //             message.channel.startTyping();
                //             yt_pages(message, args.slice(3).join(' ')).then(response => {
                //                 if (response) message.channel.send(response);
                //                 message.channel.stopTyping();
                //             }).catch(error => {
                //                 console.error(error);
                //                 message.channel.stopTyping();
                //             })
                //             break;

                //         case "info":
                //             message.channel.startTyping();
                //             yt_vid_info(args.slice(3).join(' ')).then(response => {
                //                 if (response) message.channel.send(response);
                //                 message.channel.stopTyping();
                //             }).catch(error => {
                //                 console.error(error);
                //                 message.channel.stopTyping();
                //             })
                //             break;

                //         default:
                //             message.channel.startTyping();
                //             yt_pages(message, args.slice(2).join(' ')).then(response => {
                //                 if (response) message.channel.send(response);
                //                 message.channel.stopTyping();
                //             }).catch(error => {
                //                 console.error(error);
                //                 message.channel.stopTyping();
                //             })
                //             break;
                //     }
                //     break;

                // case "chan":
                // case "channel":
                //     switch (args[2]) {
                //         case "search":
                //             message.channel.startTyping();
                //             yt_chan(message, args.slice(3).join(' ')).then(response => {
                //                 if (response) message.channel.send(response);
                //                 message.channel.stopTyping();
                //             }).catch(error => {
                //                 console.error(error);
                //                 message.channel.stopTyping();
                //             })
                //             break;

                //         case "info":
                //             message.channel.startTyping();
                //             yt_chan_info(args.slice(3).join(' ')).then(response => {
                //                 if (response) message.channel.send(response);
                //                 message.channel.stopTyping();
                //             }).catch(error => {
                //                 console.error(error);
                //                 message.channel.stopTyping();
                //             })
                //             break;

                //         default:
                //             message.channel.startTyping();
                //             yt_chan(args.slice(2).join(' ')).then(response => {
                //                 if (response) message.channel.send(response);
                //                 message.channel.stopTyping();
                //             }).catch(error => {
                //                 console.error(error);
                //                 message.channel.stopTyping();
                //             })
                //             break;
                        
                //     }
                //     break;

                // case "info":
                //     message.channel.startTyping();
                //     yt_vid_info(args.slice(2).join(' ')).then(response => {
                //         if (response) message.channel.send(response);
                //         message.channel.stopTyping();
                //     }).catch(error => {
                //         console.error(error);
                //         message.channel.stopTyping();
                //     })
                //     break;

                default:
                    message.channel.startTyping();
                    yt_pages(message, args.slice(1).join(' ')).then(response => {
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

//Functions

// yt_vid_query = async function (params, limit=1) {

//     if (!params.q) {
//         throw new Error('No query provided.');
//     }
//     if (!params.part) params.part = 'snippet';

//     params = functions.parseParams(params);
//     let response = await youtube.get(`/search?${params}&type=video&safeSearch=moderate&maxResults=${limit}&key=${yt_key}`);
//     let items = response.data.items;
//     items = items.length <= 1 ? items[0] : items;
    
//     return items;

// }

yt_vid_query = async function (query) {

    if (!query) {
        resolve("\\⚠ Please provide a query to search for!");
        return;
    }
    let response = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    let search = response.data.match(/<div class="yt-lockup-content"><h3 class="yt-lockup-title "><a href="\/watch\?v=([^&"]+)/i);
    if (!search) {
        return "\\⚠ No results found for this search!";
    }
    let video_id = search[1];
    return video_id;

}

// yt_chan_query = async function (params, limit=1) {

//     if (!params.q) {
//         throw new Error('No query provided.');
//     }
//     if (!params.part) params.part = 'snippet';

//     params = functions.parseParams(params);
//     let response = await youtube.get(`/search?${params}&type=channel&safeSearch=moderate&maxResults=${limit}&key=${yt_key}`);
//     let items = response.data.items;
//     items = items.length <= 1 ? items[0] : items;
    
//     return items;

// }

// yt_get_video = async function (params, limit=1) {

//     if (!params.id) {
//         throw new Error('No ID provided.');
//     }
//     if (!params.part) params.part = 'snippet';

//     params = functions.parseParams(params);
//     let response = await youtube.get(`/videos?${params}&maxResults=${limit}&key=${yt_key}`);
//     let items = response.data.items;
//     items = items.length <= 1 ? items[0] : items;
    
//     return items;

// }

// yt_get_channel = async function (params, limit=1) {

//     if (!params.id) {
//         throw new Error('No ID provided.');
//     }    
//     if (!params.part) params.part = 'snippet';

//     params = functions.parseParams(params);
//     let response = await youtube.get(`/channels?${params}&maxResults=${limit}&key=${yt_key}`);
//     let items = response.data.items;
//     items = items.length <= 1 ? items[0] : items;
    
//     return items;

// }


//Commands

// yt_pages = async function (message, query) {

//     if (!query) {
//         return "\\⚠ Please provide a query to search for!";
//     }
//     let videos = await yt_vid_query({ q: query }, 20);
//     if (!videos) {
//         return "\\⚠ No results found for this query!";
//     }
//     let pages = videos.map(v => `https://youtu.be/${v.id.videoId}`)

//     functions.pages(message, pages, 600000, true);
    
// }

yt_pages = async function (message, query) {

    if (!query) {
        return "\\⚠ Please provide a query to search for!";
    }
    let { data } = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    let regExp = /<div class="yt-lockup-content"><h3 class="yt-lockup-title "><a href="\/watch\?v=([^&"]+)/ig;
    let pages = [];
    let search = regExp.exec(data);
    while (search !== null) {
        pages.push(`https://youtu.be/${search[1]}`);
        search = regExp.exec(data);
    }
    if (pages.length < 1) {
        return "\\⚠ No results found for this search!";
    }
    functions.pages(message, pages, 600000, true);
    
}

// yt_chan = async function (query) {

//     if (!query) {
//         return "\\⚠ Please provide a query to search for!";
//     }
//     let chan = await yt_chan_query({
//         part: 'snippet',
//         q: query
//     }, 1);
//     let chan = await yt_chan_query(query);
//     if (!chan) {
//         return "\\⚠ No results found for this query!";
//     }

// return `https://www.youtube.com/channel/${/*chan.id.channelId*/chan}`;
    
// }

// yt_vid_info = async function (query) {

//     if (!query) {
//         return "\\⚠ Please provide a query to search for!";
//     }

//     let result = await yt_vid_query({ q: query });
//     if (!result) {
//         return "\\⚠ No results found for this query!"
//     }

//     let video = await yt_get_video({ 
//         id: result.id.videoId,
//         part: [
//             'id', 'snippet', 'statistics', 
//             'contentDetails'
//         ]
//     });
//     if (!video) {
//         return "\\⚠ Error occurred";
//     }

//     let { id, snippet, statistics, contentDetails } = video;
//     let channel = await yt_get_channel({ id: snippet.channelId, part: 'snippet' });    
//     let published = new Date(snippet.publishedAt);
    
//     return new Discord.RichEmbed()
//     .setAuthor(snippet.channelTitle, channel.snippet.thumbnails.default.url, `https://www.youtube.com/channel/${snippet.channelId}`)
//     .setTitle(snippet.title)
//     .setURL(`https://www.youtube.com/watch?v=${id}`)
//     .setThumbnail(snippet.thumbnails.high.url)
//     .addField("Views",    (+statistics.viewCount).toLocaleString('en'), true)
//     .addField("Published",  published.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
//     .addField("Likes",    (+statistics.likeCount).toLocaleString('en'), true)
//     .addField("Dislikes", (+statistics.dislikeCount).toLocaleString('en'), true)
//     .addField("Comments", (+statistics.commentCount).toLocaleString('en'), true)
//     .addField("Duration",   contentDetails.duration.replace(/[PT]/ig, '').toLowerCase(), true)
//     .setColor(0xff0000);

// }

// yt_chan_info = async function (query) {

//     if (!query) {
//         return "\\⚠ Please provide a query to search for!";
//     }

//     let result = await yt_chan_query({ q: query });
//     if (!result) {
//         return "\\⚠ No results found for this query!"
//     }

//     let channel = await yt_get_channel({ 
//         id: result.snippet.channelId,
//         part: [
//             'id', 'snippet', 'statistics', 'brandingSettings'
//         ]
//     });
//     if (!channel) {
//         return "\\⚠ Error occurred";
//     }

//     let { snippet, statistics, brandingSettings } = channel;
//     let { profileColor } = brandingSettings.channel;

//     let embed = new Discord.RichEmbed()
//     .setAuthor(snippet.title, snippet.thumbnails.default.url, `https://www.youtube.com/channel/${channel.id}`)
//     .setTitle("Uploads")
//     .setURL(`https://www.youtube.com/channel/${channel.id}/videos`)
//     .setThumbnail(snippet.thumbnails.high.url)
//     .addField("Subscribers", (+statistics.subscriberCount).toLocaleString('en'), true)
//     .addField("Views",       (+statistics.viewCount).toLocaleString('en'), true)
//     .addField("Videos",      (+statistics.videoCount).toLocaleString('en'), true)
//     .addField("Created",       new Date(snippet.publishedAt).toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
//     .setColor(profileColor != '#000000' ? profileColor : 0xff0000);

//     if (snippet.country) {
//         embed.addField("Region", `:flag_${snippet.country.toLowerCase()}: ${countries[snippet.country]}`)
//     }

//     return embed;

// }

exports.yt_vid_query = yt_vid_query;
