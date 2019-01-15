//Require modules

const Discord = require("discord.js");
const axios = require("axios");
const fs = require("fs");

const config = require("../config.json");
const database = require("./lastfm_db.js");
const functions = require("../functions/functions.js");
const html = require("../functions/html.js");
const media = require("./media.js");

//Init

const api_key = config.lastfm_key;

//Functions

exports.msg = async function (message, args) {

    //Handle commands

    switch (args[0]) {

        case ".lastfm":
        case ".fm":
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
                    lf_recents(message, args[2], 1).then(response => {
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

                default:
                    message.channel.startTyping();
                    lf_recents(message, null, 2).then(response => {
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

const set_lf_user = async function (message, username) {
    
    if (!username) {
        return "\\⚠ Please provide a Last.fm username: `.fm set <username>`.";
    }
    

    try {
        await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`);
    } catch (e) {
        let { message, error } = e.response.data;
        if (error != 6) console.error(new Error(message));
        return `\\⚠ ${message}.`;
    }
    
    let response = await database.set_lf_user(message.author.id, username);
    return response;

}

const remove_lf_user = async function (message) {
    
    return await database.remove_lf_user(message.author.id);

}

const lf_recents = async function (message, args, limit) {

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
        return "\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`.";
    }

    limit = Math.min(limit, 1000);

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=${limit}`);
    } catch (e) {
        let { message } = e.response.data;
        console.error(new Error(message));
        return `\\⚠ ${message}.`;
    }

    let tracks = response.data.recenttracks.track.slice(0, limit);
    let lfUser = response.data.recenttracks['@attr'].user;

    let playCount;
    let loved;
    let tags;
    if (tracks.length < 3) {
        try {
            let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=track.getInfo&user=${lfUser}&api_key=${api_key}&artist=${encodeURIComponent(tracks[0].artist["#text"])}&track=${encodeURIComponent(tracks[0].name)}&format=json`);
            let { userplaycount, userloved, toptags } = response.data.track;
            playCount = userplaycount;    
            loved = userloved;
            tags = toptags.tag.slice(0, 5).map(x => x.name);
        } catch (e) {
            e = e.response ? e.response.data : e;
            console.error(new Error(e));
        }
    }

    if (limit < 1) {
        return `\\⚠ ${lfUser} hasn't listened to any music.`;
    } else if (limit < 2) {
        return recent1Embed(tracks[0], lfUser, playCount, loved, tags);
    } else if (limit < 3) {
        return recent2Embed(tracks.slice(0, 2), lfUser, playCount);
    } else {
        recentListPages(message.channel, tracks.slice(0, 1000), lfUser);
        return;
    }

}

recent1Embed = (track, lfUser, playCount, loved, tags) => {

    let field = `${track.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track.name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")})`;
    if (track.album) field += ` | **${track.album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let np = track['@attr'] && track['@attr'].nowplaying ? true : false;
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";

    let thumbnail = track.image[2]["#text"] || "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = track.image[track.image.length-1]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    
    let embed = new Discord.RichEmbed()
    .setAuthor(`${lfUser+p} Latest Track`, `https://i.imgur.com/YbZ52lN.png`, `https://www.last.fm/user/${lfUser}/`)
    .setThumbnail(thumbnail)
    .setURL(image)
    .addField(np ? 'Now Playing' : 'Last Played', field)
    .addField("Track Plays", playCount, true)
    .addField("Loved", +loved ? '❤' : '🖤', true)
    .setColor(0xc1222a)

    if (tags.length > 0) {
        embed.setFooter("Tags: " + tags.join(', '))
    }
    if (!np && track.date) {
        embed.setTimestamp(new Date(0).setSeconds(+track.date.uts));
    }

    return embed;

}

recent2Embed = (tracks, lfUser, playCount) => {

    let field1 = `${tracks[0].artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${tracks[0].name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(tracks[0].artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(tracks[0].name).replace(/\)/g, "\\)")})`;
    if (tracks[0].album) field1 += ` | **${tracks[0].album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let field2 = `${tracks[1].artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${tracks[1].name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(tracks[1].artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(tracks[1].name).replace(/\)/g, "\\)")})`;
    if (tracks[1].album) field2 += ` | **${tracks[1].album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`;
    let np = tracks[0]['@attr'] && tracks[0]['@attr'].nowplaying ? true : false;
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";

    let thumbnail = tracks[0].image[2]["#text"] || "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = tracks[0].image[tracks[0].image.length-1]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    
    let embed = new Discord.RichEmbed()
    .setAuthor(`${lfUser+p} Latest Track`, `https://i.imgur.com/YbZ52lN.png`, `https://www.last.fm/user/${lfUser}/`)
    .setThumbnail(thumbnail)
    .setURL(image)
    .addField(np ? 'Now Playing' : 'Last Played', field1)
    .addField("Previous Track", field2)
    .setColor(0xc1222a)

    if (playCount) {
        embed.setFooter("Track Plays: " + playCount)
    }
    if (!np && tracks[0].date) {
        embed.setTimestamp(new Date(0).setSeconds(+tracks[0].date.uts));
    }

    return embed;

}

recentListPages = (destination, tracks, lfUser) => {

    let thumbnail = tracks[0].image[2]["#text"] || "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    let image = tracks[0].image[tracks[0].image.length-1]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    let p = lfUser[lfUser.length-1].toLowerCase() == 's' ? "'" : "'s";
    let np = (track) => track['@attr'] && track['@attr'].nowplaying
    let rowString = tracks.map((track, i) => `${np(track) ? '\\▶' : `${i + 1}.`} ${track.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track.name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")}) (${np(track) ? 'Now' : functions.getTimeAgo(+track.date.uts)})`).join('\n');

    let pages = [];
    while (rowString.length > 2048) {
        let currString = rowString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rowString  = rowString.slice(lastIndex);

        pages.push(currString);
    } 
    pages.push(rowString);

    let embed = new Discord.RichEmbed()
    .setAuthor(`${lfUser+p} Latest Track`, `https://i.imgur.com/YbZ52lN.png`, `https://www.last.fm/user/${lfUser}/`)
    .setThumbnail(thumbnail)
    .setURL(image)
    .setColor(0xc1222a)

    functions.embedPages(destination, embed, pages, 600000);
    return;

}

const lf_top_media = async function (message, args, type) {

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
        return "\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.";
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
        console.error(new Error(message));
        return `\\⚠ ${message}.`;
    }

    let lf_user = response.data[`top${type}s`]["@attr"].user;
    let collection = response.data[`top${type}s`][type];
    if (!collection || collection.length < 1) {
        return `\\⚠ ${lf_user} hasn't listened to any music during this time.`;
    }

    let rowString;
    if (type == 'artist') rowString = collection.map((x, i) => `${i+1}. [${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.name).replace(/\)/g, "\\)")}) (${x.playcount} ${x.playcount == 1 ? 'Play' : 'Plays'})`).join('\n');
    if (type == 'album' ) rowString = collection.map((x, i) => `${i+1}. ${x.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/${  encodeURIComponent(x.name).replace(/\)/g, "\\)")}) (${x.playcount} ${x.playcount == 1 ? 'Play' : 'Plays'})`).join('\n');
    if (type == 'track' ) rowString = collection.map((x, i) => `${i+1}. ${x.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/_/${encodeURIComponent(x.name).replace(/\)/g, "\\)")}) (${x.playcount} ${x.playcount == 1 ? 'Play' : 'Plays'})`).join('\n');

    let pages = [];
    while (rowString.length > 2048) {
        let currString = rowString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rowString  = rowString.slice(lastIndex);

        pages.push(currString);
    } 
    pages.push(rowString);

    let thumbnail = collection[0].image[2]["#text"] || embeds[type].defimg;
    let p = lf_user[lf_user.length-1].toLowerCase() == "s" ? "'" : "'s";
    let embed = new Discord.RichEmbed()
    .setAuthor(`${lf_user+p} Top Tracks`, embeds[type].image, `https://www.last.fm/user/${lf_user}/library/${type}s?date_preset=${date_preset}`)
    .setTitle(display_time)
    .setThumbnail(thumbnail)
    .setColor(embeds[type].colour);

    functions.embedPages(message, embed, pages, 600000);
    return;

}

const lf_profile = async function (message, username) {

    if (!username) {
        username = await database.get_lf_user(message.author.id);
    }
    if (!username) {
        return "\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm profile <username>` to see the Last.fm profile of a specific user.";
    }

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`)
    } catch (e) {
        let { message } = e.response.data;
        console.error(new Error(message));
        return `\\⚠ ${message}.`;
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
    .setAuthor(`${user.name}`,`https://i.imgur.com/YbZ52lN.png`, `https://www.last.fm/user/${user.name}/`)
    .setColor(0xc1222a)
    .setFooter(`Total Scrobbles: ${user.playcount}`)
    .setThumbnail(thumbnail)
    .setURL(image)
    .setDescription(`Scrobbling since ${date_string}`)
    .setTimestamp(date)
    .addField("Library", `Artists: ${artist_count} | Albums: ${album_count} | Tracks: ${track_count}`);

    return { embed: embed };

}

const lf_youtube = async function (message, username) {

    if (!username) {
        username = await database.get_lf_user(message.author.id);
    }
    if (!username) {
        return "\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fmyt <username>` to get a youtube video of the most recent song listened to by a specific user.";
    }
    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=1`);
    } catch (e) {
        let { message } = e.response.data;
        console.error(new Error(message));
        return `\\⚠ ${message}.`;
    }

    let track = response.data.recenttracks.track[0];
    let artist = track.artist["#text"];
    let title = track.name;
    let query = `${artist} - ${title}`;

    let status = track["@attr"] && track["@attr"].nowplaying == "true" ? "Now Playing" : "Last Played";

    let video_link = await media.yt_query(query);
    return `${status}: ${video_link}`;

}

const lf_chart = async function (message, args, type="album") {

    let username = await database.get_lf_user(message.author.id);
    if (!username) {
        return "\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.";
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

    let { timeframe, display_time } = getTimeFrame(time);

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettop${type.toLowerCase()}s&user=${username}&api_key=${api_key}&format=json&period=${timeframe}&limit=${dimension ** 2}`);
    } catch (e) {
        let { message } = e.response.data;
        console.error(new Error(message));
        return `\\⚠ ${message}.`;
    }

    let collection = response.data[`top${type}s`][type];
    let lf_user = response.data[`top${type}s`]["@attr"].user;
    if (!collection || collection.length < 1) {
        return `\\⚠ ${lf_user} hasn't listened to any music during this time.`;
    }
    while (Math.sqrt(collection.length) <= dimension-1) {
        dimension--;
    }
    let screen_width = (collection.length < dimension ? collection.length : dimension) * 300;
    let screen_height = (Math.ceil(collection.length / dimension)) * 300;

    let css = fs.readFileSync("./resources/fmchart.css", {encoding: 'utf8'});
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
    let imageAttachment = new Discord.Attachment(image, `${lf_user}-${timeframe}.jpg`);
    let posessive = lf_user[lf_user.length-1].toLowerCase == 's' ? "'" : "'s";
    return [
        `**${lf_user}${posessive}** ${display_time} ${functions.capitalise(type)} Chart`, 
        imageAttachment
    ];

}

//Util Functions

getTimeFrame = (timeframe) => {
    
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
