// Require modules

const Discord = require("discord.js");

const database = require("./notifications_db.js");

//Functions

const notify = async (message) => {

    //Fetch stored notifications

    let { guild, channel, author, content, member } = message;
    let chan_blacklist = await database.get_blacklist_channels();
    if (chan_blacklist.find(row => row.channelID == channel.id)) return;
    
    let locals = await database.get_local_notifs(guild.id);
    let globals = await database.get_global_notifs();
    let notifs = locals.concat(globals).filter(n => n.userID != author.id);
    let notified = new Array();

    //Embed template

    let notif_embed = () => {
        let msg = content.length < 1025 ? content
                    : content[1020] == ' '  ? content.slice(0,1020)+'...'
                    : content.slice(0,1021) + '...';
        let msg_url = `https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id}`;
        let colour  =  member.displayColor || 0xffffff;
        return new Discord.RichEmbed()
        .setAuthor(author.tag, author.avatarURL, author.avatarURL)
        .setDescription(`__[View Message](${msg_url})__`)
        .addField("Content", msg)
        .setFooter(`#${channel.name}`)
        .setTimestamp(message.createdAt)
        .setColor(colour);
    }

    //Filter notifications and notify valid users

    for (let notif of notifs) {
        if (notif.guildID && notif.guildID != guild.id || notified.includes(notif.userID)) { 
            continue;
        }

        let dnd = await database.get_dnd(notif.userID);
        if (dnd) continue;

        let member;
        try {
            member = await guild.fetchMember(notif.userID);
        } catch (e) {
            member = null;
        }

        if (!member) continue;
        let can_read = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
        if (!can_read) continue;

        let regxp = new RegExp(notif.keyexp, 'i');
        let match = content.match(regxp);
        if (!match) continue;

        notified.push(notif.userID);
        let alert = `\\💬 ${author} mentioned \`${notif.keyword}\` in ${channel}`;
        member.send(alert, notif_embed());
    }

}

exports.msg = async function (message, args) {

    //Notify

    notify(message);

    //Handle commands

    switch (args[0]) {

        case ".notifications":
        case ".notification":
        case ".notify":
        case ".notif":
        case ".noti":
            switch (args[1]) {

                //global
                case "global":
                    switch (args[2]) {
                        
                        case "add":
                            message.channel.startTyping();
                            add_notification(message, args.slice(3), true).then(response => {
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
                            remove_notification(message, args.slice(3), true).then(response => {
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

                case "blacklist":
                    let perms = ["ADMINISTRATOR", "MANAGE_GUILD", "VIEW_AUDIT_LOG"];
                    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
                    if (!perms.some(p => message.member.hasPermission(p))) break;
                    switch (args[2]) {

                        case "add":
                            switch (args[3]) {

                                case "channel":
                                    message.channel.stopTyping();
                                    add_blacklist_channel(message, args.slice(4)).then(response => {
                                        if (response) message.channel.send(response);
                                        message.channel.stopTyping();
                                    }).catch(error => {
                                        console.error(error);
                                        message.channel.stopTyping();
                                    })
                                    break;

                            }
                            break;

                        case "remove":
                            switch (args[3]) {

                                case "channel":
                                    message.channel.stopTyping();
                                    remove_blacklist_channel(message, args.slice(4)).then(response => {
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

                //local
                case "add":
                    message.channel.startTyping();
                    add_notification(message, args.slice(2)).then(response => {
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
                    remove_notification(message, args.slice(2)).then(response => {
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


                //Misc
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

            }
            break;

    }

}

const add_notification = async function (message, args, global) {

    if (args.length < 1) {
        return "\\⚠ Please specify a key word or phrase to add."
    }

    message.delete(500);
    
    let type;
    let keyphrase;
    if (["STRICT", "NORMAL", "LENIENT"].includes(args[0].toUpperCase()) && args.length > 1) {
        type = args[0].toUpperCase();
        keyword = args.slice(1).join(" ").trim();
    } else {
        type = "NORMAL";
        keyword = args.join(" ").trim();
    }

    let rgxChars = new RegExp(/([\\\|\[\]\(\)\{\}\<\>\^\$\?\!\:\*\=\+\-])/, 'g');
    keyphrase = keyword.replace(rgxChars, "\\$&");

    let keyrgx;
    if (type == "STRICT")  {
        keyrgx = `(^|\\s)${keyphrase}[\`']?s?($|\\s)`;
    }
    if (type == "NORMAL")  {
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
        keyrgx = `(^|\\W)${keyrgx}[\`']?s?($|\\W)`; 
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

    if (args.length < 1) {
        return "\\⚠ Please specify a key word or phrase to add."
    }

    let keyphrase = args.join(" ");

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

const add_blacklist_channel = async function (message, args) {

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
    if (!message.guild.channels.has(channel_id)) {
        return "\\⚠ Channel doesn't exist in this server.";
    }

    let added = database.add_blacklist_channel(guild.id, channel_id);
    if (!added) {
        return `\\⚠ <#${channel_id}> is already blacklisted.`;
    }
    return `<#${channel_id}> is now blacklisted from notifying users.`;

}

const remove_blacklist_channel = async function (message, args) {

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
    if (!message.guild.channels.has(channel_id)) {
        return "\\⚠ Channel doesn't exist in this server.";
    }

    let added = database.remove_blacklist_channel(guild.id, channel_id);
    if (!added) {
        return `\\⚠ <#${channel_id}> is not blacklisted.`;
    }
    return `<#${channel_id}> is no longer blacklisted from notifying users.`;

}

const toggle_dnd = async function (message) {

    let dnd = await database.toggle_dnd(message.author.id);
    return `Do not disturb turned ${dnd ? 'on':'off'}.`

}
