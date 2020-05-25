const serverSettings = require("../utils/server_settings.js");
const inviteCache = require("../utils/invite_cache.js");

const presences = require("../tasks/presences.js");
const instagram = require("../tasks/instagram.js");
const twitter = require("../tasks/twitter.js");
const vlive = require("../tasks/vlive.js");

exports.handleTasks = async function() {
    
    console.log("Initialising modules...");
    serverSettings.ready();
    inviteCache.ready();

    console.log("Starting tasks...");
    presences.tasks();
    instagram.tasks();
    twitter.tasks();
    vlive.tasks();

}
