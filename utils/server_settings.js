const { Client } = require("../haseul.js");

const database = require("../db_queries/server_db.js");

let servers = new Object();

exports.template = {
    "guildID": { name: "Guild ID", type: "ID" },
    "prefix": { name: "Prefix", type: "text" },
    "autoroleOn": { name: "Autorole Toggle", type: "toggle" },
    "autoroleID": { name: "Autorole", type: "role" },
    "commandsOn": { name: "Commands Toggle", type: "toggle" },
    "pollOn": { name: "Poll Toggle", type: "toggle" },
    "joinLogsOn": { name: "Member Logs Toggle", type: "toggle" },
    "joinLogsChan": { name: "Member Logs Channel", type: "channel" },
    "msgLogsOn": { name: "Message Logs Toggle", type: "toggle" },
    "msgLogsChan": { name: "Message Logs Channel", type: "channel" },
    "welcomeOn": { name: "Welcome Toggle", type: "toggle" },
    "welcomeChan": { name: "Welcome Channel", type: "channel" },
    "welcomeMsg": { name: "Welcome Message", type: "text" },
    "rolesOn": { name: "Roles Toggle", type: "toggle" },
    "rolesChannel": { name: "Roles Channel", type: "channel" },
    "muteroleID": { name: "Mute Role", type: "role" },
}

exports.ready = async function() {
    for (let guild of Client.guilds.cache.array()) {
        await database.initServer(guild.id);
    }

    let rows = await database.getServers();
    for (row of rows) {
        servers[row.guildID] = row;
    }
}

exports.newGuild = async function(guildID) {
    await database.initServer(guildID);
    let row = await database.getServer(guildID);
    servers[row.guildID] = row;
}

exports.get = function(guildID, setting) {
    return servers[guildID] ? servers[guildID][setting] : null;
}

exports.getServer = function(guildID) {
    return servers[guildID];
}

exports.set = async function(guildID, setting, value) {

    await database.setVal(guildID, setting, value)
    if (servers[guildID]) {
        servers[guildID][setting] = value;
    } else {
        servers[guildID] = await database.getServer(guildID);
    }

}

exports.toggle = async function(guildID, toggle) {

    let tog = await database.toggle(guildID, toggle)
    if (servers[guildID]) {
        servers[guildID][toggle] = tog;
    } else {
        servers[guildID] = await database.getServer(guildID);
    }
    return tog;

}
