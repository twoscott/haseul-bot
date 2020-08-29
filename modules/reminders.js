const { withTyping } = require("../functions/discord.js");
const { getDelta } = require("../functions/functions.js");

const database = require("../db_queries/reminders_db.js");

exports.onCommand = async function(message, args) {

    let { channel } = message;

    switch (args[0]) {
        case "remind":
            switch(args[1]) {
                case "me":
                    withTyping(channel, setReminder, [message, args.slice(2)]);
                break;
            }
            break;
        case "reminder":
            switch (args[1]) {
                case "list":
                    withTyping(channel, listReminders, [message, args])
                    break;
            }
            break;
        case "reminders":
            switch (args[1]) {
                case "list":
                    withTyping(channel, listReminders, [message, args])
                    break;
                case "clear":
                    withTyping(channel, clearReminders, [message, args]);
                    break;
            }
            break;            
        case "remindme":
            withTyping(channel, setReminder, [message, args.slice(1)]);
            break;
    }

}

async function setReminder(message, args) {

    message.delete();
    let startTimestamp = Date.now() / 1000; // seconds since 1970
    
    if (args.length < 4) {
        message.channel.send(`⚠ Please provide a reminder and a time.`);
        return;
    }

    let { author, content } = message;

    let inPos = content.search(/(?<!\w)in(?!\w)/i);
    if (inPos < 0) {
        message.channel.send(`⚠ Please provide a time to set your reminder for.`);
        return;
    }

    let toPos = content.search(/(?<!\w)to(?!\w)/i);
    if (toPos < 0) {
        message.channel.send(`⚠ Please provide content to be reminded of.`);
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

    let weeks = timeString.match(/(\d+)\s*w(?:ee)?ks?/i);
    let days = timeString.match(/(\d+)\s*d(?:ays)?/i);
    let hours = timeString.match(/(\d+)\s*h(?:ou)?rs?/i);
    let minutes = timeString.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i);
    let seconds = timeString.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);

    if (!(weeks || days || hours || minutes || seconds)) {
        message.channel.send(`⚠ Please provide a time to set your reminder for.`);
        return;
    }

    let secondsTimestamp = seconds ? seconds[1] * 1 : 0;
    let minutesTimestamp = minutes ? minutes[1] * 60 : 0;
    let hoursTimestamp = hours ? hours[1] * 3600: 0;
    let daysTimestamp = days ? days[1] * 86400 : 0;
    let weeksTimestamp = weeks ? weeks[1] * 604800 : 0;
    
    let remindTimestamp = startTimestamp + weeksTimestamp + daysTimestamp + hoursTimestamp + minutesTimestamp + secondsTimestamp;
    let remindTimeString = `${weeks?`${weeks[1]} weeks `:``}${days?`${days[1]} days `:``}${hours?`${hours[1]} hours `:``}${minutes?`${minutes[1]} minutes `:``}${seconds?`${seconds[1]} seconds`:``}`.trim();
    let timeDiff = remindTimestamp - startTimestamp;

    if (timeDiff < 10) {
        message.channel.send(`⚠ Reminder must be set more than 10 seconds into the future.`);
        return;
    }

    if (timeDiff > 157680000) {
        message.channel.send(`⚠ Reminder must be set less than 5 years into the future.`);
        return;
    }

    let lastID = await database.addReminder(author.id, remindContent, remindTimestamp, startTimestamp);
    if (!lastID) {
        message.channel.send(`⚠ Error occurred.`);
    } else {
        try {
            await author.send(`🔔 You will be reminded in \`${remindTimeString}\` to "${remindContent}"`)
            message.channel.send(`Reminder set.`);
        } catch (e) {
            if (e.code == 50007) {
                message.channel.send(`⚠ I cannot send DMs to you. Please check your privacy settings and try again.`);
                database.removeReminder(lastID);
            }
        }
    }

}

async function listReminders(message, args) {

    let { author } = message;
    let reminders = await database.getUserReminders(author.id);

    if (reminders.length < 1) {
        message.channel.send(`⚠ You don't have any reminders set!`);
        return;
    }

    let startTimestamp = Date.now() / 1000;
    let timeRemainingString = (timeData) => `${timeData.days}d ${timeData.hours}h ${timeData.minutes}m ${timeData.seconds}s`;
    let reminderString = ["**Reminder List**"].concat(reminders.map(reminder => `"${reminder.remindContent}" in ${timeRemainingString(getDelta((reminder.remindTimestamp - startTimestamp) * 1000, "days"))}`)).join('\n');

    let pages = [];
    while (reminderString.length > 2048) {
        let currString = reminderString.slice(0, 2048);

        let lastIndex = 0;
        while (true) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        reminderString = reminderString.slice(lastIndex);

        pages.push(currString);
    } 
    pages.push(reminderString);

    try {
        for (let page of pages) {
            await author.send(page);
        }
        message.channel.send(`A list of your notifications has been sent to your DMs.`);
    } catch (e) {
        if (e.code == 50007) {
            message.channel.send(`⚠ I cannot send DMs to you. Please check your privacy settings and try again.`);
        }
    }

}

async function clearReminders(message, args) {

    let { author } = message;
    let changes = await database.clearUserReminders(author.id);
    if (!changes) {
        message.channel.send(`⚠ No reminders to remove.`);
    } else {
        message.channel.send(`Reminders cleared.`);
    }

}

