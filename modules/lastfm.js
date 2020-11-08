const Discord = require("discord.js");
const { embedPages, withTyping } = require("../functions/discord.js");

const axios = require("axios");
const fs = require("fs");

const { getTimeFrame, scrapeArtistImage, scrapeArtistsWithImages } = require("../functions/lastfm.js");
const functions = require("../functions/functions.js");
const html = require("../functions/html.js");
const { Image } = require("../functions/images.js");

const database = require("../db_queries/lastfm_db.js");
const config = require("../config.json");
const media = require("./media.js");

const api_key = config.lastfm_key;

const lastfm = axios.create({
    baseURL: "https://ws.audioscrobbler.com/2.0",
    timeout: 5000,
    params: { api_key, format: "json" }
});


exports.onCommand = async function(message, args) {
    let { channel } = message;

    switch (args[0]) {
        case "lastfm":
        case "lf":
        case "fm":
            switch (args[1]) {
                case "set": 
                    withTyping(channel, setLfUser, [message, args[2]]); 
                    break;

                case "remove":
                case "delete":
                case "del": 
                    withTyping(channel, removeLfUser, [message]); 
                    break;

                case "recent":
                case "recents": 
                    withTyping(channel, lfRecents, [message, args.slice(2)]);
                    break;

                case "nowplaying":
                case "np":
                    withTyping(channel, lfRecents, [message, args.slice(2), 1]);
                    break;

                case "topartists":
                case "ta":
                    withTyping(channel, lfTopMedia, [message, args.slice(2), "artist"]);
                    break;

                case "topalbums":
                case "talb":
                case "tal":
                case "tab":
                    withTyping(channel, lfTopMedia, [message, args.slice(2), "album"]);
                    break;

                case "toptracks":
                case "tt":
                    withTyping(channel, lfTopMedia, [message, args.slice(2), "track"]);
                    break;

                case "profile":
                    withTyping(channel, lfProfile, [message, args[2]]);
                    break;

                case "avatar":
                case "dp":
                    withTyping(channel, lfAvatar, [message, args[2]]);
                    break;

                case "yt":
                    withTyping(channel, lfYoutube, [message, args[2]]);
                    break;
                
                case "help":
                    channel.send(`Help with Last.fm can be found here: https://haseulbot.xyz/#last.fm`);
                    break;

                default:
                    withTyping(channel, lfRecents, [message, args.slice(1), 2]);
                    break;

            }
            break;

        case "chart":
            switch (args[1]) {
                case "artist":
                case "artists":
                    withTyping(channel, lfChart, [message, args.slice(2), "artist"]);
                    break;
                
                default:
                    withTyping(channel, lfChart, [message, args.slice(1), "album"]);
                    break;
            }
            break;

        case "lfyt":
        case "fmyt":
            withTyping(channel, lfYoutube, [message, args[1]]);
            break;
    }
}

async function setLfUser(message, username) {
    
    if (!username) {
        message.channel.send(`⚠ Please provide a Last.fm username: \`.fm set <username>\`.`);
    } else {
        try {
            let response = await lastfm.get('/', {params: { method: "user.getinfo", user: username }});
            username = response.data.user.name;
        } catch (e) {
            if (e.response) {
                console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
                if (e.response.status >= 500) {
                    message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
                } else {
                    message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
                }
            } else {
                console.error(e);
                message.channel.send(`⚠ Unknown error occurred.`);
            }
            return;
        }
        
        await database.setLfUser(message.author.id, username);
        message.channel.send(`Last.fm username set to ${username}.`);
    }

}

async function removeLfUser(message) {
    
    let removed = await database.removeLfUser(message.author.id);
    message.channel.send(removed ? `Last.fm username removed.` : `⚠ No Last.fm username found.`);

}

async function lfRecents(message, args, limit) {

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
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        message.channel.send(`⚠ No Last.fm username linked to your account. Please link a username to your account using \`.fm set <username>\`.`);
        return;
    }

    limit = Math.min(limit, 1000);

    let response;
    try {
        response = await lastfm.get('/', {params: { method: "user.getrecenttracks", user: username, limit }});
    } catch (e) {
        if (e.response) {
            console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
            if (e.response.status >= 500) {
                message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
            } else {
                message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
            }
        } else {
            console.error(e);
            message.channel.send(`⚠ Unknown error occurred.`);
        }
        return;
    }

    let tracks = response.data.recenttracks.track
    if (!tracks || tracks.length < 1) {
        message.channel.send(`⚠ ${username} hasn't listened to any music.`);
        return;
    }
    if (!Array.isArray(tracks)) {
        tracks = [ tracks ];
    }
    tracks = tracks.slice(0, limit);
    let lfUser = response.data.recenttracks['@attr'].user;
    
    let playCount = "N/A";
    let loved = false;
    if (tracks.length < 3) {
        try {
            response = await lastfm.get('/', {params: { method: "track.getInfo", user: lfUser, artist: tracks[0].artist["#text"], track: tracks[0].name }});
            if (response.data.track) {
                let { userplaycount, userloved } = response.data.track;
                playCount = userplaycount;    
                loved = userloved;
            }
        } catch (e) {
            if (e.response) {
                console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
            } else {
                console.error(e);
            }
        }
    }

    if (tracks.length < 2) {
        recent1Embed(message, tracks[0], lfUser, playCount, loved).catch(console.error);
    } else if (tracks.length < 3) {
        recent2Embed(message, tracks, lfUser, playCount).catch(console.error);
    } else {
        recentListPages(message, tracks, lfUser).catch(console.error);
    }

}

async function recent1Embed(message, track, lfUser, playCount, loved) {

    let trackField = `${track.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track.name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")})`;
    let np = track['@attr'] && track['@attr'].nowplaying ? true : false;
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";

    let thumbnail = track.image[2]["#text"] || "https://lastfm.freetls.fastly.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
        thumbnail = "https://lastfm.freetls.fastly.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    }
    let image = track.image[track.image.length-1]["#text"].replace("300x300/", "") || "https://lastfm.freetls.fastly.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    
    let embed = new Discord.MessageEmbed({
        author: { name: `${lfUser+p} ${np ? 'Now Playing' : 'Last Track'}`, icon_url: 'https://i.imgur.com/lQ3EqM6.png', url: `https://www.last.fm/user/${lfUser}/` },
        thumbnail: { url: thumbnail },
        url: image,
        fields: [
            { name: 'Track Info', value: trackField }
        ],
        color: 0xb90000,
        footer: { text: `${+loved ? '❤ Loved  |  ':''}Track Plays: ${playCount}` }
    });

    if (track.album && track.album['#text']) {
        embed.fields.push({ name: 'Album', value: track.album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")});
    }
    if (!np && track.date) {
        embed.timestamp = new Date(0).setSeconds(track.date.uts);
    }

    message.channel.send({ embed });

}

async function recent2Embed (message, tracks, lfUser, playCount) {

    let field1 = `${tracks[0].artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${tracks[0].name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(tracks[0].artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(tracks[0].name).replace(/\)/g, "\\)")})`;
    if (tracks[0].album && tracks[0].album['#text']) field1 += ` | **${tracks[0].album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let field2 = `${tracks[1].artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${tracks[1].name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(tracks[1].artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(tracks[1].name).replace(/\)/g, "\\)")})`;
    if (tracks[1].album && tracks[1].album['#text']) field2 += ` | **${tracks[1].album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let np = tracks[0]['@attr'] && tracks[0]['@attr'].nowplaying ? true : false;
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";

    let thumbnail = tracks[0].image[2]["#text"] || "https://lastfm.freetls.fastly.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = "https://lastfm.freetls.fastly.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = tracks[0].image[tracks[0].image.length-1]["#text"].replace("300x300/", "") || "https://lastfm.freetls.fastly.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    
    let embed = new Discord.MessageEmbed({
        author: { name: `${lfUser+p} Recent Tracks`, icon_url: `https://i.imgur.com/lQ3EqM6.png`, url: `https://www.last.fm/user/${lfUser}/` },
        thumbnail: { url: thumbnail },
        url: image,
        fields: [
            { name: np ? 'Now Playing' : 'Last Played', value: field1 },
            { name: "Previous Track", value: field2 }
        ],
        color: 0xb90000,
        footer: { text: `Track Plays: ${playCount}` }
    });

    if (!np && tracks[0].date) {
        embed.timestamp = new Date(0).setSeconds(tracks[0].date.uts);
    }

    message.channel.send({ embed });

}

async function recentListPages (message, tracks, lfUser) {

    let thumbnail = tracks[0].image[2]["#text"] || "https://lastfm.freetls.fastly.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = "https://lastfm.freetls.fastly.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = tracks[0].image[tracks[0].image.length-1]["#text"].replace("300x300/", "") || "https://lastfm.freetls.fastly.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
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
            embed: {
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
            }
        }
    });

    embedPages(message, pages);
    return;

}

async function lfTopMedia(message, args, type) {

    let embeds = {
        'artist': { 
            colour: 0xf49023, image: 'https://i.imgur.com/FwnPEny.png',
            defimg: "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png" 
        },
        'album' : { 
            colour: 0x2f8f5e, image: 'https://i.imgur.com/LZmYwDG.png',
            defimg: "https://lastfm.freetls.fastly.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png" 
        },
        'track' : { 
            colour: 0x2b61fb, image: 'https://i.imgur.com/RFO9qp1.png',
            defimg: "https://lastfm.freetls.fastly.net/i/u/174s/4128a6eb29f94943c9d206c08e625904.png" 
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
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        message.channel.send(`⚠ No Last.fm username linked to your account. Please link a username to your account using \`.fm set <username>\`, alternatively, use \`.fm <username>\` to get recent tracks for a specific Last.fm user.`);
        return;
    }

    let {
        timeframe,
        datePreset,
        displayTime
    } = time;

    let response;
    try {
        response = await lastfm.get('/', {params: { method: `user.gettop${type}s`, user: username, period: timeframe, limit }});
    } catch (e) {
        if (e.response) {
            console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
            if (e.response.status >= 500) {
                message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
            } else {
                message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
            }
        } else {
            console.error(e);
            message.channel.send(`⚠ Unknown error occurred.`);
        }
        return;
    }

    let lf_user = response.data[`top${type}s`]["@attr"].user;
    let collection = response.data[`top${type}s`][type];
    if (!collection || collection.length < 1) {
        message.channel.send(`⚠ ${lf_user} hasn't listened to any music during this time.`);
        return;
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
        thumbnail = await scrapeArtistImage(type == 'track' ? collection[0].artist.name : collection[0].name);
    } else {
        thumbnail = collection[0].image[2]["#text"];
        if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = embeds[type].defimg;
    }
    let p = lf_user[lf_user.length-1].toLowerCase() == "s" ? "'" : "'s";

    let pages = descriptions.map((desc, i) => {
        return {
            embed: {
                author: {
                    name: `${lf_user+p} Top ${type[0].toUpperCase()+type.slice(1)}s`, icon_url: embeds[type].image, url: `https://www.last.fm/user/${lf_user}/library/${type}s?date_preset=${datePreset}`
                },
                title: displayTime,
                description: desc,
                thumbnail: { url: thumbnail },
                color: embeds[type].colour,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }
        }
    })

    embedPages(message, pages);

}

async function lfProfile(message, username) {

    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        message.channel.send(`⚠ No Last.fm username linked to your account. Please link a username to your account using \`.fm set <username>\`, alternatively, use \`.fm profile <username>\` to see the Last.fm profile of a specific user.`);
        return;
    }

    let response;
    try {
        response = await lastfm.get('/', {params: { method: "user.getinfo", user: username }});
    } catch (e) {
        if (e.response) {
            console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
            if (e.response.status >= 500) {
                message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
            } else {
                message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
            }
        } else {
            console.error(e);
            message.channel.send(`⚠ Unknown error occurred.`);
        }
        return;
    }

    let user = response.data.user;
    let thumbnail = user.image[2]["#text"];
    let image = user.image[user.image.length-1]["#text"].replace("300x300/", "");

    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let date = new Date(0);
    date.setSeconds(user.registered.unixtime);

    let date_string = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    let artist_count;
    let album_count;
    let track_count;

    try {
        response = await lastfm.get('/', {params: { method: "user.gettopartists", user: username }});
        artist_count = response.data.topartists["@attr"].total;
    
        response = await lastfm.get('/', {params: { method: "user.gettopalbums", user: username }});
        album_count = response.data.topalbums["@attr"].total;
    
        response = await lastfm.get('/', {params: { method: "user.gettoptracks", user: username }});
        track_count = response.data.toptracks["@attr"].total;
    } catch (e) {
        if (e.response) {
            console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
            if (e.response.status >= 500) {
                message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
            } else {
                message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
            }
        } else {
            console.error(e);
            message.channel.send(`⚠ Unknown error occurred.`);
        }
        return;
    }

    let embed = new Discord.MessageEmbed({
        author: { name: `${user.name}`, icon_url: `https://i.imgur.com/lQ3EqM6.png`, url: `https://www.last.fm/user/${user.name}/` },
        url: image,
        thumbnail: { url: thumbnail },
        color: 0xb90000,
        description: `Scrobbling since ${date_string}`,
        timestamp: date,
        fields: [
            { name: "Artists", value: parseInt(artist_count).toLocaleString(), inline: true },
            { name: "Albums", value: parseInt(album_count).toLocaleString(), inline: true },
            { name: "Tracks", value: parseInt(track_count).toLocaleString(), inline: true }
        ]
    });

    message.channel.send({ embed });

}

async function lfAvatar(message, username) {

    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        message.channel.send(`⚠ No Last.fm username linked to your account. Please link a username to your account using \`.fm set <username>\`, alternatively, use \`.fmyt <username>\` to get a youtube video of the most recent song listened to by a specific user.`);
        return;
    }

    let response;
    try {
        response = await lastfm.get('/', {params: { method: "user.getinfo", user: username }});
    } catch (e) {
        if (e.response) {
            console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
            if (e.response.status >= 500) {
                message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
            } else {
                message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
            }
        } else {
            console.error(e);
            message.channel.send(`⚠ Unknown error occurred.`);
        }
        return;
    }

    let { name, image } = response.data.user;
    let avatar_match = image[0]['#text'].match(/(https:\/\/lastfm\.freetls\.fastly\.net\/i\/u)\/.*?\/(.+)\./i);
    let avatar_url = avatar_match ? avatar_match.slice(1).join('/') + '.gif' : 'https://lastfm.freetls.fastly.net/i/u/818148bf682d429dc215c1705eb27b98.png';

    try {
        respose = await axios.get(avatar_url, {responseType: 'arraybuffer'});
    } catch (e) {
        if (e.response) {
            console.error(Error(`Last.fm dp error: ${e.response.status} - ${e.response.statusText}`));
            if (e.response.status >= 500) {
                message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
            } else {
                message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
            }
        } else {
            console.error(e);
            message.channel.send(`⚠ Unknown error occurred.`);
        }
        return;
    }

    let img_size = Math.max(Math.round(respose.headers['content-length']/10000)/100, 1/100);
    let img_type = respose.headers['content-type'].split('/')[1];

    let img  = new Image(respose.data);
    let dims = img.dimensions;
    let p = username.toLowerCase().endsWith('s') ? "'" : "'s";

    let embed = new Discord.MessageEmbed()
    .setAuthor(`${name+p} Last.fm Avatar`, `https://i.imgur.com/lQ3EqM6.png`, `https://www.last.fm/user/${name}/`)
    .setImage(avatar_url)
    .setColor(0xb90000)
    .setFooter(`Type: ${img_type.toUpperCase()}  |  Size: ${dims ? dims.join('x') + ' - ':''}${img_size}MB`);

    message.channel.send({ embed });

}

async function lfYoutube(message, username) {

    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        message.channel.send(`⚠ No Last.fm username linked to your account. Please link a username to your account using \`.fm set <username>\`, alternatively, use \`.fmyt <username>\` to get a youtube video of the most recent song listened to by a specific user.`);
        return;
    }

    let response;
    try {
        response = await lastfm.get('/', {params: { method: "user.getrecenttracks", user: username, limit: 1 }});
    } catch (e) {
        if (e.response) {
            console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
            if (e.response.status >= 500) {
                message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
            } else {
                message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
            }
        } else {
            console.error(e);
            message.channel.send(`⚠ Unknown error occurred.`);
        }
        return;
    }

    let track = response.data.recenttracks.track[0];
    if (!track.artist) {
        message.channel.send(`⚠ ${username} hasn't listened to any music.`);
        return;
    }
    let query = `${track.artist["#text"]} - ${track.name}`;
    let np = track["@attr"] && track["@attr"].nowplaying;

    let video = await media.ytVidQuery(query);
    if (!video) {
        message.channel.send(`⚠ Couldn't find a YouTube video for \`${query}\``);
    } else {
        message.channel.send(`${np ? "Now Playing" : "Last Played"}: https://youtu.be/${video}`);
    }

}

async function lfChart(message, args, type = "album") {

    let username = await database.getLfUser(message.author.id);
    if (!username) {
        message.channel.send(`⚠ No Last.fm username linked to your account. Please link a username to your account using \`.fm set {username}\``);
        return;
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
    let itemCount = dimension ** 2;

    let { timeframe, displayTime, datePreset } = getTimeFrame(time);

    let collection;
    if (type == 'album') {
        let response;
        try {
            response = await lastfm.get('/', {params: { method: `user.gettop${type.toLowerCase()}s`, user: username, period: timeframe, limit: itemCount }});
        } catch (e) {
            if (e.response) {
                console.error(Error(`Last.fm error: ${e.response.status} - ${e.response.statusText}`));
                if (e.response.status >= 500) {
                    message.channel.send(`⚠ Server Error. Last.fm is likely down or experiencing issues.`);
                } else {
                    message.channel.send(`⚠ Error occurred fetching Last.fm data.`);
                }
            } else {
                console.error(e);
                message.channel.send(`⚠ Unknown error occurred.`);
            }
            return;
        }
        collection = response.data[`top${type}s`][type];
    } else {
        collection = await scrapeArtistsWithImages(username, datePreset, itemCount);
    }

    if (!collection || collection.length < 1) {
        message.channel.send(`⚠ ${username} hasn't listened to any music during this time.`);
        return;
    }

    while (Math.sqrt(collection.length) <= dimension-1) dimension--;
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
                "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" :
                "https://lastfm.freetls.fastly.net/i/u/300x300/c6f59c1e5e7240a4c0d427abd71f3dbb.png");

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
 
    let image = await html.toImage(htmlString, screen_width, screen_height).catch(console.error);
    let imageAttachment = new Discord.MessageAttachment(image, `${username}-${timeframe}-${new Date(Date.now()).toISOString()}.jpg`);
    let p = username[username.length-1].toLowerCase == 's' ? "'" : "'s";
    message.channel.send(`**${username+p}** ${displayTime} ${functions.capitalise(type)} Collage`, imageAttachment);

}
