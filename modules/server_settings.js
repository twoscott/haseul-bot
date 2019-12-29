const { Client } = require("../haseul.js");

const database = require("../db_queries/server_db.js");

let servers = new Object();

exports.ready = async function() {
    for (let guild of Client.guilds.array()) {
        await database.initServer(guild.id);
    }

    let rows = await database.getServers();
    for (row of rows) {
        servers[row.guildID] = row;
    }
}

exports.newGuild = async function(guild) {
    await database.initServer(guild.id);
    let row = await database.getServer(guild.id);
    servers[row.guildID] = row;
}

exports.get = function(guildID, setting) {
    return servers[guildID] ? servers[guildID][setting] : null;
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
