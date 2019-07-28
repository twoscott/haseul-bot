// Require modules

const Client = require("../haseul.js").Client;

const functions = require("../functions/functions.js");
const levels = require("../modules/levels.js");

// const database = require("../db_queries/profiles_db.js");
const repsdb = require("../db_queries/reps_db.js");
const levelsdb = require("../db_queries/levels_db.js");

exports.msg = async function(message, args) {
    // Handle commands

    switch (args[0]) {

        case ".profile":
        case ".rank":
            message.channel.startTyping();
            profile_temp(message, args.slice(1)).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;
        

    }

}

async function profile_temp(message, args) {

    let { author, guild } = message;
    let target = args[0];
    let member;
    let user_id;

    if (!target) {
        user_id = author.id;
    } else {
        let match = target.match(/^<?@?!?(\d{8,})>?$/);
        if (!match) {
            let textStart = message.content.match(new RegExp(args.slice(0, 1).join('\\s+')))[0].length;
            target = message.content.slice(textStart).trim();
            guild = await guild.fetchMembers();

            member = await functions.searchMembers(guild, target)
            if (!member) {
                return "⚠ Invalid user or user ID.";
            }
                
            user_id = member.id;
        } else {
            user_id = match[1];
        }
    }

    let userReps = await repsdb.get_rep_profile(user_id);
    let userGlobXp = await levelsdb.get_global_xp(user_id);
    let userGuildXp = await levelsdb.get_guild_xp(user_id, guild.id)

    let userGlobRank = levels.globalRank(userGlobXp ? userGlobXp.xp : 0);
    let userGuildRank = levels.guildRank(userGuildXp ? userGuildXp.xp : 0);

    member = member || await guild.fetchMember(user_id);
    let user = member ? member.user : Client.users.get(user_id) || await Client.fetchMember(user_id);
    let colour = member ? member.displayColor || 0x6d5ffb : 0x6d5ffb;

    let embed = {
        author: { name: `Temp Profile for ${user.username}`, icon_url: user.displayAvatarURL },
        color: colour,
        fields: [
            { name: 'Rep', value: userReps ? userReps.rep: 0, inline: false },
            { name: 'Global Level', value: `Level ${userGlobXp ? userGlobRank.lvl: 1}`, inline: true },
            { name: 'Global XP', value: `${userGlobXp ? (userGlobXp.xp - userGlobRank.baseXp) : 0}/${userGlobRank.nextXp - userGlobRank.baseXp}`, inline: true },
            { name: 'Server Level', value: `Level ${userGuildXp ? userGuildRank.lvl: 1}`, inline: true },
            { name: 'Server XP', value: `${userGuildXp ? (userGuildXp.xp - userGuildRank.baseXp) : 0}/${userGuildRank.nextXp - userGuildRank.baseXp}`, inline: true }
        ],
        thumbnail: { url: user.displayAvatarURL },
        footer: { text: 'Full profiles coming soon.' }
    }

    message.channel.send({embed: embed});

}