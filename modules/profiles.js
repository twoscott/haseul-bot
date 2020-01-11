const { searchMembers, resolveMember, resolveUser, withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const levels = require("../functions/levels.js");
const { parseUserID, trimArgs } = require("../functions/functions.js");

// const database = require("../db_queries/profiles_db.js");
const repsdb = require("../db_queries/reps_db.js");
const levelsdb = require("../db_queries/levels_db.js");

exports.onCommand = async function(message, args) {

    let { channel } = message;

    switch (args[0]) {
        case "profile":
        case "rank":
            withTyping(channel, profileTemp, [message, args]);
            break;
    }

}

async function profileTemp(message, args) {

    let { author, guild } = message;
    let target = args[1];
    let member;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        guild = await guild.fetchMembers();

        member = await searchMembers(guild, target)
        if (!member) {
            message.channel.send("⚠ Invalid user or user ID.");
            return;
        } else {
            userID = member.id;
        }
    }

    let userReps = await repsdb.getRepProfile(userID);
    let userGlobXp = await levelsdb.getGlobalXp(userID);
    let userGuildXp = await levelsdb.getGuildXp(userID, guild.id)

    let userGlobRank = levels.globalRank(userGlobXp);
    let userGuildRank = levels.guildRank(userGuildXp);

    member = member || await resolveMember(guild, userID);
    if (!member) {
        message.channel.send("⚠ User is not in this server.");
        return;
    }
    let user = member ? member.user : await resolveUser(userID);
    let colour = member ? member.displayColor || 0x6d5ffb : 0x6d5ffb;

    let embed = {
        author: { name: `Temp Profile for ${user.username}`, icon_url: user.displayAvatarURL },
        color: colour,
        fields: [
            { name: 'Rep', value: userReps ? userReps.rep: 0, inline: false },
            { name: 'Global Level', value: `Level ${userGlobXp ? userGlobRank.lvl: 1}`, inline: true },
            { name: 'Global XP', value: `${userGlobXp ? (userGlobXp - userGlobRank.baseXp) : 0}/${userGlobRank.nextXp - userGlobRank.baseXp}`, inline: true },
            { name: 'Server Level', value: `Level ${userGuildXp ? userGuildRank.lvl: 1}`, inline: true },
            { name: 'Server XP', value: `${userGuildXp ? (userGuildXp - userGuildRank.baseXp) : 0}/${userGuildRank.nextXp - userGuildRank.baseXp}`, inline: true }
        ],
        thumbnail: { url: user.displayAvatarURL },
        footer: { text: 'Full profiles coming soon.' }
    }

    message.channel.send({embed: embed});

}
