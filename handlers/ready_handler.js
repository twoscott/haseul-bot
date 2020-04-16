const serverSettings = require("../utils/server_settings.js");

const instagram = require("../tasks/instagram.js");
const twitter = require("../tasks/twitter.js");
const vlive = require("../tasks/vlive.js");

exports.handleTasks = async function() {
    
    console.log("Initialising modules...");
    serverSettings.ready();

    console.log("Starting tasks...");
    instagram.tasks();
    twitter.tasks();
    vlive.tasks();

}
