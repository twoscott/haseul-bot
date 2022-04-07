const sqlite = require("sqlite");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open('./haseul_data/instagram.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS instaChannels(
            guildID TEXT NOT NULL,
            channelID TEXT NOT NULL,
            instaID TEXT NOT NULL,
            username TEXT NOT NUll,
            mentionRoleID TEXT,
            stories INT DEFAULT 1,
            UNIQUE(channelID, instaID)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS posts(
            instaID TEXT NOT NULL,
            postID TEXT NOT NULL PRIMARY KEY
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS stories(
            instaID TEXT NOT NULL,
            storyID TEXT NOT NULL PRIMARY KEY,
            expiresOn INT NOT NULL
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS customImgs(
            imageID TEXT NOT NULL PRIMARY KEY,
            imageURL TEXT NOT NULL
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS customVids(
            vidID TEXT NOT NULL PRIMARY KEY,
            vidURL TEXT NOT NULL
        )
    `);
})

exports.addInstaChannel = async function(guildID, channelID, instaID, username, mentionRoleID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE 
        INTO instaChannels (guildID, channelID, instaID, username, mentionRoleID)
        VALUES (${guildID}, ${channelID}, ${instaID}, ${username}, ${mentionRoleID})
    `);
    return statement.changes;
}

exports.removeInstaChannel = async function(channelID, instaID) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM instaChannels WHERE channelID = ${channelID} AND instaID = ${instaID} `);
    return statement.changes;
}

exports.getInstaChannel = async function(channelID, instaID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT * FROM instaChannels WHERE channelID = ${channelID} AND instaID = ${instaID}`);
    return row;
}

exports.getGuildInstaChannels = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM instaChannels WHERE guildID = ${guildID}`);
    return rows;
}

exports.getAllInstaChannels = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM instaChannels`);
    return rows;
}

exports.addPost = async function(instaID, postID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO posts VALUES (${instaID}, ${postID})`);
    return statement.changes;
}

exports.getAccountPosts = async function(instaID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts WHERE instaID = ${instaID}`);
    return rows;
}

exports.getAllPosts = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts`);
    return rows;
}

exports.addStory = async function(instaID, storyID, expires) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO stories VALUES (${instaID}, ${storyID}, ${expires})`);
    return statement.changes;
}

exports.getAccountStories = async function(instaID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM stories WHERE instaID = ${instaID}`);
    return rows;
}

exports.getAllStories = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM stories`);
    return rows;
}

exports.toggleStories = async function(channelID, instaID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        UPDATE OR IGNORE instaChannels 
        SET stories = ~stories & 1 
        WHERE instaID = ${instaID} AND channelID = ${channelID}
    `);

    let toggle = 0;
    if (statement.changes) {
        let row = await db.get(SQL`SELECT stories FROM instaChannels WHERE channelID = ${channelID} AND instaID = ${instaID}`);
        toggle = row ? row.stories : 0;
    }
    return toggle;
}

exports.clearOldStories = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM stories`);
    for (let row of rows) {
        if (row.expiresOn < (Date.now() / 1000)) {
            db.run(SQL`DELETE FROM stories WHERE storyID = ${row.storyID}`);
        }
    }
}

exports.addCustomImage = async function(id, url) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO customImgs VALUES (${id}, ${url})`);
    return statement.changes;
}

exports.getCustomImageUrl = async function(id) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT imageURL FROM customImgs WHERE imageID = ${id}`);
    return row ? row.imageURL : null;
}   

exports.addCustomVideo = async function(id, url) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO customVids VALUES (${id}, ${url})`);
    return statement.changes;
}

exports.getCustomVideoUrl = async function(id) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT vidURL FROM customVids WHERE vidID = ${id}`);
    return row ? row.vidURL : null;
}
