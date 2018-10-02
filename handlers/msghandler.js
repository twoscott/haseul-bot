const discord = require("discord.js");
const client = require("../haseul").client;

    
//Require modules

const roles = require("../modules/roles.js");
const lastfm = require("../modules/lastfm.js");
const youtube = require("../modules/youtube.js");

//Handle message

exports.handle = (message) => {

    if (message.system) return;
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    //Pass message to modules

    roles.handle(message);
    lastfm.handle(message);
    youtube.handle(message);
    
}
