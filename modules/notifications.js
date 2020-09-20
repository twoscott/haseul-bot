const Discord = require("discord.js");
const { resolveMember, withTyping } = require("../functions/discord.js");

const database = require("../db_queries/notifications_db.js");
const { trimArgs } = require("../functions/functions.js");

const HashSet = require("hashset");

const notif_nums = {
    'i': '1!',
    'l': '1|',
    'z': '2',
    'e': '3',
    'a': '4@',
    's': '5$',
    'b': '68',
    't': '7',
    'q': '9',
    'g': '9',
    'o': '0'
}

exports.onMessage = async function(message) {

    notify(message);

}

exports.onCommand = async function(message, args) {

    let { channel } = message;

    switch (args[0]) {
        case "notifications":
        case "notification":
        case "notify":
        case "notif":
        case "noti":
            switch (args[1]) {
                case "global":
                    switch (args[2]) {
                        case "add":
                            withTyping(channel, addNotification, [message, args, true]);
                            break;
                        case "remove":
                        case "delete":
                            withTyping(channel, removeNotification, [message, args, true]);
                            break;
                        case "clear":
                        case "purge":
                            withTyping(channel, clearNotifications, [message, true]);
                            break;
                        case "list":
                            withTyping(channel, listNotifications, [message, true]);
                            break;
                    }
                    break;
                case "add":
                    withTyping(channel, addNotification, [message, args]);
                    break;
                case "remove":
                case "delete":
                    withTyping(channel, removeNotification, [message, args]);
                    break;
                case "clear":
                case "purge":
                    withTyping(channel, clearNotifications, [message]);
                    break;
                case "donotdisturb":
                case "dnd":
                case "toggle":
                    withTyping(channel, toggleDnD, [message]);
                    break;
                case "list":
                    withTyping(channel, listNotifications, [message]);
                    break;
                case "blacklist":
                case "ignore":
                    switch (args[2]) {
                        case "server":
                            withTyping(channel, ignoreServer, [message]);
                            break;
                        case "channel":
                            withTyping(channel, ignoreChannel, [message, args.slice(3)]);
                            break;
                    }
                    break;
                case "help":
                default:
                    channel.send(`Help with notifications can be found here: https://haseulbot.xyz/#notifications`);
                    break;                    
            }
            break;
    }

}

async function notify(message) {

    let { guild, channel, author, content, member } = message;
    if (!content) return;
    
    let locals = await database.getAllLocalNotifs(guild.id);
    let globals = await database.getAllGlobalNotifs();
    let notifs = locals.concat(globals).filter(n => n.userID != author.id);
    if (notifs.length < 1) return;
    let matches = new Map();

    let ignored_channels = await database.getIgnoredChannels();
    let ignored_servers = await database.getIgnoredServers();
    let dnd_users = await database.getAllDnD();

    let embed = new Discord.MessageEmbed({
        author: { name: author.tag, icon_url: author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        color: member.displayColor || 0xffffff,
        fields: [
            { name: "Message Link", value: `[View Message](${message.url} "Jump to Message")` },
            { name: "Content", value: content.length < 1025 ? content : content.slice(0,1021).trim()+'...', inline: false }
        ],
        footer: { text: `#${channel.name}` },
        timestamp: message.createdAt
    });

    for (let notif of notifs) {
        if (notif.guildID && notif.guildID != guild.id) { 
            continue;
        }
        
        let ignored_server = ignored_servers.find(x => x.userID == notif.userID && x.guildID == guild.id);
        if (ignored_server) continue;
        let ignored_channel = ignored_channels.find(x => x.userID == notif.userID && x.channelID == channel.id);
        if (ignored_channel) continue;
        let doNotDisturb = dnd_users.find(userID => userID == notif.userID);
        if (doNotDisturb) continue;

        let regexp;
        switch (notif.type) {
            case "NORMAL":
                let plural = ['s','x','ch','sh'].includes(notif.keyexp[notif.keyexp.length-1]) ? 'es':'s';
                regexp = new RegExp(`(^|\\W)${notif.keyexp}(?:[\`']s|${plural})?($|\\W)`, 'i');
                break;
            case "STRICT":
                regexp = new RegExp(`(^|\\s)${notif.keyexp}($|\\s)`);
                break;
            case "LENIENT":
                regexp = new RegExp(notif.keyexp, 'i');
                break;
            case "ANARCHY":
                regexp = notif.keyexp;
                let anarch_regex = "";
                for (i=0; i<regexp.length; i++) {
                    let char = regexp[i];
                    if (char == '\\') {
                        let nextchar = regexp[++i];
                        anarch_regex += i < regexp.length - 1 ? `${char+nextchar}+\\W*` : `${char+nextchar}+`;
                    } else {
                        let num = notif_nums[char];
                        let insert = num != null ? `[${char+num}]` : char;
                        anarch_regex += i < regexp.length - 1 ? `${insert}+\\W*` : `${insert}+`;
                    }
                }
                regexp = new RegExp(anarch_regex, 'i');
                break;
        }

        let match = content.match(regexp);
        if (!match) continue;

        let notif_set = matches.get(notif.userID);
        if (notif_set) {
            notif_set.add(notif.keyword.toLowerCase())
            matches.set(notif.userID, notif_set);
        } else {
            matches.set(notif.userID, new HashSet(notif.keyword.toLowerCase()));
        }
    }

    for (let userID of matches.keys()) {

        let member = await resolveMember(guild, userID);
        if (!member) continue;
        
        let can_read = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
        if (!can_read) continue;

        let set = matches.get(userID);
        let keywords = set.toArray().sort().join('`, `');
        let alert = `💬 **${author.username}** mentioned \`${keywords}\` in **\`#${channel.name}\`**`;

        try {
            await member.send(alert, { embed });
        } catch (e) {
            if (e.code == 50007) { // Cannot send messages to this user
                database.clearGlobalNotifs(userID);
                database.clearAllLocalNotifs(userID);
                console.log(`Cleared all notifcations for ${member.user.tag}: Cannot send messages to this user`);
            }
        }
        
    }

}

async function addNotification(message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        message.channel.send(`⚠ Please specify a key word or phrase to add.`);
        return;
    }

    message.delete();
    
    let type;
    let typeArg = global ? args[3] : args[2];
    let keyword;
    if (["STRICT", "NORMAL", "LENIENT", "ANARCHY"].includes(typeArg.toUpperCase()) && args.length > (global ? 4 : 3)) {
        type = typeArg.toUpperCase();
        keyword = trimArgs(args, global ? 4 : 3, message.content);
    } else {
        type = "NORMAL";
        keyword = trimArgs(args, global ? 3 : 2, message.content);
    }

    if (keyword.length > 128) {
        message.channel.send(`⚠ Keywords must not exceed 128 character in length.`);
        return;
    }

    let keyrgx = keyword.replace(/([\\\|\[\]\(\)\{\}\.\^\$\?\*\+])/g, "\\$&");
    keyword = keyword.toLowerCase();

    let { guild, author } = message;
    let addedNotif = global ? await database.addGlobalNotif(author.id, keyword, keyrgx, type)
                            : await database.addLocalNotif(guild.id, author.id, keyword, keyrgx, type);
    if (!addedNotif) {
        message.channel.send(`⚠ Notification with this keyword already added.`);
        return;
    }

    try {
        await author.send(`You will now be notified when \`${keyword}\` is mentioned ${global ? `globally` : `in \`${guild.name}\``} with \`${type}\` search mode.`);
        message.channel.send(`Notification added.`);
    } catch (e) {
        if (e.code == 50007) {
            message.channel.send(`⚠ I cannot send DMs to you. Please check your privacy settings and try again.`);
            global ? database.removeGlobalNotif(author.id, keyword) : database.removeLocalNotif(guild.id, author.id, keyword);
        }
    }
    
}

async function removeNotification(message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        message.channel.send(`⚠ Please specify a key word or phrase to remove.`);
        return;
    }

    message.delete();
    let keyphrase = trimArgs(args, global ? 3 : 2, message.content);

    let { guild, author } = message;
    let removed = global  ? await database.removeGlobalNotif(author.id, keyphrase)
                          : await database.removeLocalNotif(guild.id, author.id, keyphrase);
    if (!removed) {
        author.send(`Notification \`${keyphrase}\` does not exist. Please check for spelling errors.`).catch(() => {});
        message.channel.send(`⚠ Notification does not exist.`);
        return;
    }

    try {
        await author.send(`You will no longer be notified when \`${keyphrase}\` is mentioned${!global ? ` in \`${guild.name}\`.` : `.`}`);
        message.channel.send(`Notification removed.`);
    } catch (e) {
        if (e.code == 50007) {
            message.channel.send(`⚠ I cannot send DMs to you. Please check your privacy settings and try again.`);
        }
    }

}

async function clearNotifications(message, global) {

    let { author, guild } = message;
    let cleared;
    if (global) {
        cleared = await database.clearGlobalNotifs(author.id);
        message.channel.send(cleared ? `All global notifications cleared.` : `⚠ No notifications to clear.`);
    } else {
        cleared = await database.clearLocalNotifs(guild.id, author.id);
        message.channel.send(cleared ? `All notifications in \`${guild.name}\` cleared.` : `⚠ No notifications in \`${guild.name}\` to clear.`);
    }

}

async function listNotifications(message, global) {

    let { author, guild } = message;
    let notifs = global ? await database.getGlobalNotifs(author.id) :
                          await database.getLocalNotifs(guild.id, author.id);

    if (notifs.length < 1) {
        message.channel.send(`⚠ You don't have any notifications${!global ? ` in ${message.guild.name}` : ``}!`);
        return;
    }

    let notifString = [`**${global ? 'Global' : message.guild.name} Notifications List**\n__Type - Keyword__`].concat(notifs.map(notif => `\`${notif.type}\` - ${notif.keyword.toLowerCase()}`)).join('\n');

    let pages = [];
    while (notifString.length > 2048) {
        let currString = notifString.slice(0, 2048);

        let lastIndex = 0;
        while (true) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        notifString = notifString.slice(lastIndex);

        pages.push(currString);
    } 
    pages.push(notifString);

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

async function ignoreChannel(message, args) {

    let { author, guild, channel } = message;

    if (args.length >= 1) {
        let channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            message.channel.send(`⚠ Invalid channel or channel ID.`);
            return;
        }
        channel_id = channel_id[1];
        channel = guild.channels.cache.get(channel_id);
    }

    if (!channel) {
        message.channel.send(`⚠ Channel doesn't exist in this server.`);
        return;
    }
    if (channel.type != "text") {
        message.channel.send(`⚠ Channel must be a text channel.`);
        return;
    }

    let ignored = await database.toggleChannel(author.id, channel.id);
    message.channel.send(ignored ? `You will no longer be sent notifications for messages in ${channel}.`:
                                   `You will now be sent notifications for messages in ${channel}.`);

}

async function ignoreServer(message) {

    let { author, guild } = message;
    let ignored = await database.toggleServer(author.id, guild.id);
    message.channel.send(ignored ? `You will no longer be sent notifications for messages in this server.`:
                                   `You will now be sent notifications for messages in this server.`);

}

async function toggleDnD(message) {

    let dnd = await database.toggleDnD(message.author.id);
    message.channel.send(`Do not disturb turned ${dnd ? 'on':'off'}.`);

}
