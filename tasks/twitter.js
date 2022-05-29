const config = require('../config.json');
const Client = require('../haseul.js').Client;

const axios = require('axios');

const database = require('../db_queries/twitter_db.js');

const twitter = axios.create({
    baseURL: 'https://api.twitter.com',
    timeout: 10000,
    headers: { 'authorization': 'Bearer ' + config.twt_bearer },
});

exports.tasks = async function() {
    twitterLoop().catch(console.error);
};

async function twitterLoop() {
    const startTime = Date.now();

    console.log('Started checking Twitter at ' + new Date(startTime).toUTCString());

    const channelNotifs = await database.getAllTwitterChannels();
    const twitterIDs = new Set(channelNotifs.map(x => x.twitterID));

    await (async () => {
        for (const twitterID of twitterIDs.values()) {
            let response;
            try {
                response = await twitter.get('/1.1/statuses/user_timeline.json', { params: { user_id: twitterID, count: 20, exclude_replies: 0, tweet_mode: 'extended' } });
            } catch (e) {
                continue;
            }

            const recentTweets = response.data;
            if (!recentTweets) {
                continue;
            }

            const oldTweets = await database.getAccountTweets(twitterID);
            const oldTweetIDs = oldTweets.map(twt => twt.tweetID);

            const newTweets = recentTweets
                .filter(twt => !oldTweetIDs.includes(twt.id_str)).sort((a, b) =>
                    // sort videos in date order
                    new Date(a.created_at)
                        .getTime() - new Date(b.created_at).getTime(),
                );
            const targetData = channelNotifs
                .filter(data => data.twitterID == twitterID);

            for (const tweet of newTweets) {
                const {
                    retweeted_status: retweetStatus,
                    id_str: idString, user,
                } = tweet;
                await database.addTweet(twitterID, idString);

                for (const data of targetData) {
                    const {
                        guildID,
                        channelID,
                        mentionRoleID,
                        retweets,
                    } = data;

                    if (!retweets && retweetStatus) {
                        continue;
                    }

                    const guild = Client.guilds.cache.get(guildID);
                    if (!guild) {
                        continue;
                    }
                    const channel = Client.channels.cache.get(channelID) ||
                        guild.channels.cache.get(channelID);
                    if (!channel) {
                        continue;
                    }

                    const message = `https://twitter.com/${user.screen_name}/status/${idString}${mentionRoleID ? ` <@&${mentionRoleID}>`:''}`;

                    channel.send(message).catch(err => {});
                }
            }
        }
    })().catch(console.error);

    console.log('Finished checking Twitter, took ' + (Date.now() - startTime) / 1000 + 's');

    /* 100,000 requests per 24 hours max*/
    const requestLimitTime = (
        (1 / (99000/ 24 / 60 / 60)) * twitterIDs.size
    ) * 1000;

    const waitTime = Math.max(
        30000 - (Date.now() - startTime),
        requestLimitTime - (Date.now() - startTime),
        0);

    // ensure runs every 30 secs unless processing time > 30 secs
    setTimeout(twitterLoop, waitTime);
}
