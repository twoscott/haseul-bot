const { Client } = require("../haseul.js");
const clientSettings = require("../utils/client_settings.js");

exports.tasks = async function() {

    setInterval(async function() {

        let startTime = Date.now();
        console.log("Started sweeping old messages at " + new Date(startTime).toUTCString());
        
        Client.sweepMessages();
        let whitelistChannelID = clientSettings.get("whitelistChan");
        if (whitelistChannelID) {
            console.log("Re-caching whitelist channel messages...");
            let whitelistChannel = await Client.channels.fetch(whitelistChannelID);
            whitelistChannel.messages.fetch({ limit: 100 }, true); // cache whitelist channel messages while still sweeping messages
        }

        console.log("Finished sweeping old messages, took " + (Date.now() - startTime) / 1000 + "s");

    }, Client.options.messageSweepInterval * 1000);

}