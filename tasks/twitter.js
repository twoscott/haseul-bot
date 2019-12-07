// Import modules

const config = require("../config.json");
const Client = require("../haseul.js").Client;

const axios = require("axios");

const images = require("../functions/images.js");
const database = require("../db_queries/twitter_db.js");

// Consts

const twitter = axios.create({
    baseURL: 'https://api.twitter.com',
    timeout: 10000,
    headers: {'authorization': 'Bearer ' + config.twt_bearer}
})

// Task loop

exports.tasks = async function() {

    twitterLoop().catch(console.error);

}

// Task

async function twitterLoop() {

    let startTime = Date.now();

    console.log("Started checking Twitter at " + new Date(startTime).toUTCString());

    let channelNotifs = await database.get_all_twitter_channels();
    let twitterIDs = new Set(channelNotifs.map(x => x.twitterID));

    await (async () => {
        for (let twitterID of twitterIDs.values()) {
            
            let response;
            try {
                response = await twitter.get('/1.1/statuses/user_timeline.json', { params: {user_id: twitterID, count: 20, exclude_replies: 1, tweet_mode: 'extended'} })
            } catch(e) {
                console.error(twitterID + ' ' + Error(e));
                continue;
            }

            let recentTweets = response.data;
            if (!recentTweets) {
                console.error("couldn't resolve recent tweets for " + twitterID);
                continue;
            }

            let oldTweets = await database.get_account_tweets(twitterID);
            let oldTweetIDs = oldTweets.map(twt => twt.tweetID);

            let newTweets = recentTweets.filter(twt => !oldTweetIDs.includes(twt.id_str)).sort((a,b) => {
                // sort videos in date order
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
            let targetData = channelNotifs.filter(data => data.twitterID == twitterID);

            for (let tweet of newTweets) {

                let { retweeted_status, id_str, user } = tweet;
                
                // if (retweeted_status) tweet = retweeted_status;
                // let text = tweet.full_text || tweet.text;

                // if (text) {
                //     text = text
                //     .replace(/&apos;/g, "'")
                //     .replace(/&quot;/g, '"')
                //     .replace(/&gt;/g, '>')
                //     .replace(/&lt;/g, '<')
                //     .replace(/&amp;/g, '&')
                //     .replace(/([`\*~_<>])/g, "\\$&");
                // }

                // let options;
                // let embed = {
                //     author: {
                //         name: `${tweet.user.name} (@${tweet.user.screen_name})`,
                //         icon_url: tweet.user.profile_image_url_https,
                //         url: `https://twitter.com/${tweet.user.screen_name}/`
                //     },
                //     url: `https://twitter.com/${user.screen_name}/status/${id_str}/`,
                //     description: text,
                //     footer: { icon_url: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png', text: 'Twitter' },
                // }

                // if (tweet.extended_entities) {
                //     let { media } = tweet.extended_entities;
                //     if (media.length == 1) {
                //         switch (media[0].type) {
                //             case "video":
                //             case "animated_gif":
                //                 break;
                //             case "photo":
                //                 embed.description = text.split(RegExp('https://t.co/[a-zA-Z0-9]+$'), 1)[0];
                //                 embed.image = { url: media[0].media_url_https }
                //                 options = { embed };
                //                 break;
                //         }
                //     } else {
                //         let collage = await images.createMediaCollage(media.map(m => m.media_url_https), 800, 600);
                //         let files = [{attachment: collage, name: `${tweet.id_str}-media-collage.png`}];
                //         embed.image = { url: 'attachment://' + files[0].name};
                //         options = { embed, files };
                //     }
                // } else {
                //     options = { embed };
                // }

                await database.add_tweet(twitterID, id_str);

                for (let data of targetData) {
                    let { guildID, channelID, mentionRoleID, retweets } = data;

                    if (!retweets && retweeted_status) {
                        continue;
                    }

                    let guild = Client.guilds.get(guildID);
                    if (!guild) {
                        console.error(Error("Guild couldn't be retrieved to send Twitter notif to."));
                        continue;
                    }
                    let channel = Client.channels.get(channelID) || guild.channels.get(channelID);
                    if (!channel) {
                        console.error(Error("Channel couldn't be retrieved to send Twitter notif to."));
                        continue;
                    }

                    let message = `https://twitter.com/${user.screen_name}/status/${id_str}/${mentionRoleID ? ` <@&${mentionRoleID}>`:``}`;

                    channel.send(message/*, options*/).catch(console.error);
                }

            }

        }
    })().catch(console.error);

    console.log("Finished checking Twitter, took " + (Date.now() - startTime) / 1000 + "s");
    let requestLimitTime = ((1 / (99000/*100,000 requests per 24 hours max*// 24 / 60 / 60)) * twitterIDs.size) * 1000;
    let waitTime = Math.max(30000 - (Date.now() - startTime), requestLimitTime - (Date.now() - startTime), 0);
    setTimeout(twitterLoop, waitTime); // ensure runs every 30 secs unless processing time > 30 secs

}
