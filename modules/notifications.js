// Require modules

const Discord = require("discord.js");
const HashSet = require("hashset");

const database = require("../db_queries/notifications_db.js");

// Functions

const notify = async (message) => {

    // Fetch stored notifications
    let { guild, channel, author, content, member } = message;
    let chan_blacklist = await database.get_server_blacklist_channels(guild.id);
    if (chan_blacklist.find(row => row.channelID == channel.id)) return;
    
    let locals = await database.get_local_notifs(guild.id);
    let globals = await database.get_global_notifs();
    let notifs = locals.concat(globals).filter(n => n.userID != author.id);
    let matches = new Map();

    // Embed template
    let notif_embed = () => {
        let msg = content.length < 1025 ? content
                    : content[1020] == ' '  ? content.slice(0,1020)+'...'
                    : content.slice(0,1021) + '...';
        let msg_url = `https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id}`;
        let colour  =  member.displayColor || 0xffffff;
        return new Discord.RichEmbed()
        .setAuthor(author.tag, author.displayAvatarURL, author.displayAvatarURL)
        .setDescription(`__[View Message](${msg_url})__`)
        .addField("Content", msg)
        .setFooter(`#${channel.name}`)
        .setTimestamp(message.createdAt)
        .setColor(colour);
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
        member.send(alert, notif_embed());
    }

}

exports.msg = async function (message, args) {

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

                //Do not Disturb
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

                case "blacklist":
                    let perms = ["ADMINISTRATOR", "MANAGE_GUILD", "VIEW_AUDIT_LOG"];
                    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
                    if (!perms.some(p => message.member.hasPermission(p))) break;
                    switch (args[2]) {

                        case "add":
                            message.channel.stopTyping();
                            add_server_blacklist_channel(message, args.slice(3)).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "remove":
                            message.channel.stopTyping();
                            remove_server_blacklist_channel(message, args.slice(3)).then(response => {
                                if (response) message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;
                        
                    }
                    break;

            }
            break;

    }

}

const add_notification = async function (message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        return "\\⚠ Please specify a key word or phrase to add."
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
        return "\\⚠ Notification with this key word already added.";
    }

    author.send(`You will now be notified when \`${keyword}\` is mentioned ${global ? `globally` : `in \`${guild.name}\``}.`);
    return `Notification added with search mode: \`${type}\`.`; 
    
}

const remove_notification = async function (message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        return "\\⚠ Please specify a key word or phrase to remove."
    }

    let keyStart = message.content.match(new RegExp(args.slice(0, global ? 3 : 2).join('\\s+')))[0].length;
    keyphrase = message.content.slice(keyStart).trim().toLowerCase();

    message.delete(500);

    let { guild, author } = message;
    let removed = global  ? await database.remove_global_notif(author.id, keyphrase)
                          : await database.remove_local_notif(guild.id, author.id, keyphrase);
    if (!removed) {
        author.send(`Notification \`${keyphrase}\` does not exist. Please check for spelling errors.`);
        return `\\⚠ Notification does not exist.`;
    }

    author.send(`You will no longer be notified when \`${keyphrase}\` is mentioned${!global ? ` in \`${guild.name}\`.` : `.`}`)
    return `Notification removed.`;

}

const clear_notifications = async function (message, global) {

    let { author, guild } = message;
    let cleared = global  ? database.clear_global_notifs(author.id) : database.clear_local_notifs(guild.id, author.id);
    if (!cleared) {
        return global ? `\\⚠ No notifications to clear.` : `\\⚠ No notifications in \`${guild.name}\` to clear.`;
    } else {
        return global ? `All global notifications cleared.` : `All notifications in \`${guild.name}\` cleared.`;
    }

}

const list_notifications = async function (message) {

    let { author } = message;
    let globals = await database.get_global_notifs();
    let locals  = await database.get_local_notifs();
    let notifs  = globals.concat(locals).filter(n => n.userID == author.id);

    if (notifs.length < 1) {
        return "\\⚠ You don't have any notifications!";
    }

    let embed = new Discord.RichEmbed()
    .setTitle("Keyword - Scope - Type")
    .setColor(message.member.displayColor || 0xffffff)
    .setFooter(`${notifs.length} Notifications`);
    let description = [];
    for (let notif of notifs) {
        
        let {
            guildID,
            userID,
            keyword,
            type
        } = notif;
        if (author.id != userID) continue;

        let row = [];
        row.push(`**${keyword}**`);
        row.push(guildID ? 'Local' : 'Global');
        row.push(`\`${type}\``);
        description.push(row.join(' - '));

    }

    description = description.join('\n');

    if (description.length > 2048) {
        description = description.slice(0, 2045) + '...';
    }

    message.author.send('📋 Here is a list of notifications you have:', embed.setDescription(description));
    return "A list of your notifications has been sent to your DMs."
}

const add_server_blacklist_channel = async function (message, args) {

    let { guild, channel } = message;
    let channel_id;
    if (args.length < 1) {
        channel_id = channel.id;
    } else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return"\\⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    
    channel = guild.channels.get(channel_id);
    if (!channel) {
        return "\\⚠ Channel doesn't exist in this server.";
    }

    switch (channel.type) {
        case "text":
            let added = database.add_server_blacklist_channel(guild.id, channel_id);
            if (!added) {
                return `\\⚠ <#${channel_id}> is already blacklisted from notifying users.`;
            }
            return `<#${channel_id}> is now blacklisted from notifying users.`;
        case "category":
            if (channel.children.size == 0) return `\\⚠ There are no channels in ${channel.name}`;
            
            let textChans = 0;
            let addedTotal = 0;
            let children = channel.children.array();
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child.type != 'text') continue;
                let added = await database.add_server_blacklist_channel(guild.id, child.id);
                addedTotal += +added; textChans += 1;
            }

            if (textChans <= 0) {
                return `\\⚠ There are no text channels belonging to \`${channel.name}\`.`;
            } else if (addedTotal <= 0) {
                return `\\⚠ All text channels in \`${channel.name}\` are already blacklisted from notifying users.`;
            } else if (addedTotal == channel.children.size) {
                return `All text channels in \`${channel.name}\` are now blacklisted from notifying users.`;
            }
            return `${addedTotal} channel${addedTotal != 1 ? 's':''} in \`${channel.name}\` are now blacklisted from notifying users.`;
        default:
            return `\\⚠ \`${channel.name}\` is not a text chanel.`;
    }

}

const remove_server_blacklist_channel = async function (message, args) {

    let { guild, channel } = message;
    let channel_id;
    if (args.length < 1) {
        channel_id = channel.id;
    } else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return"\\⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    channel = guild.channels.get(channel_id);
    if (!channel) {
        return "\\⚠ Channel doesn't exist in this server.";
    }

    switch (channel.type) {
        case "text":
            let added = database.remove_server_blacklist_channel(guild.id, channel_id);
            if (!added) {
                return `\\⚠ <#${channel_id}> is not blacklisted from notifying users.`;
            }
            return `<#${channel_id}> is no longer blacklisted from notifying users.`;
        case "category":
            if (channel.children.size == 0) return `\\⚠ There are no channels in ${channel.name}`;
            
            let textChans = 0;
            let addedTotal = 0;
            let children = channel.children.array();
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child.type != 'text') continue;
                let added = await database.remove_server_blacklist_channel(guild.id, child.id);
                addedTotal += +added; textChans += 1;
            }

            if (textChans <= 0) {
                return `\\⚠ There are no text channels belonging to \`${channel.name}\`.`;
            } else if (addedTotal <= 0) {
                return `\\⚠ No text channels in \`${channel.name}\` are blacklisted from notifying users.`;
            } else if (addedTotal == channel.children.size) {
                return `All text channels in \`${channel.name}\` are no longer blacklisted from notifying users.`;
            }
            return `${addedTotal} channel${addedTotal != 1 ? 's':''} in \`${channel.name}\` are no longer blacklisted from notifying users.`;
        default:
            return `\\⚠ \`${channel.name}\` is not a text chanel.`;
    }

}

const toggle_dnd = async function (message) {

    let dnd = await database.toggle_dnd(message.author.id);
    return `Do not disturb turned ${dnd ? 'on':'off'}.`

}
