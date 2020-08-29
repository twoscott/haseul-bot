const Discord = require("discord.js");
const Client = require("../haseul.js").Client;

const database = require("../db_queries/reminders_db.js");

exports.tasks = async function() {

    remindersLoop().catch(console.error);

}

async function remindersLoop() {

    let startTime = Date.now();
    console.log("Started checking reminders at " + new Date(startTime).toUTCString());
    
    let overdueReminders = await database.getOverdueReminders();
    for (let reminder of overdueReminders) {
        let { reminderID, userID, remindContent, reminderSetTime } = reminder;
        let recipient = await Client.users.fetch(userID);
        if (recipient) {
            let embed = new Discord.MessageEmbed({
                title: `Reminder!`,
                description: remindContent,
                footer: { text: '📝 Reminder set' },
                timestamp: reminderSetTime * 1000,
                color: 0x01b762
            });
            recipient.send(`🔔 Reminder has been triggered.`, { embed });
        }
        database.removeReminder(reminderID);
    }
    
    console.log("Finished checking reminders, took " + (Date.now() - startTime) / 1000 + "s");
    setTimeout(remindersLoop, Math.max(10000 - (Date.now() - startTime), 0));

}