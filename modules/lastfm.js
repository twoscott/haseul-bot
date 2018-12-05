//Require modules

const discord = require("discord.js");
const axios = require("axios")

const client = require("../haseul").client;
const database = require("../modules/lastfm_database");
const functions = require("../functions/functions.js")
const youtube = require("./youtube.js")

//Variables

const api_key = "KEY"

let week = ["7", "7day", "7days", "weekly", "week", "1week"];
let month = ["30", "30day", "30days", "monthly", "month", "1month"];
let three_month = ["90", "90day", "90days", "3months", "3month"];
let six_month = ["180", "180day", "180days", "6months", "6month"];
let year = ["365", "365day", "365days", "1year", "year", "yr", "12months", "yearly"];
let overall = ["all", "alltime", "forever", "overall"];
let grids = ["3x3", "4x4", "5x5"];

//Functions

handle = async (message) => {

    let args = message.content.trim().split(" ");

    //Handle commands

    switch (args[0]) {

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
                    let recentsCount;
                    let username;
                    if (args.length > 2) {
                        if (!parseInt(args[2])) {
                            username = args[2];
                            recentsCount = 2;
                        } else {
                            recentsCount = parseInt(args[2]);
                            username = args[3];
                        } 
                    } else {
                        recentsCount = 2;
                    }

                    if (recentsCount > 1000) recentsCount = 1000;
                    
                    if (recentsCount < 3) {
                        message.channel.startTyping();
                        lf_recents(message, username, recentsCount).then(response => {
                            if (response) message.channel.send(response);
                            message.channel.stopTyping();
                        }).catch(error => {
                            console.error(error);
                            message.channel.stopTyping();
                        })
                    } else {
                        message.channel.startTyping();
                        lf_recents_list(message, username, recentsCount).then(response => {
                            if (response) message.channel.send(response);
                            message.channel.stopTyping();
                        }).catch(error => {
                            console.error(error);
                            message.channel.stopTyping();
                        })
                    }
                    break;

                case "topartists":
                case "tar":
                case "tat":
                case "ta":
                    message.channel.startTyping();
                    lf_top_artists(message, args.slice(2)).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "topalbums":
                case "tal":
                case "tab":
                    message.channel.startTyping();
                    lf_top_albums(message, args.slice(2)).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "toptracks":
                case "tts":
                case "tt":
                    message.channel.startTyping();
                    lf_top_tracks(message, args.slice(2)).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
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
                    lf_recents(message, args[1], 2).then(response => {
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
            message.channel.startTyping();
            lf_chart(message, args.slice(1)).then(response => {
                message.channel.send(response.content, response.messageOptions).then(reply => {
                    message.channel.stopTyping();
                })
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }
}

set_lf_user = async (message, username) => {
    return new Promise(async (resolve, reject) => {
        if (!username) {
            resolve("\\⚠ Please provide a Last.fm username: `.fm set <username>`.");
            return;
        }
    
        axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`).then(response => {
            database.set_lf_user(message.author.id, username).then(response => {
                resolve(response);
            })
    
        }).catch(error => {
            if (error.response.status === 404) {
                resolve(`\\⚠ "${username}" is an invalid username.`)
            } else {
                reject(error);
            }
        })
    })
}

remove_lf_user = async (message) => {
    return new Promise(async (resolve, reject) => {
        database.remove_lf_user(message.author.id).then(response => {
            resolve(response);
        })    
    })
}

lf_recents = async (message, username, recentsCount) => {
    return new Promise(async (resolve, reject) => {
        if (!username) {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            resolve("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.");
            return;
        }
        
        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=2`);

        if (response.data.error) {
            if (response.data.error == 6) {
                resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
                return;
            } else {
                reject(response.data.message);
                return;
            }
        }

        let tracks = response.data.recenttracks.track;
        let attr = response.data.recenttracks["@attr"];
        let lf_user = attr.user;
        let totalScrobbles = attr.total;
        if (!tracks || tracks.length < 1) {
            resolve(`\\⚠ ${lf_user} hasn't listened to any Music.`);
            return;
        }

        let track1 = tracks[0];
        let track2 = tracks[1];

        if (!track2) {
            track2 = {
                artist: {
                    "#text": "Null"
                },
                name: "Null"
            }
        }

        let trackResponse = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=track.getInfo&user=${lf_user}&api_key=${api_key}&artist=${encodeURIComponent(track1.artist["#text"])}&track=${encodeURIComponent(track1.name)}&format=json`);
        
        if (response.data.error) {
            if (response.data.error == 6) {
                resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
                return;
            } else {
                reject(response.data.message);
                return;
            }
        }

        let playCount;
        if (trackResponse.data.track && trackResponse.data.track.userplaycount) {
            playCount = trackResponse.data.track.userplaycount;
        } else {
            playCount = "0";
        }

        let album_thumbnail = track1.image[2]["#text"];
        let album_image = track1.image[track1.image.length - 1]["#text"].replace("300x300/", "");
        if (!album_thumbnail || album_thumbnail.length < 1) {
            album_thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
        }
        if (!album_image || album_image.length < 1) {
            album_image = "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
        }

        let nowplaying;
        if (track1["@attr"] && track1["@attr"].nowplaying == "true") {
            nowplaying = true;
            track1.status = "Now Playing";
        } else {
            nowplaying = false;
            track1.status = "Last Played";
        }

        let field1 = `${track1.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track1.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track1.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track1.name).replace(/\)/g, "\\)")})`;
        let field2 = `${track2.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track2.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track2.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track2.name).replace(/\)/g, "\\)")})`;
        if (track1.album["#text"]) field1+=` | **${track1.album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`
        if (track2.album["#text"]) field2+=` | **${track2.album["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}**`

        let posessive;
        if (lf_user[lf_user.length - 1].toLowerCase() == "s") {
            posessive = "'";
        } else {
            posessive = "'s";
        }
        let embed = new discord.RichEmbed()
            .setColor(0xc1222a)
            .setThumbnail(album_thumbnail)
            .setURL(album_image)
            .addField(`${track1.status}`, field1, false);
        
        if (recentsCount === 1) {
            let tagResponse = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=track.gettoptags&artist=${encodeURIComponent(track1.artist["#text"])}&track=${encodeURIComponent(track1.name)}&api_key=${api_key}&format=json`);
            let tags = tagResponse.data.toptags.tag.slice(0, 5);
            let taglist = [];
            for (i=0; i < tags.length; i++) {
                taglist.push(tags[i].name[0].toUpperCase() + tags[i].name.slice(1).toLowerCase());
            }
            embed.setAuthor(`${lf_user}${posessive} Latest Track`, `https://i.imgur.com/YbZ52lN.png`, `https://www.last.fm/user/${lf_user}/`)
            embed.addField(`Track Plays`, playCount, false);
            if (taglist.length > 0) embed.setFooter(`Tags: ${taglist.join(", ")}`);
        } else if (recentsCount === 2) {
            embed.setAuthor(`${lf_user}${posessive} Recent Tracks`, `https://i.imgur.com/YbZ52lN.png`, `https://www.last.fm/user/${lf_user}/`)
            embed.addField(`Previous Track`, field2, false);
            embed.setFooter(`Track Plays: ${playCount}`);
        }

        if (!nowplaying && track1.date) {
            embed.setTimestamp(new Date(0).setSeconds(parseInt(track1.date.uts)));
        }
        resolve({embed: embed})

    })
}

lf_recents_list = async (message, username, recentsCount) => {
    return new Promise(async (resolve, reject) => {
        if (!username) {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            resolve("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.");
            return;
        }

        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=${recentsCount}`);

        if (response.data.error) {
            if (response.data.error == 6) {
                resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
                return;
            } else {
                reject(response.data.message);
                return;
            }
        }

        let tracks = response.data.recenttracks.track;
        let attr = response.data.recenttracks["@attr"];
        let lf_user = attr.user;
        if (!tracks || tracks.length < 1) {
            resolve(`\\⚠ ${lf_user} hasn't listened to any Music.`);
            return;
        }

        let pages = [];
        let length = 0;
        let page = [];
        for (i=0; i < recentsCount && i < tracks.length; i++) {
            let track = tracks[i];
            let row;
            if (track["@attr"] && track["@attr"].nowplaying == "true") {
                row = `\\▶ ${track.artist["#text"]} - [${track.name.replace("]", "\\]")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")}) (Now)`;
            } else {
                row = `${i + 1}. ${track.artist["#text"]} - [${track.name.replace("]", "\\]")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")}) (${getTimeAgo(parseInt(track.date.uts))})`;
            }
            if (length + (row.length + 1) > 2048 || page.length > 19) { // + 1 = line break
                pages.push(page.join("\n"));
                page = [row];
                length = row.length + 1;
            } else {
                page.push(row);
                length += row.length + 1;
            }
        }
        pages.push(page.join("\n"));

        let posessive;
        if (lf_user[lf_user.length - 1].toLowerCase() == "s") {
            posessive = "'";
        } else {
            posessive = "'s";
        }
        let embed = new discord.RichEmbed()
            .setAuthor(`${lf_user}${posessive} Recent Tracks`, `https://i.imgur.com/YbZ52lN.png`, `https://www.last.fm/user/${lf_user}/library`)
            .setColor(0xc1222a);

        functions.embedPages(message, embed, pages, 600000);
        resolve();
        
    })
}

lf_top_artists = async (message, args) => {
    return new Promise(async (resolve, reject) => {

        let time = getTimeFrame(args[0]);
        let timeframe = time.timeframe;
        let date_preset = time.date_preset;
        let display_time = time.display_time;
        let time_defaulted = time.defaulted;

        let username;
        if (time_defaulted) {
            username = args[0];
        } else {
            username = args[1];
        }
        
        if (!username) {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            resolve("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.");
            return;
        }

        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&api_key=${api_key}&format=json&period=${timeframe}&limit=${100}`);

        if (response.data.error) {
            if (response.data.error == 6) {
                resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
                return;
            } else {
                reject(response.data.message);
                return;
            }
        }

        let artists = response.data.topartists.artist;
        let attr = response.data.topartists["@attr"];
        let lf_user = attr.user;
        if (!artists || artists.length < 1) {
            resolve(`\\⚠ ${lf_user} hasn't listened to any Music.`);
            return;
        }

        let pages = [];
        let length = 0;
        let page = [];
        for (i=0; i < artists.length; i++) {
            let artist = artists[i];

            let plays_plural = "Plays"
            if (artist.playcount === "1") plays_plural = "Play";

            let row = `${i + 1}. [${artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(artist.name).replace(/\)/g, "\\)")}) (${artist.playcount} ${plays_plural})`
            if (length + (row.length + 1) > 2048 || page.length > 19) { // + 1 = line break
                pages.push(page.join("\n"));
                page = [row];
                length = row.length + 1;
            } else {
                page.push(row);
                length += row.length + 1;
            }
        }
        pages.push(page.join("\n"));

        let artist_thumbnail = artists[0].image[2]["#text"];
        if (!artist_thumbnail) {
            artist_thumbnail = "https://lastfm-img2.akamaized.net/i/u/avatar170s/2a96cbd8b46e442fc41c2b86b821562f.png";
        }

        let posessive;
        if (lf_user[lf_user.length - 1].toLowerCase() == "s") {
            posessive = "'";
        } else {
            posessive = "'s";
        }
        let embed = new discord.RichEmbed()
            .setAuthor(`${lf_user}${posessive} Top Artists`,`https://i.imgur.com/FwnPEny.png`, `https://www.last.fm/user/${lf_user}/library/artists?date_preset=${date_preset}`)
            .setTitle(display_time)
            .setThumbnail(artist_thumbnail)
            .setColor(0xf49023);

        functions.embedPages(message, embed, pages, 600000);
        resolve();
        
    })
}

lf_top_albums = async (message, args) => {
    return new Promise(async (resolve, reject) => {

        let time = getTimeFrame(args[0]);
        let timeframe = time.timeframe;
        let date_preset = time.date_preset;
        let display_time = time.display_time;
        let time_defaulted = time.defaulted;

        let username;
        if (time_defaulted) {
            username = args[0];
        } else {
            username = args[1];
        }
        
        if (!username) {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            resolve("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.");
            return;
        }

        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${api_key}&format=json&period=${timeframe}&limit=${100}`);

        if (response.data.error) {
            if (response.data.error == 6) {
                resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
                return;
            } else {
                reject(response.data.message);
                return;
            }
        }

        let albums = response.data.topalbums.album;
        let attr = response.data.topalbums["@attr"];
        let lf_user = attr.user;
        if (!albums || albums.length < 1) {
            resolve(`\\⚠ ${lf_user} hasn't listened to any Music.`);
            return;
        }

        let pages = [];
        let length = 0;
        let page = [];
        for (i=0; i < albums.length; i++) {
            let album = albums[i];

            let plays_plural = "Plays"
            if (album.playcount === "1") plays_plural = "Play";

            let row = `${i + 1}. ${album.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${album.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(album.artist.name).replace(/\)/g, "\\)")}/${encodeURIComponent(album.name).replace(/\)/g, "\\)")}) (${album.playcount} ${plays_plural})`
            if (length + (row.length + 1) > 2048 || page.length > 19) { // + 1 = line break
                pages.push(page.join("\n"));
                page = [row];
                length = row.length + 1;
            } else {
                page.push(row);
                length += row.length + 1;
            }
        }
        pages.push(page.join("\n"));

        let album_thumbnail = albums[0].image[2]["#text"];
        if (!album_thumbnail) {
            album_thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
        }

        let posessive;
        if (lf_user[lf_user.length - 1].toLowerCase() == "s") {
            posessive = "'";
        } else {
            posessive = "'s";
        }
        let embed = new discord.RichEmbed()
            .setAuthor(`${lf_user}${posessive} Top Albums`,`https://i.imgur.com/LZmYwDG.png`, `https://www.last.fm/user/${lf_user}/library/albums?date_preset=${date_preset}`)
            .setTitle(display_time)
            .setThumbnail(album_thumbnail)
            .setColor(0x2f8f5e);

        functions.embedPages(message, embed, pages, 600000);
        resolve();
        
    })
}

lf_top_tracks = async (message, args) => {
    return new Promise(async (resolve, reject) => {

        let time = getTimeFrame(args[0]);
        let timeframe = time.timeframe;
        let date_preset = time.date_preset;
        let display_time = time.display_time;
        let time_defaulted = time.defaulted;

        let username;
        if (time_defaulted) {
            username = args[0];
        } else {
            username = args[1];
        }
        
        if (!username) {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            resolve("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.");
            return;
        }

        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&api_key=${api_key}&format=json&period=${timeframe}&limit=${100}`);

        if (response.data.error) {
            if (response.data.error == 6) {
                resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
                return;
            } else {
                reject(response.data.message);
                return;
            }
        }

        let tracks = response.data.toptracks.track;
        let attr = response.data.toptracks["@attr"];
        let lf_user = attr.user;
        if (!tracks || tracks.length < 1) {
            resolve(`\\⚠ ${lf_user} hasn't listened to any Music.`);
            return;
        }

        let pages = [];
        let length = 0;
        let page = [];
        for (i=0; i < tracks.length; i++) {
            let track = tracks[i];

            let plays_plural = "Plays"
            if (track.playcount === "1") plays_plural = "Play";

            let row = `${i + 1}. ${track.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")} - [${track.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track.artist.name).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")}) (${track.playcount} ${plays_plural})`
            if (length + (row.length + 1) > 2048 || page.length > 19) { // + 1 = line break
                pages.push(page.join("\n"));
                page = [row];
                length = row.length + 1;
            } else {
                page.push(row);
                length += row.length + 1;
            }
        }
        pages.push(page.join("\n"));

        let track_thumbnail = tracks[0].image[2]["#text"];
        if (!track_thumbnail) {
            track_thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/4128a6eb29f94943c9d206c08e625904.png";
        }

        let posessive;
        if (lf_user[lf_user.length - 1].toLowerCase() == "s") {
            posessive = "'";
        } else {
            posessive = "'s";
        }
        let embed = new discord.RichEmbed()
            .setAuthor(`${lf_user}${posessive} Top Tracks`,`https://i.imgur.com/RFO9qp1.png`, `https://www.last.fm/user/${lf_user}/library/tracks?date_preset=${date_preset}`)
            .setTitle(display_time)
            .setThumbnail(track_thumbnail)
            .setColor(0x2b61fb);

        functions.embedPages(message, embed, pages, 600000);
        resolve();
        
    })
}

lf_profile = async (message, username) => {
    return new Promise(async (resolve, reject) => {
        if (!username) {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            resolve("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm profile <username>` to see the Last.fm profile of a specific user.");
            return;
        }

        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`)
        
        if (response.data.error) {
            if (response.data.error == 6) {
                resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
                return;
            } else {
                reject(response.data.message);
                return;
            }
        }

        let user = response.data.user;
        let thumbnail = user.image[2]["#text"];
        let image = user.image[user.image.length - 1]["#text"].replace("300x300/", "");

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

        let embed = new discord.RichEmbed()
            .setAuthor(`${user.name}`,`https://i.imgur.com/YbZ52lN.png`, url=`https://www.last.fm/user/${user.name}/`)
            .setColor(0xc1222a)
            .setFooter(`Total Scrobbles: ${user.playcount}`)
            .setThumbnail(thumbnail)
            .setURL(image)
            .setDescription(`Scrobbling since ${date_string}`)
            .setTimestamp(date)
            .addField(name="Library", value=`Artists: ${artist_count} | Albums: ${album_count} | Tracks: ${track_count}`);

        resolve({embed: embed});
    })
}

lf_youtube = async (message, username) => {
    return new Promise(async (resolve, reject) => {
        if (!username) {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            resolve("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fmyt <username>` to get a youtube video of the most recent song listened to by a specific user.");
            return;
        }
        axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=1`).then(response => {

            let track = response.data.recenttracks.track[0];
            let artist = track.artist["#text"];
            let title = track.name;
            let query = `${artist} - ${title}`;

            let status;
            if (track["@attr"] && track["@attr"].nowplaying == "true") {
                status = "Now Playing";
            } else {
                status = "Last Played";
            }
            youtube.query(query).then(video_link => {
                resolve(`${status}: ${video_link}`);
            })
        }).catch(error => {
            resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
        })
    })
}

lf_chart = async (message, args) => {
    return new Promise(async (resolve, reject) => {

        let artist_only = false;
        if (args[0] && ["artist", "artists"].includes(args[0].toLowerCase())) {
            args = args.slice(1);
            artist_only = true;
        }
        
        let time = getTimeFrame(args[0]);
        let timeframe = time.timeframe;

        let grid_dimension = args[1];

        if (!grids.includes(grid_dimension)) {
            grid_dimension = "3x3";
        }

        let lf_user = await database.get_lf_user(message.author.id);
        if (!lf_user) {
            resolve({content: "\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`", messageOptions: {}});
            return;
        }

        let response;
        if (artist_only) {
            response = {
                content: `**${lf_user}'s** ${timeframe} ${grid_dimension} artists chart:`, 
                messageOptions: {
                    file: {
                        attachment: `http://www.tapmusic.net/collage.php?user=${lf_user}&type=${timeframe}&size=${grid_dimension}&caption=true&playcount=true&artistonly=true`, 
                        name: "collage.jpg"
                    }
                }
            }
        } else {
            response = {
                content: `**${lf_user}**'s ${timeframe} ${grid_dimension} chart:`, 
                messageOptions: {
                    file: {
                        attachment: `http://www.tapmusic.net/collage.php?user=${lf_user}&type=${timeframe}&size=${grid_dimension}&caption=true&playcount=true`, 
                        name: "collage.jpg"
                    }
                }
            }
        }
        resolve(response);
    })
}

//--------------

discord_markdown_replace = (text) => {
    let chars = "()`*~_";
    for (i=0; i < chars.length; i++) {
        let char = chars[i]
        text = text.replace(char, `\\${char}`);
    }
    return text;
}

getTimeFrame = (timeframe) => {
    
    let display_time;
    let date_preset;
    let username;
    let defaulted = false;

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

    return({
        timeframe: timeframe,
        display_time: display_time,
        date_preset: date_preset,
        defaulted: defaulted
    })
}

getTimeAgo = (time) => {
    let currTime = Date.now() / 1000;
    let timeAgo;
    let timeAgoText;

    if (currTime - time < 60) {
        timeAgo = Math.floor(currTime - time);
        timeAgoText = `${timeAgo}sec ago`;
    } else if (currTime - time < 3600) {
        timeAgo = Math.floor((currTime - time) / 60);
        timeAgoText = `${timeAgo}min ago`;
    } else if (currTime - time < 86400) {
        timeAgo = Math.floor((currTime - time) / 3600);
        if (timeAgo < 2) {
            timeAgoText = `${timeAgo}hr ago`;
        } else {
            timeAgoText = `${timeAgo}hrs ago`;
        }
    } else if (currTime - time < 604800) {
        timeAgo = Math.floor((currTime - time) / 86400);
        if (timeAgo < 2) {
            timeAgoText = `${timeAgo}day ago`;
        } else {
            timeAgoText = `${timeAgo}days ago`;
        }
    } else {
        timeAgo = Math.floor((currTime - time) / 604800)
        if (timeAgo < 2) {
            timeAgoText = `${timeAgo}wk ago`;
        } else {
            timeAgoText = `${timeAgo}wks ago`;
        }
    }

    return timeAgoText;
}

module.exports = {
    handle: handle
}
