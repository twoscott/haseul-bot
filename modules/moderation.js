// Require modules

const database = require("../db_queries/mod_db.js");
const Discord = require("discord.js");
const Client = require("../haseul.js").Client;
const serverSettings = require("./server_settings.js");

// Functions

poll = async (message) => {
    let pollOn = await serverSettings.get(message.guild.id, "pollOn");
    if (!pollOn) return;
    let pollChannelIDs = await database.get_poll_channels(message.guild.id, "pollChannel");
    if (pollChannelIDs.map(x => x.channelID).includes(message.channel.id)) {
        await message.react('✅');
        await message.react('❌');
    }
}

exports.msg = async function (message, args) {

    // Check if poll channel
    
    poll(message);

    // Handle commands

    let perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
    if (!perms.some(p => message.member.hasPermission(p))) return;

    switch (args[0]) {

        case ".say":
            message.channel.startTyping();
            say(message, message.content.split(' ').slice(1), false).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".sayraw":
            message.channel.startTyping();
            say(message, message.content.split(' ').slice(1), true).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;
        
        case ".edit":
            message.channel.startTyping();
            edit(message, message.content.split(' ').slice(1), false).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".editraw":
            message.channel.startTyping();
            edit(message, message.content.split(' ').slice(1), true).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".get":
            message.channel.startTyping();
            get(message, args.slice(1), true).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;


        case ".poll":
            switch (args[1]) {

                case "channel":

                    switch (args[2]) {

                        case "add":
                            message.channel.startTyping();
                            addPollChannel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "remove":
                        case "delete":
                            message.channel.startTyping();
                            delPollChannel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;
                
                case "toggle":
                    message.channel.startTyping();
                    togglePoll(message).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    
                    
            }
            break;

        case ".join":
        case ".joins":
        case ".joinlogs":
            switch (args[1]) {

                case "channel":
                    switch (args[2]) {

                        case "set":
                            message.channel.startTyping();
                            setJoinChannel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;
                
                case "toggle":
                    message.channel.startTyping();
                    toggleJoin(message).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

            }


    }
}

// Commands

say = async function (message, args, raw) {

    if (args.length < 1) {
        return `\\⚠ No content provided to be sent.`;
    }

    let channel_id = args[0].match(/<?#?!?(\d+)>?/);
    if (!channel_id) {
        return "\\⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}`";
    }
    channel_id = channel_id[1];

    let channel = Client.channels.get(channel_id);
    if (!channel) {
        return "\\⚠ Invalid channel provided.";
    }
    
    channel.startTyping();
    let attachments = message.attachments.array();
    let files = [];
    for (i=0; i < attachments.length; i++) {
        let attachment = attachments[i];
        let file = {attachment: attachment.url, name: attachment.filename};
        files.push(file);
    }

    let content = args.slice(1).join(" ");
    if (raw) content = content.replace(/^`+|`+$/g, '');

    await channel.send(content, {files: files});
    channel.stopTyping();
    return `Message sent to <#${channel_id}>.`;

}

edit = async function (message, args, raw) {

    if (args.length < 1) {
        return "\\⚠ No content provided to be sent.";
    }

    let channel_id = args[0].match(/<?#?!?(\d+)>?/);        
    if (!channel_id) {
        return "\\⚠ Please provide a message's channel to edit.\nUsage: `.say {channel id} {message id} <new message content>`";
    }
    channel_id = channel_id[1];
    
    let channel = Client.channels.get(channel_id);
    if (!channel) {
        return "\\⚠ Invalid channel provided.";
    }

    let message_id = args[1].match(/^\d+$/);
    if (!message_id) {
        return "\\⚠ No message ID provided.";
    }

    let attachments = message.attachments.array();
    let files = [];
    for (i=0; i < attachments.length; i++) {
        let attachment = attachments[i];
        let file = {attachment: attachment.url, name: attachment.filename};
        files.push(file);
    }

    let content = args.slice(2).join(" ");
    if (raw) content = content.replace(/^`{0,3}|`{0,3}$/g, '');

    let msg = await channel.fetchMessage(message_id);
    await msg.edit(content, {files: files});
    return `Message edited.`;

}

get = async function (message, args) {

    if (args.length < 1) {
        return "\\⚠ Please provide a message ID to be fetched.";
    }

    let channel_id = args[0].match(/<?#?!?(\d+)>?/);        
    if (!channel_id) {
        return "\\⚠ Please provide a message's channel to fetch.\nUsage: `.get {channel id} {message id}`";
    }
    channel_id = channel_id[1];
    
    let channel = Client.channels.get(channel_id);
    if (!channel) {
        return "\\⚠ Invalid channel provided.";
    }

    let message_id = args[1].match(/^\d+$/);
    if (!message_id) {
        return "\\⚠ No message ID provided.";
    }

    let msg = await channel.fetchMessage(message_id);
    message.channel.send(`\`\`\`${msg.content.replace(/```/g, "'''")}\`\`\``);

}

addPollChannel = async function (message, args) {

    let channel_id;
    if (args.length < 1) {
        channel_id = message.channel.id;
    } 
    else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return "\\⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    if (!message.guild.channels.has(channel_id)) {
        return "\\⚠ Channel doesn't exist in this server.";
    }

    added = await database.add_poll_channel(message.guild.id, channel_id);
    return added ? `Poll channel added.` : `Poll channel already added.`;

}

delPollChannel = async function (message, args) {

    let channel_id;
    if (args.length < 1) {
        channel_id = message.channel.id;
    } 
    else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return "\\⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    if (!message.guild.channels.has(channel_id)) {
        return "\\⚠ Channel doesn't exist in this server.";
    }

    removed = await database.del_poll_channel(message.guild.id, channel_id);
    return removed ? `Poll channel removed.` : `Poll channel doesn't exist.`;

}

togglePoll = async function (message) {

    let tog = await serverSettings.toggle(message.guild.id, "pollOn");
    let state = tog ? "on":"off";
    return `Poll setting turned ${state}.`;
}

setJoinChannel = async function (message, args) {

    let channel_id;
    if (args.length < 1) {
        channel_id = message.channel.id;
    } 
    else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return "\\⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    if (!message.guild.channels.has(channel_id)) {
        return "\\⚠ Channel doesn't exist in this server.";
    }
    
    await serverSettings.set(message.guild.id, "joinLogsChan", channel_id)
    return `Join logs channel set to <#${channel_id}>.`;

}

toggleJoin = async function (message) {

    let tog = await serverSettings.toggle(message.guild.id, "joinLogsOn");
    let state = tog ? "on":"off";
    return `Join logs turned ${state}.`;
    
}
