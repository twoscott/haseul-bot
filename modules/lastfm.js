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
                    set_lf_user(message, args).then(response => {
                        message.channel.send(response);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;

                case "remove":
                case "delete":
                case "del":
                    remove_lf_user(message).then(response => {
                        message.channel.send(response);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;

                case "recent":
                case "recents":
                case "nowplaying":
                case "np":
                    lf_recents(message, args.slice(1)).then(response => {
                        message.channel.send(response);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;

                default:
                    lf_recents(message, args).then(response => {
                        message.channel.send(response);
                    }).catch(error => {
                        console.error(error);
                    })
                    break;
            }
            break;
        
        case ".fmyt":
            lf_youtube(message, args).then(response => {
                message.channel.send(response);
            }).catch(error => {
                console.error(error);
            })
            

    }
}

set_lf_user = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 3) {
            resolve("Error: Please provide a Last.fm username: `.fm set <username>`.");
            return;
        }
        var username = args.slice(2).join(" ").trim();
    
        axios.get(`https://www.last.fm/user/${username}`).then(response => {
            database.set_lf_user(message.author.id, username).then(response => {
                resolve(response);
            })
    
        }).catch(error => {
            if (error.response.status === 404) {
                resolve(`Error: "${username}" is an invalid username.`)
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

lf_youtube = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        var username;
        if (args.length > 1) {
            username = args.slice(1).join(" ");
        } else {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            message.channel.send("Error: No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fmyt <username>` to get a youtube video of the most recent song listened to by a specific user.");
            return;
        }
        axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${api_key}&format=json&limit=1`).then(response => {
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
            reject(error);
        })
    })
}

lf_recents = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        var username;
        if (args.length > 1) {
            username = args.slice(1).join(" ");
        } else {
            username = await database.get_lf_user(message.author.id);
        }
        if (!username) {
            message.channel.send("Error: No Last.fm username linked to your account. Please link a username to your account using `.fm set <username>`, alternatively, use `.fm <username>` to get recent tracks for a specific Last.fm user.");
            return;
        }
        axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${api_key}&format=json&limit=2`).then(response => {
            var tracks = response.data.recenttracks.track;
            var attr = response.data.recenttracks["@attr"];
            var track1 = tracks[0];
            var track2 = tracks[1];
            var lf_user = attr.user;
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

            var embed = new discord.RichEmbed()
                .setAuthor(name=`>Recent tracks for ${lf_user}`, icon=`https://i.imgur.com/YbZ52lN.png`, url=`https://www.last.fm/user/${lf_user}/`)
                .setColor(0xc1222a)
                .setFooter(`Total Scrobbles: ${total_scrobbles}`)
                .setThumbnail(album_thumbnail)
                .setURL(album_thumbnail)
                .addField(name=`${track1.status}`, value=`${discord_markdown_replace(track1.artist["#text"])} - ${discord_markdown_replace(track1.name)} | **${discord_markdown_replace(track1.album["#text"])}**`, inline=false)
                .addField(name=`Previous Track`, value=`${discord_markdown_replace(track2.artist["#text"])} - ${discord_markdown_replace(track2.name)} | **${discord_markdown_replace(track2.album["#text"])}**`, inline=false);

            if (!nowplaying && track1.date) {
                embed.setTimestamp(new Date(0).setSeconds(parseInt(track1.date.uts)));
            } else if (nowplaying) {
                embed.setTimestamp(Date.now());
            }

            resolve({embed: embed})
        }).catch(error => {
            reject(error);
        })
    })
}

module.exports = {
    handle: handle
}
