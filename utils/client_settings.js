const database = require('../db_queries/client_db.js');

let settings = {};

exports.template = {
    'guildWhitelistChannelID': { name: 'Whitelist Channel', type: 'ID' },
    'guildWhitelistOn': { name: 'Whitelist On', type: 'toggle' },
};

exports.onReady = async function() {
    settings = await database.getSettings();
};

exports.get = function(setting) {
    return settings ? settings[setting] : null;
};

exports.getSettings = function() {
    return settings;
};

exports.set = async function(setting, value) {
    await database.setVal(setting, value);
    if (settings) {
        settings[setting] = value;
    } else {
        settings = await database.getSettings();
    }
};

exports.toggle = async function(toggle) {
    const tog = await database.toggle(toggle);
    if (settings) {
        settings[toggle] = tog;
    } else {
        settings = await database.getSettings();
    }
    return tog;
};
