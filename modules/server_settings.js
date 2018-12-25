//Require modules

const discord = require("discord.js");
const client = require("../haseul").client;
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

exports.getSetting = async (guildID, setting) => {
    return servers[guildID] ? servers[guildID][setting] : undefined;
}

exports.setSetting = async (guildID, setting, value) => {
    return new Promise(async (resolve, reject) => {
        database.setVal(guildID, setting, value).then(async () => {
            if (servers[guildID]) {
                servers[guildID][setting] = value;
            }
            else {
                servers[guildID] = await database.getServer(guildID);
            }
            resolve();
        }).catch(err => {
            reject(err);
        })
    })
}

exports.toggle = async (guildID, toggle) => {
    return new Promise(async (resolve, reject) => {
        database.toggle(guildID, toggle).then(async tog => {
            if (servers[guildID]) {
                servers[guildID][toggle] = tog;
            }
            else {
                servers[guildID] = await database.getServer(guildID);
            }
            resolve(tog);
        }).catch(err => {
            reject(err);
        })
    })
}