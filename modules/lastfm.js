// Require modules

const Discord = require("discord.js");

const axios = require("axios");
const fs = require("fs");
const { JSDOM } = require("jsdom");

const config = require("../config.json");
const functions = require("../functions/functions.js");
const html = require("../functions/html.js");
const media = require("./media.js");

const database = require("../db_queries/lastfm_db.js");

const { Image } = require("../functions/images.js");

// Init

const api_key = config.lastfm_key;

// Functions

async function scrapeArtistImage(artist) {

    let response;
    try {
        response = await axios.get(`https://www.last.fm/music/${encodeURIComponent(artist)}/+images`);
    } catch (e) {
        let { message } = e.response.data;
        return `⚠ ${message || "Unknown Error Occurred."}`;
    }
    
    let doc = new JSDOM(response.data).window.document;
    let images = doc.getElementsByClassName('image-list-item-wrapper');
    if (images.length < 1) {
        return "https://lastfm-img2.akamaized.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png";
    }

    return images[0].getElementsByTagName('img')[0].src.replace('/avatar170s/', '/300x300/') + '.png';
    
}

exports.msg = async function(message, args) {

    // Handle commands

    switch (args[0]) {

        case ".lastfm":
        case ".fm":
        case ".lf":
            switch (args[1]) {

                case "set":
                    message.channel.startTyping();
                    set_lf_user(message, args[2]).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "remove":
                case "delete":
                case "del":
                    message.channel.startTyping();
                    remove_lf_user(message).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "recent":
                case "recents":
                    message.channel.startTyping();
                    lf_recents(message, args.slice(2)).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "topartists":
                case "tar":
                case "tat":
                case "ta":
                    switch(args[2]) {
                        
                        case "chart":
                        case "collage":
                            message.channel.startTyping();
                            lf_chart(message, args.slice(3), 'artist').then(response => {
                                if (response && response instanceof Array) message.channel.send(...response);
                                else if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        default:
                            message.channel.startTyping();
                            lf_top_media(message, args.slice(2), 'artist').then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;

                case "nowplaying":
                case "np":
                    message.channel.startTyping();
                    lf_recents(message, args.slice(2), 1).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "topalbums":
                case "talb":
                case "tal":
                case "tab":
                    switch (args[2]) {
                        case "chart":
                        case "collage":
                            message.channel.startTyping();
                            lf_chart(message, args.slice(3), 'album').then(response => {
                                if (response && response instanceof Array) message.channel.send(...response);
                                else if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        default:
                            message.channel.startTyping();
                            lf_top_media(message, args.slice(2), 'album').then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;
                    }
                    break;

                case "toptracks":
                case "tts":
                case "tt":
                    message.channel.startTyping();
                    lf_top_media(message, args.slice(2), 'track').then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;
                
                case "profile":
                    message.channel.startTyping();
                    lf_profile(message, args[2]).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "avatar":
                case "dp":
                    message.channel.startTyping();
                    lf_avatar(message, args[2]).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "yt":
                    message.channel.startTyping();
                    lf_youtube(message, args[2]).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "help":
                    message.channel.send("Help with Last.fm can be found here: https://haseulbot.xyz/#last.fm");
                    break;

                default:
                    message.channel.startTyping();
                    lf_recents(message, args.slice(1), 2).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;
            }
            break;
        
        case ".fmyt":
        case ".lfyt":
            message.channel.startTyping();
            lf_youtube(message, args[1]).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break; 
        
        case ".chart":
            switch (args[1]) {

                case "artists":
                case "artist":
                    message.channel.startTyping();
                    lf_chart(message, args.slice(2), "artist").then(response => {
                        if (response && response instanceof Array) message.channel.send(...response);
                        else if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                default:
                    message.channel.startTyping();
                    lf_chart(message, args.slice(1), "album").then(response => {
                        if (response && response instanceof Array) message.channel.send(...response);
                        else if (response) message.channel.send(response);
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

async function set_lf_user(message, username) {
    
    if (!username) {
        return "⚠ Please provide a Last.fm username: `.fm set <username>`.";
    }

    try {
        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`);
        username = response.data.user.name;
    } catch (e) {
        let { message, error } = e.response.data;
        if (error != 6) console.error(new Error(message));
        return `⚠ ${message || "Invalid Last.fm username."}`;
    }
    
    await database.set_lf_user(message.author.id, username);
    return `Last.fm username set to ${username}.`;

}

async function remove_lf_user(message) {
    
    let removed = await database.remove_lf_user(message.author.id);
    return removed ? `Last.fm username removed.` : `⚠ No Last.fm username found.`

}

async function lf_recents(message, args, limit) {

    let username;
    if (args) {
        if (args.length < 1) {
            username = null;
            limit = limit || 10;
        } else if (args.length < 2) {
            username = limit  ?  args[0]  : null;
            limit    = limit || +args[0] || 10;
        } else {
            username = limit  ?  args[0]  : args[1] || args[0];
            limit    = limit || +args[0] || 10;
        }
    }

    if (!username) {
        username = await database.get_lf_user(message.author.id);
    }
    if (!username) {
        return "⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`.";
    }

    limit = Math.min(limit, 1000);

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=${limit}`);
    } catch (e) {
        let { message } = e.response.data;
        return `⚠ ${message || "Unknown Error Occurred."}`;
    }

    let tracks = response.data.recenttracks.track
    if (!tracks || tracks.length < 1) {
        return `⚠ ${username} hasn't listened to any music.`;
    }
    if (!Array.isArray(tracks)) {
        tracks = [ tracks ];
    }
    tracks = tracks.slice(0, limit);
    let lfUser = response.data.recenttracks['@attr'].user;
    let totalPlays = response.data.recenttracks['@attr'].total;

    let playCount;
    let loved;
    if (tracks.length < 3) {
        try {
            let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=track.getInfo&user=${lfUser}&api_key=${api_key}&artist=${encodeURIComponent(tracks[0].artist["#text"])}&track=${encodeURIComponent(tracks[0].name)}&format=json`);
            if (response.data.track) {
                let { userplaycount, userloved } = response.data.track;
                playCount = userplaycount;    
                loved = userloved;
            }
        } catch (e) {
            e = e.response ? e.response.data : e;
            console.error(new Error(e));
        }
    }

    if (tracks.length < 2) {
        return recent1Embed(tracks[0], lfUser, totalPlays, playCount, loved);
    } else if (tracks.length < 3) {
        return recent2Embed(tracks, lfUser, totalPlays, playCount);
    } else {
        recentListPages(message, tracks, lfUser);
        return;
    }

}

async function recent1Embed(track, lfUser, totalPlays, playCount, loved) {

    let field = `${track.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track.name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")})`;
    if (track.album) field += ` | **${track.album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let np = track['@attr'] && track['@attr'].nowplaying ? true : false;
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";

    let thumbnail = track.image[2]["#text"] || "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = track.image[track.image.length-1]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    
    let embed = new Discord.RichEmbed()
    .setAuthor(`${lfUser+p} ${np ? 'Now Playing' : 'Last Track'}`, `https://i.imgur.com/lQ3EqM6.png`, `https://www.last.fm/user/${lfUser}/`)
    .setThumbnail(thumbnail)
    .setURL(image)
    .addField('Track Info', field)
    .setColor(0xb90000)
    .setFooter(`${+loved ? '❤ Loved  |  ':''}Total Plays: ${totalPlays}`);

    if (playCount >= 0) {
        embed.addField('Track Plays', playCount);
    } else {
        embed.addField('Track Plays', 'N/A');
    }

    if (!np && track.date) {
        embed.setTimestamp(new Date(0).setSeconds(track.date.uts));
    }

    return embed;

}

async function recent2Embed (tracks, lfUser, totalPlays, playCount) {

    let field1 = `${tracks[0].artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${tracks[0].name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(tracks[0].artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(tracks[0].name).replace(/\)/g, "\\)")})`;
    if (tracks[0].album) field1 += ` | **${tracks[0].album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let field2 = `${tracks[1].artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${tracks[1].name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(tracks[1].artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(tracks[1].name).replace(/\)/g, "\\)")})`;
    if (tracks[1].album) field2 += ` | **${tracks[1].album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let np = tracks[0]['@attr'] && tracks[0]['@attr'].nowplaying ? true : false;
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";

    let thumbnail = tracks[0].image[2]["#text"] || "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = tracks[0].image[tracks[0].image.length-1]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    
    let embed = new Discord.RichEmbed()
    .setAuthor(`${lfUser+p} Recent Tracks`, `https://i.imgur.com/lQ3EqM6.png`, `https://www.last.fm/user/${lfUser}/`)
    .setThumbnail(thumbnail)
    .setURL(image)
    .addField(np ? 'Now Playing' : 'Last Played', field1)
    .addField("Previous Track", field2)
    .setColor(0xb90000)
    .setFooter(`Track Plays: ${playCount ? playCount : 'N/A'}  |  Total Plays: ${totalPlays}`);

    if (!np && tracks[0].date) {
        embed.setTimestamp(new Date(0).setSeconds(tracks[0].date.uts));
    }

    return embed;

}

async function recentListPages (message, tracks, lfUser) {

    let thumbnail = tracks[0].image[2]["#text"] || "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = tracks[0].image[tracks[0].image.length-1]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";

    let np = (track) => track['@attr'] && track['@attr'].nowplaying;
    let rowString = tracks.map((track, i) => `${np(track) ? '\\▶' : `${i + 1}.`} ${track.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track.name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")}) (${np(track) ? 'Now' : functions.getTimeAgo(track.date.uts)})`).join('\n');

    let descriptions = [];
    while (rowString.length > 2048 || rowString.split('\n').length > 25) {
        let currString = rowString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rowString  = rowString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(rowString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: `${lfUser+p} Recent Tracks`, icon_url: 'https://i.imgur.com/lQ3EqM6.png', url: `https://www.last.fm/user/${lfUser}/`
                },
                url: image,
                description: desc,
                thumbnail: { url: thumbnail },
                color: 0xb90000,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    });

    functions.pages(message, pages);
    return;

}

async function lf_top_media(message, args, type) {

    let embeds = {
        'artist': { 
            colour: 0xf49023, image: 'https://i.imgur.com/FwnPEny.png',
            defimg: "https://lastfm-img2.akamaized.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png" 
        },
        'album' : { 
            colour: 0x2f8f5e, image: 'https://i.imgur.com/LZmYwDG.png',
            defimg: "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png" 
        },
        'track' : { 
            colour: 0x2b61fb, image: 'https://i.imgur.com/RFO9qp1.png',
            defimg: "https://lastfm-img2.akamaized.net/i/u/174s/4128a6eb29f94943c9d206c08e625904.png" 
        }
    }
    
    let time;
    let limit;
    if (args.length < 1) {
        time  = getTimeFrame();
        limit = 10;
    }
    else if (args.length < 2) {
        time  = getTimeFrame(args[0]);
        limit = time.defaulted && +args[0] ? args[0] : 10;
    }
    else {
        time  = getTimeFrame(args[0]);
        limit = time.defaulted ? +args[0] || null : +args[1] || 10;

        if (time.defaulted) time = getTimeFrame(args[1]);
        limit = time.defaulted && !limit ? +args[1] || 1 : limit || 10;
    }
    
    let username = args.length > 2 ? args[2] : null;
    if (!username) {
        username = await database.get_lf_user(message.author.id);
    }
    if (!username) {
        return "⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.";
    }

    let {
        timeframe,
        date_preset,
        display_time
    } = time;

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettop${type}s&user=${username}&api_key=${api_key}&format=json&period=${timeframe}&limit=${limit}`);
    } catch (e) {
        let { message } = e.response.data;
        return `⚠ ${message || "Unknown Error Occurred."}`;
    }

    let lf_user = response.data[`top${type}s`]["@attr"].user;
    let collection = response.data[`top${type}s`][type];
    if (!collection || collection.length < 1) {
        return `⚠ ${lf_user} hasn't listened to any music during this time.`;
    }

    let rowString;
    if (type == 'artist') rowString = collection.map((x, i) => `${i+1}. [${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.name).replace(/\)/g, "\\)")}) (${x.playcount} ${x.playcount == 1 ? 'Play' : 'Plays'})`).join('\n');
    if (type == 'album' ) rowString = collection.map((x, i) => `${i+1}. ${x.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/${  encodeURIComponent(x.name).replace(/\)/g, "\\)")}) (${x.playcount} ${x.playcount == 1 ? 'Play' : 'Plays'})`).join('\n');
    if (type == 'track' ) rowString = collection.map((x, i) => `${i+1}. ${x.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/_/${encodeURIComponent(x.name).replace(/\)/g, "\\)")}) (${x.playcount} ${x.playcount == 1 ? 'Play' : 'Plays'})`).join('\n');

    let descriptions = [];
    while (rowString.length > 2048 || rowString.split('\n').length > 25) {
        let currString = rowString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rowString  = rowString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(rowString);

    let thumbnail
    if (type == 'track' || type == 'artist') {
        // response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${api_key}&artist=${encodeURIComponent(collection[0].artist.name)}&track=${encodeURIComponent(collection[0].name)}&format=json`);
        // thumbnail = response.data.track.album ? response.data.track.album.image[2]["#text"] : thumbnail = collection[0].image[2]["#text"];
        thumbnail = type == 'track' ? await scrapeArtistImage(collection[0].artist.name) : await scrapeArtistImage(collection[0].name);
    } else {
        thumbnail = collection[0].image[2]["#text"];
        if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = embeds[type].defimg;
    }
    let p = lf_user[lf_user.length-1].toLowerCase() == "s" ? "'" : "'s";

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: `${lf_user+p} Top ${type[0].toUpperCase()+type.slice(1)}s`, icon_url: embeds[type].image, url: `https://www.last.fm/user/${lf_user}/library/${type}s?date_preset=${date_preset}`
                },
                title: display_time,
                description: desc,
                thumbnail: { url: thumbnail },
                color: embeds[type].colour,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    functions.pages(message, pages);
    return;

}

async function lf_profile(message, username) {

    if (!username) {
        username = await database.get_lf_user(message.author.id);
    }
    if (!username) {
        return "⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm profile <username>` to see the Last.fm profile of a specific user.";
    }

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`)
    } catch (e) {
        let { message } = e.response.data;
        return `⚠ ${message || "Unknown Error Occurred."}`;
    }

    let user = response.data.user;
    let thumbnail = user.image[2]["#text"];
    let image = user.image[user.image.length-1]["#text"].replace("300x300/", "");

    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let date = new Date(0);
    date.setSeconds(user.registered.unixtime);

    let date_string = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

    response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&api_key=${api_key}&format=json`)
    let artist_count = response.data.topartists["@attr"].total;

    response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${api_key}&format=json`)
    let album_count = response.data.topalbums["@attr"].total;

    response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&api_key=${api_key}&format=json`)
    let track_count = response.data.toptracks["@attr"].total;

    let embed = new Discord.RichEmbed()
    .setAuthor(`${user.name}`,`https://i.imgur.com/lQ3EqM6.png`, `https://www.last.fm/user/${user.name}/`)
    .setColor(0xb90000)
    .setFooter(`Total Scrobbles: ${user.playcount}`)
    .setThumbnail(thumbnail)
    .setURL(image)
    .setDescription(`Scrobbling since ${date_string}`)
    .setTimestamp(date)
    .addField("Library", `Artists: ${artist_count} | Albums: ${album_count} | Tracks: ${track_count}`);

    return { embed: embed };

}

async function lf_avatar(message, username) {

    if (!username) {
        username = await database.get_lf_user(message.author.id);
    }
    if (!username) {
        return "⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fmyt <username>` to get a youtube video of the most recent song listened to by a specific user.";
    }

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`)
    } catch (e) {
        let { message } = e.response.data;
        return `⚠ ${message || "Unknown Error Occurred."}`;
    }

    let { name, image } = response.data.user;

    let avatar_match = image[0]['#text'].match(/(https:\/\/lastfm-img2\.akamaized\.net\/i\/u)\/.*?\/(.+)/i)
    let avatar_url = avatar_match ? avatar_match.slice(1).join('/') : 'https://lastfm-img2.akamaized.net/i/u/818148bf682d429dc215c1705eb27b98.png';
    let res = await axios.get(avatar_url, {responseType: 'arraybuffer'});
    let img_size = Math.max(Math.round(res.headers['content-length']/10000)/100, 1/100);
    let img_type = res.headers['content-type'].split('/')[1];

    let img  = new Image(res.data);
    let dims = img.dimensions;
    let p = username.toLowerCase().endsWith('s') ? "'" : "'s";

    return new Discord.RichEmbed()
    .setAuthor(`${name+p} Last.fm Avatar`, `https://i.imgur.com/lQ3EqM6.png`, `https://www.last.fm/user/${name}/`)
    .setImage(avatar_url)
    .setColor(0xb90000)
    .setFooter(`Type: ${img_type.toUpperCase()}  |  Size: ${dims ? dims.join('x') + ' - ':''}${img_size}MB`);

}

async function lf_youtube(message, username) {

    if (!username) {
        username = await database.get_lf_user(message.author.id);
    }
    if (!username) {
        return "⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fmyt <username>` to get a youtube video of the most recent song listened to by a specific user.";
    }

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=1`);
    } catch (e) {
        let { message } = e.response.data;
        return `⚠ ${message || "Unknown Error Occurred."}`;
    }

    let track = response.data.recenttracks.track[0];
    if (!track.artist) {
        return `⚠ ${username} hasn't listened to any music.`;
    }
    let query = `${track.artist["#text"]} - ${track.name}`;
    let np = track["@attr"] && track["@attr"].nowplaying;

    let video = await media.yt_vid_query(query);
    if (!video) {
        return `⚠ Couldn't find a YouTube video for \`${query}\``;
    }
    return `${np ? "Now Playing" : "Last Played"}: https://youtu.be/${video}`;

}

async function lf_chart(message, args, type = "album") {

    let username = await database.get_lf_user(message.author.id);
    if (!username) {
        return "⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.";
    }

    let grid;
    let time;
    if (args.length < 1) {
        grid = "3x3";
        time = "7day";
    }
    else if (args.length < 2) {
        let gridMatch = args[0].match(/\d+x\d+/i);
        grid = gridMatch ? args[0] : "3x3";
        time = gridMatch ? "7day" : args[0];
    }
    else {
        let gridMatch = args[0].match(/\d+x\d+/i);
        grid = gridMatch ? args[0] : args[1];
        time = gridMatch ? args[1] : args[0];
    }
    let dims = grid.split('x');
    let dimension = Math.round(Math.sqrt(+dims[0]*+dims[1])) || 3;
    if (dimension > 10) dimension = 10;

    let { timeframe, display_time, date_preset } = getTimeFrame(time);

    let collection = [];
    if (type == 'album') {

        let response;
        try {
            response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettop${type.toLowerCase()}s&user=${username}&api_key=${api_key}&format=json&period=${timeframe}&limit=${dimension ** 2}`);
        } catch (e) {
            let { message } = e.response.data;
            return `⚠ ${message || "Unknown Error Occurred."}`;
        }
        collection = response.data[`top${type}s`][type];

    } else {
        
        for (let i = 0; i < Math.ceil((dimension**2)/50); i++) {
            if (i > 0 && collection.length < 50) break;
            let response;
            try {
                response = await axios.get(`https://www.last.fm/user/${username}/library/artists?date_preset=${date_preset}&page=${i+1}`);
            } catch (e) {
                let { message } = e.response.data;
                return `⚠ ${message || "Unknown Error Occurred."}`;
            }

            let doc = new JSDOM(response.data).window.document;
            let rows = doc.getElementsByClassName('chartlist-row link-block-basic js-link-block');
            for (let i = 0; i < rows.length && i < dimension ** 2; i++) {
                let row = rows[i];
                collection.push({ 
                    'image': [{
                        '#text': row.getElementsByClassName('avatar')[0].getElementsByTagName('img')[0].src.replace('/avatar70s/', '/300x300/'),
                    }],
                    'name': row.getElementsByClassName('link-block-target')[0].textContent, 
                    'playcount': row.getElementsByClassName('chartlist-count-bar-value')[0].textContent.match(/[0-9,]+/)[0]
                })
            }
        }

    }

    if (!collection || collection.length < 1) {
        return `⚠ ${username} hasn't listened to any music during this time.`;
    }
    while (Math.sqrt(collection.length) <= dimension-1) {
        dimension--;
    }
    
    let screen_width = (collection.length < dimension ? collection.length : dimension) * 300;
    let screen_height = (Math.ceil(collection.length / dimension)) * 300;

    let css = fs.readFileSync("./resources/css/fmchart.css", {encoding: 'utf8'});
    let htmlString = "";

    htmlString += `<div class="grid">\n    `;
    for (let i=0; i<dimension; i++) {

        htmlString += `<div class="row">\n    `;
        for (let i=0; i<dimension; i++) {
            if (collection.length < 1) break;
            let item = collection.shift();

            let image = item.image[item.image.length-1]["#text"] || (type == "artist" ? 
                "https://lastfm-img2.akamaized.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" :
                "https://lastfm-img2.akamaized.net/i/u/300x300/c6f59c1e5e7240a4c0d427abd71f3dbb.png");

            if (type == "album") {
                htmlString += [
                    `    <div class="container">\n    `,
                    `        <img src="${image}" width="${300}" height="${300}">\n    `,
                    `        <div class="text">${item.artist.name}<br>${item.name}<br>Plays: ${item.playcount}</div>\n    `,
                    `    </div>\n    `
                ].join(``);
            }   
            if (type == "artist") {
                htmlString += [ 
                    `    <div class="container">\n    `,
                    `        <img src="${image}" width="${300}" height="${300}">\n    `,
                    `        <div class="text">${item.name}<br>Plays: ${item.playcount}</div>\n    `,
                    `    </div>\n    `
                ].join(``);
            }
        }
        htmlString += `</div>\n`;

    }
    htmlString += `</div>`;

    htmlString = [
        `<html>\n`,
        `<head>\n`,
        `    <meta charset="UTF-8">\n`,
        `</head>\n\n`,
        `<style>\n`,
        `${css}\n`,
        `</style>\n\n`,
        `<body>\n`,
        `${htmlString}\n`,
        `</body>\n\n`,
        `</html>\n`
    ].join(``);
 
    let image = await html.toImage(htmlString, screen_width, screen_height);
    let imageAttachment = new Discord.Attachment(image, `${username}-${timeframe}-${new Date(Date.now()).toISOString()}.jpg`);
    let p = username[username.length-1].toLowerCase == 's' ? "'" : "'s";
    return [ `**${username+p}** ${display_time} ${functions.capitalise(type)} Collage`, imageAttachment ];

}

//Util Functions

function getTimeFrame(timeframe) {
    
    let display_time;
    let date_preset;
    let defaulted = false;

    let week = ["7", "7day", "7days", "weekly", "week", "1week"];
    let month = ["30", "30day", "30days", "monthly", "month", "1month"];
    let three_month = ["90", "90day", "90days", "3months", "3month"];
    let six_month = ["180", "180day", "180days", "6months", "6month"];
    let year = ["365", "365day", "365days", "1year", "year", "yr", "12months", "12month", "yearly"];
    let overall = ["all", "at", "alltime", "forever", "overall"];

    switch (true) {
        case week.includes(timeframe):
            timeframe = "7day";
            display_time = "Last Week";
            date_preset = "LAST_7_DAYS";
            break;
        case month.includes(timeframe):
            timeframe = "1month";
            display_time = "Last Month";
            date_preset = "LAST_30_DAYS";
            break;
        case three_month.includes(timeframe):
            timeframe = "3month";
            display_time = "Last 3 Months";
            date_preset = "LAST_90_DAYS";
            break;
        case six_month.includes(timeframe):
            timeframe = "6month";
            display_time = "Last 6 Months";
            date_preset = "LAST_180_DAYS";
            break;
        case year.includes(timeframe):
            timeframe = "12month";
            display_time = "Last Year";
            date_preset = "LAST_365_DAYS";
            break;
        case overall.includes(timeframe):
            timeframe = "overall";
            display_time = "All Time";
            date_preset = "ALL";
            break;
        default:
            timeframe = "7day";
            display_time = "Last Week";
            date_preset = "LAST_7_DAYS";
            defaulted = true;
    }

    return {
        timeframe: timeframe,
        display_time: display_time,
        date_preset: date_preset,
        defaulted: defaulted
    };
}
