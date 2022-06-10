const client = require('../modules/client.js');
const whitelist = require('../modules/whitelist.js');

const clientSettings = require('../utils/client_settings.js');
const serverSettings = require('../utils/server_settings.js');
// const inviteCache = require('../utils/invite_cache.js');

const messageSweep = require('../tasks/sweep_messages.js');
const moderation = require('../tasks/moderation.js');
const reminders = require('../tasks/reminders.js');
const twitter = require('../tasks/twitter.js');

exports.handleTasks = async function() {
    console.log('Initialising modules...');
    const clientSettingsReady = clientSettings.onReady();
    const serverSettingsReady = serverSettings.onReady();

    Promise.all([clientSettingsReady, serverSettingsReady]).then(() => {
        whitelist.onReady();
    });

    client.onReady();
    // inviteCache.onReady();

    console.log('Starting tasks...');
    messageSweep.tasks();
    moderation.tasks();
    reminders.tasks();
    twitter.tasks();
};
