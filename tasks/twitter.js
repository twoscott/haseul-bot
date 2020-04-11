const config = require("../config.json");
const Client = require("../haseul.js").Client;

const axios = require("axios");

const images = require("../functions/images.js");
const database = require("../db_queries/twitter_db.js");

const twitter = axios.create({
    baseURL: 'https://api.twitter.com',
    timeout: 10000,
    headers: {'authorization': 'Bearer ' + config.twt_bearer}
})

exports.tasks = async function() {

    twitterLoop().catch(console.error);

}

async function twitterLoop() {

    let startTime = Date.now();

    console.log("Started checking Twitter at " + new Date(startTime).toUTCString());

    let channelNotifs = await database.getAllTwitterChannels();
    let twitterIDs = new Set(channelNotifs.map(x => x.twitterID));

    await (async () => {
        for (let twitterID of twitterIDs.values()) {
            
            let response;
            try {
                response = await twitter.get('/1.1/statuses/user_timeline.json', { params: {user_id: twitterID, count: 20, exclude_replies: 0, tweet_mode: 'extended'} })
            } catch(e) {
                console.error(twitterID + ' ' + Error(e));
                continue;
            }

            let recentTweets = response.data;
            if (!recentTweets) {
                console.error("couldn't resolve recent tweets for " + twitterID);
                continue;
            }

            let oldTweets = await database.getAccountTweets(twitterID);
            let oldTweetIDs = oldTweets.map(twt => twt.tweetID);

            let newTweets = recentTweets.filter(twt => !oldTweetIDs.includes(twt.id_str)).sort((a,b) => {
                // sort videos in date order
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
            let targetData = channelNotifs.filter(data => data.twitterID == twitterID);

            for (let tweet of newTweets) {

                let { retweeted_status, id_str, user } = tweet;
                await database.addTweet(twitterID, id_str);

                for (let data of targetData) {
                    let { guildID, channelID, mentionRoleID, retweets } = data;

                    if (!retweets && retweeted_status) {
                        continue;
                    }

                    let guild = Client.guilds.cache.get(guildID);
                    if (!guild) {
                        // console.log(`No guild found for ${guildID}, removing notification.`);
                        // database.removeTwitterChannel(channelID, twitterID);
                        // continue;
                        console.error(Error("Guild couldn't be retrieved to send Instagram notif to."));
                        continue;
                    }
                    let channel = Client.channels.cache.get(channelID) || guild.channels.cache.get(channelID);
                    if (!channel) {
                        // console.log(`No channel found for ${channelID} in ${guildID}, removing notification.`);
                        // database.removeTwitterChannel(channelID, twitterID);
                        // continue;
                        console.error(Error("Channel couldn't be retrieved to send Instagram notif to."));
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
