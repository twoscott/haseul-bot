const logs = require("../modules/users.js");
const roles = require("../modules/roles.js");
const serverSettings = require("../modules/server_settings.js");

exports.handleJoins = async function(member) {
    logs.join(member);
    roles.join(member);
}

exports.handleLeaves = async function(member) {
    logs.leave(member);
}

exports.handleNewGuild = async function(guild) {
    serverSettings.newGuild(guild);
}
