const Discord = require('discord.js');
const { searchMembers, resolveMember, resolveUser, withTyping } = require('../functions/discord.js');

const levels = require('../functions/levels.js');
const { parseUserID, trimArgs } = require('../functions/functions.js');

// const database = require("../db_queries/profiles_db.js");
const repsdb = require('../db_queries/reps_db.js');
const levelsdb = require('../db_queries/levels_db.js');

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'profile':
    case 'rank':
        withTyping(channel, profileTemp, [message, args]);
        break;
    }
};

async function profileTemp(message, args) {
    let { author, guild, members } = message;
    let target = args[1];
    let member;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content);
        members = await guild.members.fetch();

        member = await searchMembers(members, target);
        if (!member) {
            message.channel.send({ content: '⚠ Invalid user or user ID.' });
            return;
        } else {
            userID = member.id;
        }
    }

    const userReps = await repsdb.getRepProfile(userID);
    const userGlobXp = await levelsdb.getGlobalXp(userID);
    const userGuildXp = await levelsdb.getGuildXp(userID, guild.id);

    const userGlobRank = levels.globalRank(userGlobXp);
    const userGuildRank = levels.guildRank(userGuildXp);

    member = member || await resolveMember(guild, userID);
    if (!member) {
        message.channel.send({ content: '⚠ User is not in this server.' });
        return;
    }
    const user = member ? member.user : await resolveUser(userID);
    const colour = member ? member.displayColor || 0x6d5ffb : 0x6d5ffb;

    const embed = new Discord.MessageEmbed({
        author: { name: `Temp Profile for ${user.username}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        color: colour,
        fields: [
            { name: 'Rep', value: userReps ? userReps.rep: 0, inline: false },
            { name: 'Global Level', value: `Level ${userGlobXp ? userGlobRank.lvl: 1}`, inline: true },
            { name: 'Global XP', value: `${userGlobXp ? (userGlobXp - userGlobRank.baseXp) : 0}/${userGlobRank.nextXp - userGlobRank.baseXp}`, inline: true },
            { name: 'Server Level', value: `Level ${userGuildXp ? userGuildRank.lvl: 1}`, inline: true },
            { name: 'Server XP', value: `${userGuildXp ? (userGuildXp - userGuildRank.baseXp) : 0}/${userGuildRank.nextXp - userGuildRank.baseXp}`, inline: true },
        ],
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        footer: { text: 'Full profiles coming soon.' },
    });

    message.channel.send({ embeds: [embed] });
}
