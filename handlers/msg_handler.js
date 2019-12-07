//Require modules

const client = require("../modules/client.js");
const commands = require("../modules/commands.js");
const emojis = require("../modules/emojis.js");
const instagram = require("../modules/instagram.js");
const lastfm = require("../modules/lastfm.js");
const levels = require("../modules/levels.js");
const media = require("../modules/media.js");
const misc = require("../modules/misc.js");
const moderation = require("../modules/moderation.js");
const notifications = require("../modules/notifications.js");
const patreon = require("../modules/patreon.js");
const profiles = require("../modules/profiles.js");
const reps = require("../modules/reps.js");
const roles = require("../modules/roles.js");
const servers = require("../modules/servers.js");
const twitter = require("../modules/twitter.js");
const users = require("../modules/users.js");
const utility = require("../modules/utility.js");
const vlive = require("../modules/vlive.js");

//Handle message

exports.handleMsg = (message) => {

    let { system, author, channel, content } = message

    if (system) return;
    if (author.bot) return;
    if (channel.type === "dm") return;

    let args = content.trim().split(/\s+/);

    //Pass message to modules
    client.msg(message, args);
    commands.msg(message, args);
    emojis.msg(message, args);
    instagram.msg(message, args);
    lastfm.msg(message, args);
    levels.msg(message, args);
    moderation.msg(message, args);
    media.msg(message, args);
    misc.msg(message, args);
    notifications.msg(message, args);
    patreon.msg(message, args);
    profiles.msg(message, args);
    reps.msg(message, args);
    roles.msg(message, args);
    servers.msg(message, args);
    twitter.msg(message, args);
    users.msg(message, args);
    utility.msg(message, args);
    vlive.msg(message, args);

}

