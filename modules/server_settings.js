//Require modules

const database = require("./server_database.js");
let servers = new Object();

//Init

init = async () => {
    let rows = await database.getServers();
    for (let i=0; i<rows.length; i++) {
        let row = rows[i];
        servers[row.guildID] = row;
    }
}

init();

//Functions

exports.get = async (guildID, setting) => {
    return servers[guildID] ? servers[guildID][setting] : undefined;
}

exports.set = async (guildID, setting, value) => {

    await database.setVal(guildID, setting, value)
    if (servers[guildID]) {
        servers[guildID][setting] = value;
    }
    else {
        servers[guildID] = await database.getServer(guildID);
    }

}

exports.toggle = async (guildID, toggle) => {

    let tog = await database.toggle(guildID, toggle)
    if (servers[guildID]) {
        servers[guildID][toggle] = tog;
    }
    else {
        servers[guildID] = await database.getServer(guildID);
    }
    return tog;

}