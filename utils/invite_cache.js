const { Client } = require('../haseul.js');
const { checkPermissions, resolveMember } = require('../functions/discord.js');

const inviteCache = new Map();
const vanityCache = new Map();

async function cacheGuildInvites(guild) {
    const botMember = await resolveMember(guild, Client.user.id);
    if (checkPermissions(botMember, ['MANAGE_GUILD'])) {
        try {
            const guildInvites = await guild.fetchInvites();
            inviteCache.set(guild.id, guildInvites || new Map());
        } catch (e) {
            inviteCache.set(guild.id, new Map());
            console.error(e);
        }
        try {
            const vanityInvite = await guild.fetchVanityData();
            vanityInvite.url = `https://discord.gg/${vanityInvite.code}`;
            vanityCache.set(guild.id, vanityInvite);
        } catch (e) {
            vanityCache.set(guild.id, null);
        }
    } else {
        inviteCache.set(guild.id, new Map());
        vanityCache.set(guild.id, null);
    }
}

exports.newGuild = async function(guild) {
    cacheGuildInvites(guild);
};

exports.onReady = async function() {
    for (const guild of Client.guilds.cache.array()) {
        await cacheGuildInvites(guild);
    }
    console.log(`Cached invites for ${inviteCache.size} servers.`);
};

exports.resolveUsedInvite = async function(guild) {
    const currentCache = await inviteCache.get(guild.id);
    const currentVanity = await vanityCache.get(guild.id);

    let usedInvite = null;
    let inviteChanges = 0;

    const newInvites = await guild.fetchInvites().catch(console.error);
    // console.log(newInvites);
    if (currentCache && newInvites && newInvites.size > 0) {
        for (const newInvite of newInvites.array()) {
            const currentInvite = currentCache.get(newInvite.code);
            if (currentInvite) {
                if (currentInvite.uses !== null &&
                    newInvite.uses > currentInvite.uses) {
                    usedInvite = newInvite;
                    inviteChanges++;
                }
            } else if (newInvite.uses > 0) {
                usedInvite = newInvite;
                inviteChanges++;
            }
        }
    }

    const newVanity = await guild.fetchVanityData().catch(console.error);
    // console.log(newVanity);
    if (currentVanity && newVanity && inviteChanges < 2) {
        newVanity.url = `https://discord.gg/${newVanity.code}`;
        if (currentVanity) {
            if (currentVanity.uses !== null &&
                newVanity.uses > currentVanity.uses) {
                usedInvite = newVanity;
                inviteChanges++;
            }
        } else if (newVanity.uses > 0) {
            usedInvite = newVanity;
            inviteChanges++;
        }
    }

    inviteCache.set(guild.id, newInvites);
    vanityCache.set(guild.id, newVanity);
    return inviteChanges == 1 ? usedInvite : null;
};
