// Require modules

const database = require("../db_queries/server_db.js");
let servers = new Object();

// Init

async function init() {
    let rows = await database.getServers();
    for (let i=0; i<rows.length; i++) {
        let row = rows[i];
        servers[row.guildID] = row;
    }
}

init();

// Functions

exports.get = async function(guildID, setting) {
    return servers[guildID] ? servers[guildID][setting] : undefined;
}

exports.set = async function(guildID, setting, value) {

    await database.setVal(guildID, setting, value)
    if (servers[guildID]) {
        servers[guildID][setting] = value;
    }
    else {
        servers[guildID] = await database.getServer(guildID);
    }

}

exports.toggle = async function(guildID, toggle) {

    let tog = await database.toggle(guildID, toggle)
    if (servers[guildID]) {
        servers[guildID][toggle] = tog;
    }
    else {
        servers[guildID] = await database.getServer(guildID);
    }
    return tog;

}