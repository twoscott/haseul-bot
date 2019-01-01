//Require modules

const discord = require("discord.js");
const client = require("../haseul.js").client;
const serverSettings = require("./server_settings.js");

//Functions

poll = async (message) => {
    let pollOn = await serverSettings.get(message.guild.id, "pollOn");
    if (!pollOn) return;
    let pollChannelID = await serverSettings.get(message.guild.id, "pollChannel");
    if (!message.guild.channels.has(pollChannelID)) return;
    if (message.channel.id == pollChannelID) {
        await message.react('✅');
        await message.react('❌');
    }
}

exports.handle = async function (message) {

    let args = message.content.trim().split(" ");

    //Check if poll channel
    
    poll(message);

    //Handle commands

    let perms = ["ADMINISTRATOR", "MANAGE_GUILD", "VIEW_AUDIT_LOG"];
    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
    if (!perms.some(p => message.member.hasPermission(p))) return;

    switch (args[0]) {

        case ".say":
            message.channel.startTyping();
            say(message, args.slice(1), false).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".sayraw":
            message.channel.startTyping();
            say(message, args.slice(1), true).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;
        
        case ".edit":
            message.channel.startTyping();
            edit(message, args.slice(1), false).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".editraw":
            message.channel.startTyping();
            edit(message, args.slice(1), true).then(response => {
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

                        case "set":
                            message.channel.startTyping();
                            setPollChannel(message, args.slice(3)).then(response => {
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

//Commands

say = async function (message, args, raw) {

    if (args.length < 1) {
        return `\\⚠ No content provided to be sent.`;
    }

    let channel_id = args[0].match(/<?#?!?(\d+)>?/);
    if (!channel_id) {
        return "\\⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}`";
    }
    channel_id = channel_id[1];

    let channel = client.channels.get(channel_id);
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
        return `\\⚠ No content provided to be sent.`;
    }

    let channel_id = args[0].match(/<?#?!?(\d+)>?/);        
    if (!channel_id) {
        return "\\⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}`";
    }
    channel_id = channel_id[1];
    
    let channel = client.channels.get(channel_id);
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

setPollChannel = async function (message, args) {

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

    await serverSettings.set(message.guild.id, "pollChannel", channel_id);
    return `Poll channel set to <#${channel_id}>.`;

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
