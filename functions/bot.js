const serverSettings = require('../utils/server_settings.js');

exports.getPrefix = guildID => serverSettings.get(guildID, 'prefix') || '.';
