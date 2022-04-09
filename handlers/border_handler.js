const client = require('../modules/client.js');
const logs = require('../modules/member_logs.js');
const roles = require('../modules/roles.js');
const whitelist = require('../modules/whitelist.js');
const inviteCache = require('../utils/invite_cache.js');

exports.handleJoins = async function(member) {
    logs.join(member);
    roles.join(member);
};

exports.handleLeaves = async function(member) {
    logs.leave(member);
};

exports.handleNewGuild = async function(guild) {
    client.newGuild();
    inviteCache.newGuild(guild);
    whitelist.newGuild(guild);
};

exports.handleRemovedGuild = async function(guild) {
    client.removedGuild();
};
