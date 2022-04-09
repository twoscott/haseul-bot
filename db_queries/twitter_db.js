const sqlite = require('sqlite');
const SQL = require('sql-template-strings');
const dbopen = sqlite.open('./haseul_data/twitter.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS twitterChannels(
            guildID TEXT NOT NULL,
            channelID TEXT NOT NULL,
            twitterID TEXT NOT NULL,
            screenName TEXT NOT NUll,
            mentionRoleID TEXT,
            retweets DEFAULT 1,
            UNIQUE(channelID, twitterID)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS tweets(
            twitterID TEXT NOT NULL,
            tweetID TEXT NOT NULL PRIMARY KEY
        )
    `);
});

exports.addTwitterChannel = async function(
    guildID, channelID, twitterID, screenName, mentionRole) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        INSERT OR IGNORE 
        INTO twitterChannels (guildID, channelID, twitterID, screenName, mentionRoleID) 
        VALUES (${guildID}, ${channelID}, ${twitterID}, ${screenName}, ${mentionRole})
    `);
    return statement.changes;
};

exports.removeTwitterChannel = async function(channelID, twitterID) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        DELETE FROM twitterChannels 
        WHERE channelID = ${channelID} AND twitterID = ${twitterID}
    `);
    return statement.changes;
};

exports.getTwitterChannel = async function(channelID, twitterID) {
    const db = await dbopen;

    const row = await db.get(SQL`
        SELECT * FROM twitterChannels
        WHERE channelID = ${channelID} AND twitterID = ${twitterID}
    `);
    return row;
};

exports.getGuildTwitterChannels = async function(guildID) {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM twitterChannels WHERE guildID = ${guildID}`);
    return rows;
};

exports.getAllTwitterChannels = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM twitterChannels`);
    return rows;
};

exports.toggleRetweets = async function(channelID, twitterID) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        UPDATE OR IGNORE twitterChannels 
        SET retweets = ~retweets & 1 
        WHERE channelID = ${channelID} AND twitterID = ${twitterID}
    `);

    let toggle = 0;
    if (statement.changes) {
        const row = await db.get(SQL`SELECT retweets FROM twitterChannels WHERE channelID = ${channelID} AND twitterID = ${twitterID}`);
        toggle = row ? row.retweets : 0;
    }
    return toggle;
};

exports.addTweet = async function(twitterID, tweetID) {
    const db = await dbopen;

    const statement = await db.run(SQL`INSERT OR IGNORE INTO tweets VALUES (${twitterID}, ${tweetID})`);
    return statement.changes;
};

exports.getAccountTweets = async function(twitterID) {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM tweets WHERE twitterID = ${twitterID}`);
    return rows;
};

exports.getAllTweets = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM tweets`);
    return rows;
};
