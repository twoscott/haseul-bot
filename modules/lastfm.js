//Require modules

const discord = require("discord.js");
const axios = require("axios")

const client = require("../haseul").client;
const database = require("../modules/lastfm_database");
const youtube = require("./youtube.js")

//Variables

const api_key = "KEY"

//Functions

discord_markdown_replace = (text) => {
    var chars = "()`*~_";
    for (i=0; i < chars.length; i++) {
        let char = chars[i]
        text = text.replace(char, `\\${char}`);
    }
    return text;
}

//--------

handle = async (message) => {

    var args = message.content.trim().split(" ");

    //Handle commands

    switch (args[0]) {

        case ".fm":
            switch (args[1]) {

                case "set":
                    message.channel.startTyping();
                    set_lf_user(message, args.slice(2)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;

                case "remove":
                case "delete":
                case "del":
                    message.channel.startTyping();
                    remove_lf_user(message).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;

                case "recent":
                case "recents":
                case "nowplaying":
                case "np":
                    message.channel.startTyping();
                    lf_recents(message, args.slice(2)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;
                
                case "profile":
                    message.channel.startTyping();
                    lf_profile(message, args.slice(2)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;

                default:
                    message.channel.startTyping();
                    lf_recents(message, args.slice(1)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping(true);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;
            }
            break;
        
        case ".fmyt":
            message.channel.startTyping();
            lf_youtube(message, args.slice(1)).then(response => {
                message.channel.send(response);
                message.channel.stopTyping(true);
            }).catch(error => {
                console.error(error);
            })
            break; 
        
        case ".chart":
            message.channel.startTyping();
            lf_chart(message, args.slice(1)).then(response => {
                message.channel.send(response.content, response.messageOptions).then(reply => {
                    message.channel.stopTyping(true);
                })
            }).catch(error => {
                console.error(error);
            })
            break;

    }
}

set_lf_user = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 1) {
            resolve("\\⚠ Please provide a Last.fm username: `.fm set <username>`.");
            return;
        }
        var username = args.join(" ").trim();
    
        axios.get(`https://www.last.fm/user/${username}`).then(response => {
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

lf_recents = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        var username;
        if (args.length > 0) {
            username = args.join(" ");
        } else {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            message.channel.send("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.");
            return;
        }
        axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURI(username)}&api_key=${api_key}&format=json&limit=2`).then(response => {
            var tracks = response.data.recenttracks.track;
            var attr = response.data.recenttracks["@attr"];
            var lf_user = attr.user;
            if (!tracks || tracks.length < 1) {
                resolve(`\\⚠ ${lf_user} hasn't listened to any Music.`);
                return;
            }

            var track1 = tracks[0];
            var track2 = tracks[1];
            var total_scrobbles = attr.total;
            var album_thumbnail = track1.image[2]["#text"];
            var album_image = track1.image[track1.image.length - 1]["#text"].replace("300x300/", "");

            var nowplaying;
            if (track1["@attr"] && track1["@attr"].nowplaying == "true") {
                nowplaying = true;
                track1.status = "Now Playing";
            } else {
                nowplaying = false;
                track1.status = "Last Played";
            }

            if (!track2) {
                track2 = {
                    artist: {
                        "#text": "Null"
                    },
                    album: {
                        "#text": "Null" 
                    },
                    name: "Null"
                }
            }

            if (!album_thumbnail || album_thumbnail.length < 1) {
                album_thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
            }
            if (!album_image || album_image.length < 1) {
                album_image = "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
            }

            var embed = new discord.RichEmbed()
                .setAuthor(name=`>Recent tracks for ${lf_user}`, icon=`https://i.imgur.com/YbZ52lN.png`, url=`https://www.last.fm/user/${lf_user}/`)
                .setColor(0xc1222a)
                .setFooter(`Total Scrobbles: ${total_scrobbles}`)
                .setThumbnail(album_thumbnail)
                .setURL(album_image)
                .addField(name=`${track1.status}`, value=`${discord_markdown_replace(track1.artist["#text"])} - ${discord_markdown_replace(track1.name)} | **${discord_markdown_replace(track1.album["#text"])}**`, inline=false)
                .addField(name=`Previous Track`, value=`${discord_markdown_replace(track2.artist["#text"])} - ${discord_markdown_replace(track2.name)} | **${discord_markdown_replace(track2.album["#text"])}**`, inline=false);

            if (!nowplaying && track1.date) {
                embed.setTimestamp(new Date(0).setSeconds(parseInt(track1.date.uts)));
            } else if (nowplaying) {
                embed.setTimestamp(Date.now());
            }
            resolve({embed: embed})

        }).catch(error => {
            resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
        })
    })
}

lf_profile = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        var username;
        if (args.length > 0) {
            username = args.join(" ");
        } else {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            message.channel.send("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm profile <username>` to see the Last.fm profile of a specific user.");
            return;
        }

        try {
            var response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURI(username)}&api_key=${api_key}&format=json`)
        } catch (error) {
            resolve(`\\⚠ ${username} is not a valid Last.fm user.`);
            console.error(error);
        }

        var user = response.data.user;
        var thumbnail = user.image[2]["#text"];
        var image = user.image[user.image.length - 1]["#text"].replace("300x300/", "");

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var date = new Date(0);
        date.setSeconds(user.registered.unixtime);

        var date_string = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

        var response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&api_key=${api_key}&format=json`)
        var artist_count = response.data.topartists["@attr"].total;

        var response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${api_key}&format=json`)
        var album_count = response.data.topalbums["@attr"].total;

        var response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&api_key=${api_key}&format=json`)
        var track_count = response.data.toptracks["@attr"].total;

        var embed = new discord.RichEmbed()
            .setAuthor(`>${user.name}`, icon=`https://i.imgur.com/YbZ52lN.png`, url=`https://www.last.fm/user/${user.name}/`)
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

lf_youtube = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        var username;
        if (args.length > 0) {
            username = args.join(" ");
        } else {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            message.channel.send("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fmyt <username>` to get a youtube video of the most recent song listened to by a specific user.");
            return;
        }
        axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURI(username)}&api_key=${api_key}&format=json&limit=1`).then(response => {

            var track = response.data.recenttracks.track[0];
            var artist = track.artist["#text"];
            var title = track.name;
            var query = `${artist} - ${title}`;

            var status;
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
        let week = ["7", "7days", "weekly", "week", "1week"];
        let month = ["30", "30day", "30days", "monthly", "month"];
        let three_month = ["90", "90day", "90days", "3months", "3month"];
        let six_month = ["180", "180day", "180days", "6months", "6month"];
        let year = ["365", "365day", "365days", "1year", "year", "yr", "12months", "yearly"];
        let overall = ["all", "alltime", "forever", "overall"];
        let grids = ["3x3", "4x4", "5x5"];

        var artist_only = false;
        if (args[0] && ["artist", "artists"].includes(args[0].toLowerCase())) {
            args = args.slice(1);
            artist_only = true;
        }
        
        var timeframe = args[0];
        var grid_dimension = args[1];

        switch (true) {
            case week.includes(timeframe):
                timeframe = "7day";
                break;
            case month.includes(timeframe):
                timeframe = "1month";
                break;
            case three_month.includes(timeframe):
                timeframe = "3month";
                break;
            case six_month.includes(timeframe):
                timeframe = "6month";
                break;
            case year.includes(timeframe):
                timeframe = "12month";
                break;
            case overall.includes(timeframe):
                timeframe = "overall";
                break;
            default:
                timeframe = "7day";
                break;
        }

        if (!grids.includes(grid_dimension)) {
            grid_dimension = "3x3";
        }

        let lf_user = await database.get_lf_user(message.author.id);
        if (!lf_user) {
            message.channel.send("\\⚠ No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`");
            return;
        }

        var response;
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
                content: `**${lf_user}'s** ${timeframe} ${grid_dimension} chart:`, 
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

module.exports = {
    handle: handle
}
