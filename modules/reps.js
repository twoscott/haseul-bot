const Discord = require('discord.js');
const { embedPages, resolveMember, resolveUser, withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const colours = require('../functions/colours.js');
const { getDelta, parseUserID } = require('../functions/functions.js');

const database = require('../db_queries/reps_db.js');
const levelsdb = require('../db_queries/levels_db.js');

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'rep':
        switch (args[1]) {
        case 'status':
        case undefined:
            withTyping(channel, repStatus, [message]);
            break;
        default:
            withTyping(channel, rep, [message, args.slice(1)]);
            break;
        }
        break;
    case 'repboard':
        switch (args[1]) {
        case 'global':
            withTyping(channel, repboard, [message, false]);
            break;
        case 'local':
        default:
            withTyping(channel, repboard, [message, true]);
            break;
        }
        break;
    case 'streaks':
    case 'streak':
        withTyping(channel, streaks, [message]);
        break;
    case 'streakboard':
        switch (args[1]) {
        case 'global':
            withTyping(channel, streakboard, [message, false]);
            break;
        case 'local':
        default:
            withTyping(channel, streakboard, [message, true]);
            break;
        }
        break;
    }
};

async function rep(message, args) {
    const { guild, author, createdTimestamp } = message;
    const todayDate = Math.floor(createdTimestamp / 86400000);

    let senderProfile = await database.getRepProfile(author.id);
    if (!senderProfile) {
        await database.setUserReps(author.id, 3);
        senderProfile = await database.getRepProfile(author.id);
    }

    if (senderProfile.repsRemaining < 3) {
        const lastRepDate = Math
            .floor(senderProfile.lastRepTimestamp / 86400000);
        if (lastRepDate < todayDate) {
            await database.setUserReps(author.id, 3);
        } else if (senderProfile.repsRemaining <= 0) {
            const midnightUTC = Math.floor(86400000 * (todayDate + 1));
            const timeFromNow = getDelta(midnightUTC - createdTimestamp, 'hours');
            let fromNowText = '';
            if (timeFromNow.hours) fromNowText += `${timeFromNow.hours}h `;
            if (timeFromNow.minutes) fromNowText += `${timeFromNow.minutes}m `;
            if (timeFromNow.seconds) fromNowText += `${timeFromNow.seconds}s `;
            message.channel.send(`⚠ You have no reps remaining today! Your reps will be replenished in ${fromNowText.trim()}.`);
            return;
        }
    }

    if (args.length < 1) {
        message.channel.send('⚠ Please provide a user to rep!');
        return;
    }

    const userID = parseUserID(args[0]);
    if (!userID) {
        message.channel.send('⚠ Please provide a valid user to rep!');
        return;
    }
    if (userID == author.id) {
        message.channel.send('⚠ You may not rep yourself!');
        return;
    }
    if (userID == Client.user.id) {
        message.channel.send('⚠ I\'m delighted but you cannot rep me!');
        return;
    }

    const recipient = await resolveMember(guild, userID);
    if (!recipient) {
        message.channel.send('⚠ The user provided is not in this server or does not exist.');
        return;
    }
    if (recipient.user.bot) {
        message.channel.send('⚠ You may not rep a bot!');
        return;
    }

    const repStreak = await database.getStreak(author.id, recipient.id);
    if (repStreak) {
        const sendingUser = Object
            .keys(repStreak)
            .find(key => repStreak[key] == author.id);
        const senderLastRep = repStreak[`${sendingUser}LastRep`];
        const lastUserRepDate = Math.floor(senderLastRep / 86400000);
        if (senderLastRep && lastUserRepDate == todayDate) {
            message.channel.send('⚠ You may not rep the same user twice in one day!');
            return;
        }
    }

    await database.repUser(author.id, recipient.id, createdTimestamp);
    const recipientProfile = await database.getRepProfile(recipient.id);

    const newStreak = await database
        .updateStreak(author.id, recipient.id, createdTimestamp);
    const xpRand = Math.floor(Math.random() * 500);
    const addXp = Math
        .round(
            Math.floor(
                ((-10/(xpRand-500)) + 1) * 100 +
                (xpRand/10)) * (1 + (newStreak/100)),
        );

    await levelsdb.updateGlobalXp(recipient.id, addXp);
    const recipientXp = await levelsdb.getGlobalXp(recipient.id);

    const d = newStreak > 1 ? 's':'';
    const embed = new Discord.MessageEmbed({
        author: { name: 'Report', icon_url: recipient.user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        color: parseInt(colours.randomHexColour(true), 16),
        fields: [
            { name: 'Rep', value: `${recipientProfile.rep} (+1)`, inline: true },
            { name: 'Exp', value: `${recipientXp.toLocaleString()} (+${addXp})`, inline: true },
        ],
    });

    if (newStreak) embed.addField('Streak', `${newStreak} day${d} :fire:`, false);

    const emote = addXp > 1000 ? ':confetti_ball:' : addXp > 600 ? ':star2:' : addXp > 300 ? ':star:':'';
    message.channel.send(`You gave **${recipient.user.username}** a reputation point and **${addXp}** XP! ${emote}`, { embed });
    return;
}

async function repStatus(message) {
    const { author, createdTimestamp } = message;
    const todayDate = Math.floor(createdTimestamp / 86400000);

    let repProfile = await database.getRepProfile(author.id);
    if (!repProfile) {
        await database.setUserReps(author.id, 3);
        repProfile = await database.getRepProfile(author.id);
    }

    if (repProfile.repsRemaining < 3) {
        const lastRepDate = Math.floor(repProfile.lastRepTimestamp / 86400000);
        if (lastRepDate < todayDate) {
            await database.setUserReps(author.id, 3);
        }
    }

    repProfile = await database.getRepProfile(author.id);

    const midnightUTC = Math.floor(86400000 * (todayDate + 1));
    const timeFromNow = getDelta(midnightUTC - createdTimestamp, 'hours');
    let fromNowText = '';
    if (timeFromNow.hours) fromNowText += `${timeFromNow.hours}h `;
    if (timeFromNow.minutes) fromNowText += `${timeFromNow.minutes}m `;
    if (timeFromNow.seconds) fromNowText += `${timeFromNow.seconds}s `;

    message.channel.send(`You have **${repProfile.repsRemaining}** rep${repProfile.repsRemaining != 1 ? 's':''} remaining to give! ${repProfile.repsRemaining <= 0 ? `Your reps will be replenished in ${fromNowText.trim()}.` : ''}`);
    return;
}

async function repboard(message, local) {
    let reps = await database.getReps();

    if (local) {
        const members = await message.guild.members.fetch();
        reps = reps.filter(rep => members.has(rep.userID) && rep.rep > 0);
    } else {
        reps = reps.filter(rep => rep.rep > 0);
    }

    if (reps.length < 1) {
        message.channel.send(`⚠ Nobody${local ? ' on this server ':' '}currently has any reps!`);
        return;
    }

    const entries = reps.length;
    const originalReps = reps.slice();

    reps = reps.sort((a, b) => b.rep - a.rep).slice(0, 100);
    for (let i = 0; i < reps.length; i++) {
        const rep = reps[i];
        const user = await resolveUser(rep.userID);
        const name = user ? user.username.replace(/([\`\*\~\_])/g, '\\$&') : rep.userID;
        reps[i] = {
            userID: rep.userID, name, rep: rep.rep,
        };
    }

    let repString = reps.map((data, i) => `${i+1}. **${data.name.replace(/([\(\)\`\*\~\_])/g, '\\$&')}** (${data.rep})`).join('\n');

    const descriptions = [];
    while (repString.length > 2048 || repString.split('\n').length > 25) {
        let currString = repString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        repString = repString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(repString);

    const pages = descriptions.map((desc, i) => ({
        embed: {
            author: {
                name: `${local ? message.guild.name : 'Global'} Repboard`, icon_url: 'https://i.imgur.com/OQLFaj9.png',
            },
            description: desc,
            color: 0x44e389,
            footer: {
                text: `Entries: ${entries}  |  Total Reps: ${originalReps.reduce((acc, curr) => acc + curr.rep, 0)}  |  Page ${i+1} of ${descriptions.length}`,
            },
        },
    }));

    embedPages(message, pages);
}

async function streaks(message) {
    const { author, createdTimestamp } = message;

    await database.updateStreaks(createdTimestamp);
    const streaks = await database.getUserStreaks(author.id);

    if (streaks.length < 1) {
        message.channel.send('⚠ You do not currently have any rep streaks!');
        return;
    }

    for (let i = 0; i < streaks.length; i++) {
        const streak = streaks[i];
        const userID = author.id == streak.user1 ? streak.user2 : streak.user1;
        const user = await resolveUser(userID);
        const name = user ? user.username.replace(/([\`\*\~\_])/g, '\\$&') : userID;

        const time = getDelta((Math.min(streak.user1LastRep || streak.firstRep, streak.user2LastRep || streak.firstRep) + 36*60*60*1000) - createdTimestamp, 'hours');
        let timeText = '';
        if (time.hours) timeText += `${time.hours}h `;
        if (time.minutes) timeText += `${time.minutes}m `;
        if (time.seconds) timeText += `${time.seconds}s `;

        const streakDays = Math /* 24 Hours */
            .floor((createdTimestamp - streak.firstRep) / 86400000);

        streaks[i] = {
            userID, name, streak: streakDays, time: time.ms, timeText,
        };
    }

    const clocks = { 1: '\\🕐', 2: '\\🕑', 3: '\\🕒', 4: '\\🕓',
        5: '\\🕔', 6: '\\🕕', 7: '\\🕖', 8: '\\🕗',
        9: '\\🕘', 10: '\\🕙', 11: '\\🕚', 0: '\\🕛' };
    let streakString = streaks.sort((a, b) => a.time - b.time).sort((a, b) => b.streak - a.streak).map((data, i) => `${i+1}. **${data.name.replace(/([\(\)\`\*\~\_])/g, '\\$&')}** - ${data.streak} Day${data.streak != 1 ? 's':''} (${data.timeText.trim()} left) ${data.time < 12*60*60*1000 ? clocks[Math.floor(data.time/(60*60*1000))]:''}`).join('\n');

    const descriptions = [];
    while (streakString.length > 2048 || streakString.split('\n').length > 25) {
        let currString = streakString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        streakString = streakString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(streakString);

    const pages = descriptions.map((desc, i) => ({
        embed: {
            author: {
                name: `${author.username}${author.username[author.username.length-1] == 's' ? '\'':'\'s'} Rep Streaks`, icon_url: 'https://i.imgur.com/WwdqYpS.png',
            },
            description: desc,
            color: 0xff473e,
            footer: {
                text: `Page ${i+1} of ${descriptions.length}`,
            },
        },
    }));

    embedPages(message, pages);
}

async function streakboard(message, local) {
    const { createdTimestamp, guild } = message;

    await database.updateStreaks(createdTimestamp);
    let streaks = await database.getAllStreaks();
    if (local) {
        const members = await guild.members.fetch();
        streaks = streaks
            .filter(streak => members.has(streak.user1) &&
                members.has(streak.user2) &&
                createdTimestamp - streak.firstRep > 86400000 &&
                streak.user1LastRep &&
                streak.user2LastRep);
    } else {
        streaks = streaks
            .filter(streak => createdTimestamp - streak.firstRep > 86400000 &&
                streak.user1LastRep &&
                streak.user2LastRep);
    }

    if (streaks.length < 1) {
        message.channel.send(`⚠ Nobody${local ? ' on this server ':' '}currently has any rep streaks!`);
        return;
    }

    for (let i = 0; i < streaks.length; i++) {
        const streak = streaks[i];
        const user1 = await resolveUser(streak.user1);
        const user2 = await resolveUser(streak.user2);
        const name1 = user1 ? user1.username.replace(/([\`\*\~\_])/g, '\\$&') : streak.user1;
        const name2 = user2 ? user2.username.replace(/([\`\*\~\_])/g, '\\$&') : streak.user2;

        const time = createdTimestamp - streak.firstRep;
        const streakDays = Math.floor(time / 86400000 /* 24 Hours */);

        streaks[i] = {
            time,
            name1,
            name2,
            user1: streak.user1,
            user2: streak.user2,
            streak: streakDays,
        };
    }

    let streakString = streaks.sort((a, b) => b.time - a.time).map((data, i) => `${i+1}. **${data.name1.replace(/([\(\)\`\*\~\_])/g, '\\$&')}** & **${data.name2.replace(/([\(\)\`\*\~\_])/g, '\\$&')}** (${data.streak} Day${data.streak != 1 ? 's':''})`).join('\n');

    const descriptions = [];
    while (streakString.length > 2048 || streakString.split('\n').length > 25) {
        let currString = streakString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        streakString = streakString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(streakString);

    const pages = descriptions.map((desc, i) => ({
        embed: {
            author: {
                name: `${local ? guild.name : 'Global'} Rep Streakboard`, icon_url: 'https://i.imgur.com/WwdqYpS.png',
            },
            description: desc,
            color: 0xff473e,
            footer: {
                text: `Entries: ${streaks.length}  |  Avg. Streak: ${Math.round(streaks.reduce((acc, curr) => acc + curr.streak, 0) / streaks.length)}  |  Page ${i+1} of ${descriptions.length}`,
            },
        },
    }));

    embedPages(message, pages);
}
