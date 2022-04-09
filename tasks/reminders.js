const Discord = require('discord.js');
const Client = require('../haseul.js').Client;

const database = require('../db_queries/reminders_db.js');

exports.tasks = async function() {
    remindersLoop().catch(console.error);
};

async function remindersLoop() {
    const startTime = Date.now();

    const overdueReminders = await database.getOverdueReminders();
    for (const reminder of overdueReminders) {
        const { reminderID, userID, remindContent, reminderSetTime } = reminder;
        const recipient = await Client.users.fetch(userID);
        if (recipient) {
            const embed = new Discord.MessageEmbed({
                title: 'Reminder!',
                description: remindContent,
                footer: { text: '📝 Reminder set' },
                timestamp: reminderSetTime * 1000,
                color: 0x01b762,
            });
            recipient.send('🔔 Reminder has been triggered.', { embed });
        }
        database.removeReminder(reminderID);
    }

    setTimeout(remindersLoop, Math.max(10000 - (Date.now() - startTime), 0));
}
