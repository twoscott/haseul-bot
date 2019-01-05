//Require modules

const roles = require("../modules/roles.js");
const lastfm = require("../modules/lastfm.js");
const youtube = require("../modules/youtube.js");
const utility = require("../modules/utility.js");
const moderation = require("../modules/moderation.js");
const notifications = require("../modules/notifications.js");

//Handle message

exports.handle = (message) => {

    let { system, author, channel, content } = message

    if (system) return;
    if (author.bot) return;
    if (channel.type === "dm") return;

    let args = content.replace(/\s{2,}/gi, ' ').trim().split(' ');

    //Pass message to modules

    roles.handle(message, args);
    lastfm.handle(message, args);
    youtube.handle(message, args);
    utility.handle(message, args);
    moderation.handle(message, args);
    notifications.handle(message, args);

}
