const { withTyping } = require('../functions/discord.js');
const { getDelta } = require('../functions/functions.js');

const database = require('../db_queries/reminders_db.js');

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'remind':
        switch (args[1]) {
        case 'me':
            withTyping(channel, setReminder, [message, args.slice(2)]);
            break;
        }
        break;
    case 'reminder':
        switch (args[1]) {
        case 'list':
            withTyping(channel, listReminders, [message, args]);
            break;
        }
        break;
    case 'reminders':
        switch (args[1]) {
        case 'list':
            withTyping(channel, listReminders, [message, args]);
            break;
        case 'clear':
            withTyping(channel, clearReminders, [message, args]);
            break;
        }
        break;
    case 'remindme':
        withTyping(channel, setReminder, [message, args.slice(1)]);
        break;
    }
};

async function setReminder(message, args) {
    message.delete();
    const startTimestamp = Date.now() / 1000; // seconds since 1970

    if (args.length < 4) {
        message.channel.send({ content: '⚠ Please provide a reminder and a time.' });
        return;
    }

    const { author, content } = message;

    let inPos = content.search(/(?<!\w)in(?!\w)/i);
    if (inPos < 0) {
        message.channel.send({ content: '⚠ Please provide a time to set your reminder for.' });
        return;
    }

    const toPos = content.search(/(?<!\w)to(?!\w)/i);
    if (toPos < 0) {
        message.channel.send({ content: '⚠ Please provide content to be reminded of.' });
        return;
    }

    let timeString;
    let remindContent;
    if (inPos < toPos) {
        timeString = content.slice(inPos + 3, toPos).trim();
        remindContent = content.slice(toPos + 3).trim();
    } else {
        inPos = content.search(/(?<!\w)in(?!\w)(?!.*\Win\W)/i);
        remindContent = content.slice(toPos + 3, inPos).trim();
        timeString = content.slice(inPos + 3).trim();
    }

    const weeks = timeString.match(/(\d+)\s*w(?:ee)?ks?/i);
    const days = timeString.match(/(\d+)\s*d(?:ays)?/i);
    const hours = timeString.match(/(\d+)\s*h(?:ou)?r?s?/i);
    const minutes = timeString.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i);
    const seconds = timeString.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);

    if (!(weeks || days || hours || minutes || seconds)) {
        message.channel.send({ content: '⚠ Please provide a time to set your reminder for.' });
        return;
    }

    const secondsTimestamp = seconds ? seconds[1] * 1 : 0;
    const minutesTimestamp = minutes ? minutes[1] * 60 : 0;
    const hoursTimestamp = hours ? hours[1] * 3600: 0;
    const daysTimestamp = days ? days[1] * 86400 : 0;
    const weeksTimestamp = weeks ? weeks[1] * 604800 : 0;

    const remindTimestamp = startTimestamp +
        weeksTimestamp +
        daysTimestamp +
        hoursTimestamp +
        minutesTimestamp +
        secondsTimestamp;
    const remindTimeString = `${weeks?`${weeks[1]} weeks `:''}${days?`${days[1]} days `:''}${hours?`${hours[1]} hours `:''}${minutes?`${minutes[1]} minutes `:''}${seconds?`${seconds[1]} seconds`:''}`.trim();
    const timeDiff = remindTimestamp - startTimestamp;

    if (timeDiff < 10) {
        message.channel.send({ content: '⚠ Reminder must be set more than 10 seconds into the future.' });
        return;
    }

    if (timeDiff > 157680000) {
        message.channel.send({ content: '⚠ Reminder must be set less than 5 years into the future.' });
        return;
    }

    const lastID = await database
        .addReminder(author.id, remindContent, remindTimestamp, startTimestamp);
    if (!lastID) {
        message.channel.send({ content: '⚠ Error occurred.' });
    } else {
        try {
            await author.send({ content: `🔔 You will be reminded in \`${remindTimeString}\` to "${remindContent}"` });
            message.channel.send({ content: 'Reminder set.' });
        } catch (e) {
            if (e.code == 50007) {
                message.channel.send({ content: '⚠ I cannot send DMs to you. Please check your privacy settings and try again.' });
                database.removeReminder(lastID);
            }
        }
    }
}

async function listReminders(message, args) {
    const { author } = message;
    const reminders = await database.getUserReminders(author.id);

    if (reminders.length < 1) {
        message.channel.send({ content: '⚠ You don\'t have any reminders set!' });
        return;
    }

    const startTimestamp = Date.now() / 1000;
    const timeRemainingString = timeData => `${timeData.days}d ${timeData.hours}h ${timeData.minutes}m ${timeData.seconds}s`;
    let reminderString = ['**Reminder List**'].concat(reminders.map(reminder => `"${reminder.remindContent}" in ${timeRemainingString(getDelta((reminder.remindTimestamp - startTimestamp) * 1000, 'days'))}`)).join('\n');

    const pages = [];
    while (reminderString.length > 2048) {
        let currString = reminderString.slice(0, 2048);

        let lastIndex = 0;
        while (true) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        reminderString = reminderString.slice(lastIndex);

        pages.push(currString);
    }
    pages.push(reminderString);

    try {
        for (const page of pages) {
            await author.send(page);
        }
        message.channel.send({ content: 'A list of your notifications has been sent to your DMs.' });
    } catch (e) {
        if (e.code == 50007) {
            message.channel.send({ content: '⚠ I cannot send DMs to you. Please check your privacy settings and try again.' });
        }
    }
}

async function clearReminders(message, args) {
    const { author } = message;
    const changes = await database.clearUserReminders(author.id);
    if (!changes) {
        message.channel.send({ content: '⚠ No reminders to remove.' });
    } else {
        message.channel.send({ content: 'Reminders cleared.' });
    }
}

