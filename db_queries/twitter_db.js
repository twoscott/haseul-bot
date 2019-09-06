// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/twitter.db');

// Init

db.configure("busyTimeout", 10000);

db.run(`CREATE TABLE IF NOT EXISTS twitterChannels (
    guildID TEXT NOT NULL,
    channelID TEXT NOT NULL,
    twitterID TEXT NOT NULL,
    screenName TEXT NOT NUll,
    mentionRoleID TEXT,
    retweets DEFAULT 1,
    UNIQUE(channelID, twitterID)
)`);

db.run(`CREATE TABLE IF NOT EXISTS tweets (
    twitterID TEXT NOT NULL,
    tweetID TEXT NOT NULL PRIMARY KEY
)`);

// twitter channels

exports.add_twitter_channel = (guild_id, channel_id, twitter_id, screen_name, mention_role) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM twitterChannels WHERE twitterID = ? AND channelID = ?", [twitter_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                db.run("INSERT INTO twitterChannels VALUES (?,?,?,?,?,1)", [guild_id, channel_id, twitter_id, screen_name, mention_role], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            } else {
                return resolve(false);
            }
        })
    })
}

exports.del_twitter_channel = (channel_id, twitter_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM twitterChannels WHERE twitterID = ? AND channelID = ?", [twitter_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run("DELETE FROM twitterChannels WHERE twitterID = ? AND channelID = ?", [twitter_id, channel_id], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            } else {
                return resolve(false);
            }
        })
    })
}

exports.get_guild_twitter_channels = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM twitterChannels WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_twitter_channels = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM twitterChannels", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.toggle_retweets = (channel_id, twitter_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM twitterChannels WHERE twitterID = ? AND channelID = ?", [twitter_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                return resolve(null);
            } else {
                let tog = row.retweets ^ 1;
                db.run("UPDATE twitterChannels SET retweets = ? WHERE twitterID = ? AND channelID = ?", [tog, twitter_id, channel_id], err => {
                    if (err) return reject(err);
                    return resolve(tog);
                })
            }
        })
    })
}

// tweets

exports.add_tweet = (twitter_id, tweet_id) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR IGNORE INTO tweets VALUES (? ,?)", [twitter_id, tweet_id], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.get_account_tweets = (twitter_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tweets WHERE twitterID = ?", twitter_id, (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_tweets = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tweets", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}
