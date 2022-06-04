const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const SQL = require('sql-template-strings');
const dbopen = sqlite.open({
    filename: './haseul_data/vlive.db',
    driver: sqlite3.Database,
});

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS channelArchive(
            channelCode TEXT NOT NULL PRIMARY KEY,
            channelName TEXT NOT NULL,
            channelPlusType TEXT
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS vliveChannels(
            guildID TEXT NOT NULL,
            discordChanID TEXT NOT NULL,
            channelSeq INT NOT NULL,
            channelCode TEXT NOT NULL,
            channelName TEXT NOT NULL,
            mentionRoleID TEXT,
            VPICK INT NOT NULL DEFAULT 1,
            UNIQUE(discordChanID, ChannelSeq)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS vliveVideos(
            videoSeq INT NOT NULL,
            channelSeq INT NOT NULL,
            UNIQUE(videoSeq, ChannelSeq)
        )
    `);
});

exports.updateArchiveChannel = async function(
    channelCode, channelName, channelPlusType) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        INSERT INTO channelArchive
        VALUES (${channelCode}, ${channelName}, ${channelPlusType})
        ON CONFLICT (channelCode) DO
        UPDATE SET channelName = ${channelName}, channelPlusType = ${channelPlusType}
    `);
    return statement.changes;
};

exports.getChannelArchive = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM channelArchive`);
    return rows;
};

exports.addVliveChannel = async function(
    guildID,
    discordChanID,
    channelSeq,
    channelCode,
    channelName,
    mentionRoleID) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        INSERT OR IGNORE 
        INTO vliveChannels (guildID, discordChanID, channelSeq, channelCode, channelName, mentionRoleID)
        VALUES (${guildID}, ${discordChanID}, ${channelSeq}, ${channelCode}, ${channelName}, ${mentionRoleID})
    `);
    return statement.changes;
};

exports.removeVliveChannel = async function(discordChanID, channelSeq) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        DELETE FROM vliveChannels
        WHERE discordChanID = ${discordChanID} AND channelSeq = ${channelSeq}
    `);
    return statement.changes;
};

exports.getVliveChannel = async function(discordChanID, channelSeq) {
    const db = await dbopen;

    const row = await db.get(SQL`
        SELECT * FROM vliveChannels 
        WHERE discordChanID = ${discordChanID} AND channelSeq = ${channelSeq}
    `);
    return row;
};

exports.getGuildVliveChannels = async function(guildID) {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM vliveChannels WHERE guildID = ${guildID}`);
    return rows;
};

exports.getAllVliveChannels = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM vliveChannels`);
    return rows;
};

exports.toggleVpick = async function(discordChanID, channelSeq) {
    const db = await dbopen;

    const statement = await db.run(SQL`
        UPDATE OR IGNORE vliveChannels 
        SET VPICK = ~VPICK & 1 
        WHERE discordChanID = ${discordChanID} AND channelSeq = ${channelSeq}
    `);

    let toggle = 0;
    if (statement.changes) {
        const row = await db.get(SQL`SELECT VPICK FROM vliveChannels WHERE discordChanID = ${discordChanID} AND channelSeq = ${channelSeq}`);
        toggle = row ? row.VPICK : 0;
    }
    return toggle;
};

exports.addVideo = async function(videoSeq, channelSeq) {
    const db = await dbopen;

    const statement = await db.run(SQL`INSERT OR IGNORE INTO vliveVideos VALUES (${videoSeq}, ${channelSeq})`);
    return statement.changes;
};

exports.getChannelVliveVideos = async function(channelSeq) {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM vliveVideos WHERE channelSeq = ${channelSeq}`);
    return rows;
};

exports.getAllVliveVideos = async function() {
    const db = await dbopen;

    const rows = await db.all(SQL`SELECT * FROM vliveVideos`);
    return rows;
};
