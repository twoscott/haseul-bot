// Require modules

const sql = require("sqlite3").verbose();
const db = new sql.Database('./haseul_data/instagram.db');

// Init

db.configure("busyTimeout", 10000);

db.run(`CREATE TABLE IF NOT EXISTS instaChannels (
    guildID TEXT NOT NULL,
    channelID TEXT NOT NULL,
    instaID TEXT NOT NULL,
    username TEXT NOT NUll,
    mentionRoleID TEXT,
    stories INT DEFAULT 1,
    UNIQUE(channelID, instaID)
)`);

db.run(`CREATE TABLE IF NOT EXISTS posts (
    instaID TEXT NOT NULL,
    postID TEXT NOT NULL PRIMARY KEY
)`);

db.run(`CREATE TABLE IF NOT EXISTS stories (
    instaID TEXT NOT NULL,
    storyID TEXT NOT NULL PRIMARY KEY,
    expiresOn INT NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS customImgs (
    imageID TEXT NOT NULL PRIMARY KEY,
    imageURL TEXT NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS customVids (
    vidID TEXT NOT NULL PRIMARY KEY,
    vidURL TEXT NOT NULL
)`);

// instagram channels

exports.add_insta_channel = (guild_id, channel_id, insta_id, username, mention_role) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM instaChannels WHERE instaID = ? AND channelID = ?", [insta_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                db.run("INSERT INTO instaChannels VALUES (?,?,?,?,?,1)", [guild_id, channel_id, insta_id, username, mention_role], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            } else {
                return resolve(false);
            }
        })
    })
}

exports.del_insta_channel = (channel_id, insta_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM instaChannels WHERE instaID = ? AND channelID = ?", [insta_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run("DELETE FROM instaChannels WHERE instaID = ? AND channelID = ?", [insta_id, channel_id], err => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            } else {
                return resolve(false);
            }
        })
    })
}

exports.get_guild_insta_channels = (guild_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM instaChannels WHERE guildID = ?", [guild_id], (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_insta_channels = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM instaChannels", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

// posts

exports.add_post = (insta_id, post_id) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR IGNORE INTO posts VALUES (? ,?)", [insta_id, post_id], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.get_account_posts = (insta_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM posts WHERE instaID = ?", insta_id, (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_posts = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM posts", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

// stories

exports.add_story = (insta_id, story_id, expires) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR IGNORE INTO stories VALUES (? ,?, ?)", [insta_id, story_id, expires], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.get_account_stories = (insta_id) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM stories WHERE instaID = ?", insta_id, (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.get_all_stories = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM stories", (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

exports.toggle_stories = (channel_id, insta_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM instaChannels WHERE instaID = ? AND channelID = ?", [insta_id, channel_id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                return resolve(null);
            } else {
                let tog = row.stories ^ 1;
                db.run("UPDATE instaChannels SET stories = ? WHERE instaID = ? AND channelID = ?", [tog, insta_id, channel_id], err => {
                    if (err) return reject(err);
                    return resolve(tog);
                })
            }
        })
    })
}

exports.clear_old_stories = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM stories", (err, rows) => {
            for (let row of rows) {
                if (row.expiresOn < (Date.now() / 1000)) {
                    db.run("DELETE FROM stories WHERE storyID = ?", [row.storyID], err => {
                        if (err) console.error(err);
                    })
                }
            }
            resolve();
        })
    })
}

// custom images

exports.add_custom_image = (id, url) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR IGNORE INTO customImgs VALUES (?, ?)", [id, url], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.get_custom_image_url = (id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT imageURL FROM customImgs WHERE imageID = ?", [id], (err, row) => {
            if (err) return reject(err);
            return resolve(row.imageURL);
        })
    })
}

// custom videos

exports.add_custom_video = (id, url) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR IGNORE INTO customVids VALUES (?, ?)", [id, url], err => {
            if (err) return reject(err);
            return resolve();
        })
    })
}

exports.get_custom_video_url = (id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT vidURL FROM customVids WHERE vidID = ?", [id], (err, row) => {
            if (err) return reject(err);
            return resolve(row.vidURL);
        })
    })
}
