// Require modules

const Discord = require("discord.js");
const Client = require("../haseul.js").Client;

const HashSet = require("hashset");

const database = require("../db_queries/notifications_db.js");

// Functions

async function notify(message) {

    // Fetch stored notifications
    let { guild, channel, author, content, member } = message;
    
    let locals = await database.get_local_notifs(guild.id);
    let globals = await database.get_global_notifs();
    let notifs = locals.concat(globals).filter(n => n.userID != author.id);
    if (notifs.length < 1) return;
    let matches = new Map();

    let ignored_channels = await database.get_ignored_channels();
    let ignored_servers = await database.get_ignored_servers();

    let msg_url = `https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id}`;
    let embed = {
        author: { name: author.tag, icon_url: author.displayAvatarURL, url: msg_url},
        description: `__[View Message](${msg_url})__`,
        color: member.displayColor || 0xffffff,
        fields: [
            { name: 'Content', value: content.length < 1025 ? content : content.slice(0,1021).trim()+'...' }
        ],
        footer: { text: `#${channel.name}` },
        timestamp: message.createdAt
    }

    // Filter notifications and notify valid users
    for (let notif of notifs) {
        if (notif.guildID && notif.guildID != guild.id) { 
            continue;
        }

        let dnd = await database.get_dnd(notif.userID);
        if (dnd) continue;

        let regxp = new RegExp(notif.keyexp, 'i');
        let match = content.match(regxp);
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

        let ignored_server = ignored_servers.find(x => x.userID == userID && x.guildID == guild.id);
        if (ignored_server) continue;
        let ignored_channel = ignored_channels.find(x => x.userID == userID && x.channelID == channel.id);
        if (ignored_channel) continue;

        let member;
        try {
            member = await guild.fetchMember(userID);
        } catch (e) {
            member = null;
        }
        if (!member) continue;
        
        let can_read = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
        if (!can_read) continue;

        let set = matches.get(userID);
        let keywords = set.toArray().sort().join('`, `');
        let alert = `\\💬 **${author.username}** mentioned \`${keywords}\` in ${channel}`;
        member.send(alert, {embed});
    }

}

exports.msg = async function(message, args) {

    // Notify

    notify(message);

    // Handle commands

    switch (args[0]) {

        case ".notifications":
        case ".notification":
        case ".notify":
        case ".notif":
        case ".noti":
            switch (args[1]) {

                // Global
                case "global":
                    switch (args[2]) {
                        
                        case "add":
                            message.channel.startTyping();
                            add_notification(message, args, true).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "remove":
                        case "delete":
                            message.channel.startTyping();
                            remove_notification(message, args, true).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;
                            
                        case "clear":
                        case "purge":
                            message.channel.startTyping();
                            clear_notifications(message, true).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;

                // Local
                case "add":
                    message.channel.startTyping();
                    add_notification(message, args).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "remove":
                case "delete":
                    message.channel.startTyping();
                    remove_notification(message, args).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "clear":
                case "purge":
                    message.channel.startTyping();
                    clear_notifications(message).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                // Do not Disturb
                case "donotdisturb":
                case "dnd":
                case "toggle":
                    message.channel.startTyping();
                    toggle_dnd(message).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;


                // Misc
                case "list":
                    message.channel.startTyping();
                    list_notifications(message).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;
                
                // ignore
                case "blacklist":
                case "ignore":
                    switch (args[2]) {

                        case "server":
                            message.channel.startTyping();
                            ignore_server(message).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        default:
                            message.channel.startTyping();
                            ignore_channel(message, args.slice(2)).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    


            }
            break;

    }

}

async function add_notification(message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        return "⚠ Please specify a key word or phrase to add."
    }

    message.delete(500);
    
    let type;
    let typeArg = global ? args[3] : args[2];
    let keyword;
    let keyphrase;
    if (["STRICT", "NORMAL", "LENIENT"].includes(typeArg.toUpperCase()) && args.length > (global ? 4 : 3)) {
        type = typeArg.toUpperCase();
        let keyStart = message.content.match(new RegExp(args.slice(0, global ? 4 : 3).join('\\s+')))[0].length;
        keyword = message.content.slice(keyStart).trim().toLowerCase();
    } else {
        type = "NORMAL";
        let keyStart = message.content.match(new RegExp(args.slice(0, global ? 3 : 2).join('\\s+')))[0].length;
        keyword = message.content.slice(keyStart).trim().toLowerCase();
    }

    let rgxChars = new RegExp(/([\\\|\[\]\(\)\{\}\<\>\^\$\?\!\:\*\=\+\-])/, 'g');
    keyphrase = keyword.replace(rgxChars, "\\$&");

    let keyrgx;
    if (type == "STRICT")  {
        keyrgx = `(^|\\W)${keyphrase}[\`']?s?($|\\W)`;
    }
    if (type == "NORMAL")  {
        keyrgx = `${keyphrase}`;
    }
    if (type == "LENIENT") {
        keyrgx = '';
        for (i=0; i<keyphrase.length; i++) {
            let char = keyphrase[i];
            if (char == '\\' && keyphrase[i+1] != '\\') {
                let nextchar = keyphrase[++i];
                keyrgx += (i) < keyphrase.length - 1 ? `${char+nextchar}+\\W*` : `${char+nextchar}+`;
            } else {
                keyrgx += i < keyphrase.length - 1 ? `${char}+\\W*` : `${char}+`;
            }
        }
        keyrgx += `[\`']?s?`;
    }

    let { guild, author } = message;
    let addedNotif = global ? await database.add_global_notif(author.id, keyword, keyrgx, type)
                            : await database.add_local_notif(guild.id, author.id, keyword, keyrgx, type);
    if (!addedNotif) {
        return "⚠ Notification with this key word already added.";
    }

    author.send(`You will now be notified when \`${keyword}\` is mentioned ${global ? `globally` : `in \`${guild.name}\``}.`);
    return `Notification added with search mode: \`${type}\`.`; 
    
}

async function remove_notification(message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        return "⚠ Please specify a key word or phrase to remove."
    }

    let keyStart = message.content.match(new RegExp(args.slice(0, global ? 3 : 2).join('\\s+')))[0].length;
    keyphrase = message.content.slice(keyStart).trim().toLowerCase();

    message.delete(500);

    let { guild, author } = message;
    let removed = global  ? await database.remove_global_notif(author.id, keyphrase)
                          : await database.remove_local_notif(guild.id, author.id, keyphrase);
    if (!removed) {
        author.send(`Notification \`${keyphrase}\` does not exist. Please check for spelling errors.`);
        return `⚠ Notification does not exist.`;
    }

    author.send(`You will no longer be notified when \`${keyphrase}\` is mentioned${!global ? ` in \`${guild.name}\`.` : `.`}`)
    return `Notification removed.`;

}

async function clear_notifications(message, global) {

    let { author, guild } = message;
    let cleared = global  ? database.clear_global_notifs(author.id) : database.clear_local_notifs(guild.id, author.id);
    if (!cleared) {
        return global ? `⚠ No notifications to clear.` : `⚠ No notifications in \`${guild.name}\` to clear.`;
    } else {
        return global ? `All global notifications cleared.` : `All notifications in \`${guild.name}\` cleared.`;
    }

}

async function list_notifications(message) {

    let { author } = message;
    let globals = await database.get_global_notifs();
    let locals  = await database.get_local_notifs();
    let notifs  = globals.concat(locals).filter(n => n.userID == author.id);

    if (notifs.length < 1) {
        return "⚠ You don't have any notifications!";
    }

    let notifString = ['**Notifications List**\n__Scope - Type - Keyword__'].concat(notifs.map(notif => {
        let scope;
        if (notif.guildID) {
            let guild = Client.guilds.get(notif.guildID);
            scope = guild ? guild.name : notif.guildID;
        } else {
            scope = 'Global';
        }
        return `\`${scope}\` - \`${notif.type}\` - ${notif.keyword.toLowerCase()}`;
    })).join('\n');

    let pages = [];
    while (notifString.length > 2048 || notifString.split('\n').length > 20) {
        let currString = notifString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        notifString = notifString.slice(lastIndex);

        pages.push(currString);
    } 
    pages.push(notifString);

    for (let page of pages) {
        await author.send(page);
    }

    return "A list of your notifications has been sent to your DMs.";
}

async function ignore_channel(message, args) {

    let { author, guild, channel } = message;

    if (args.length >= 1) {
        let channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return "⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
        channel = guild.channels.get(channel_id);
    }

    if (!channel) {
        return "⚠ Channel doesn't exist in this server.";
    }
    if (channel.type != "text") {
        return "⚠ Channel must be a text channel.";
    }

    let ignored = await database.ignore_channel(author.id, channel.id);
    return ignored ? `You will no longer be sent notifications for messages in ${channel}.`:
                     `You will now be sent notifications for messages in ${channel}.`;

}

async function ignore_server(message) {

    let { author, guild } = message;
    let ignored = await database.ignore_server(author.id, guild.id);
    return ignored ? `You will no longer be sent notifications for messages in this server.`:
                     `You will now be sent notifications for messages in this server.`;

}

async function toggle_dnd(message) {

    let dnd = await database.toggle_dnd(message.author.id);
    return `Do not disturb turned ${dnd ? 'on':'off'}.`

}
