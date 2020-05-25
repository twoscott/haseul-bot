const Client = require("../haseul.js").Client;

exports.tasks = async function() {

    presenceUpdateLoop().catch(console.error);

}

async function presenceUpdateLoop() {

    let startTime = Date.now();
    await Client.user.setActivity(`in ${Client.guilds.cache.size} servers`, { type: "PLAYING" });
    console.log(`Updated bot activity at ${new Date(startTime).toUTCString()}`);
    setTimeout(presenceUpdateLoop, 600000 - (Date.now() - startTime)); // 10 minute interval
    
}