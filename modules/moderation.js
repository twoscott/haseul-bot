// Require modules

const Client = require("../haseul.js").Client;

const serverSettings = require("./server_settings.js");

const database = require("../db_queries/mod_db.js");

// Functions

async function poll(message) {
    let pollOn = await serverSettings.get(message.guild.id, "pollOn");
    if (!pollOn) return;
    let pollChannelIDs = await database.get_poll_channels(message.guild.id, "pollChannel");
    if (pollChannelIDs.map(x => x.channelID).includes(message.channel.id)) {
        await message.react('✅');
        await message.react('❌');
    }
}

exports.msg = async function(message, args) {

    // Check if poll channel
    
    poll(message);

    // Handle commands

    let perms; 

    switch (args[0]) {

        case ".say":
            perms = ["ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_MESSAGES"];
            if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
            if (!perms.some(p => message.member.hasPermission(p)) && message.author.id != '125414437229297664') break;
            message.channel.startTyping();
            say(message, args).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;
        
        case ".edit":
            perms = ["ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_MESSAGES"];
            if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
            if (!perms.some(p => message.member.hasPermission(p)) && message.author.id != '125414437229297664') break;
            message.channel.startTyping();
            edit(message, args).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".get":
            perms = ["ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_MESSAGES"];
            if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
            if (!perms.some(p => message.member.hasPermission(p)) && message.author.id != '125414437229297664') break;
            message.channel.startTyping();
            get(message, args.slice(1)).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;


        case ".poll":
            perms = ["ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_CHANNELS"];
            if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
            if (!perms.some(p => message.member.hasPermission(p))) break;
            switch (args[1]) {

                case "channel":

                    switch (args[2]) {

                        case "add":
                            message.channel.startTyping();
                            addPollChannel(message, args.slice(3)).then(response => {
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
                            delPollChannel(message, args.slice(3)).then(response => {
                            if (response) message.channel.send(response);
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

// Commands

async function say(message, args) {

    let { guild } = message;

    if (args.length < 2) {
        return "⚠ No channel provided to send a message to.\nUsage: `.say {channel} {message}`";
    }

    let channel_id = args[1].match(/<?#?!?(\d+)>?/);
    if (!channel_id) {
        return "⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}`";
    }
    channel_id = channel_id[1];

    let channel = guild.channels.get(channel_id);
    if (!channel) {
        return "⚠ Invalid channel provided or channel is not in this server.";
    }

    let member;
    try {
        member = await guild.fetchMember(Client.user.id);
    } catch (e) {
        member = null;
    }
    if (!member) {
        return "⚠ Error occurred.";
    }
    
    let botCanRead = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
    if (!botCanRead) {
        return "⚠ I cannot see this channel!";
    }
    
    let attachments = message.attachments.array();
    let files = [];
    for (i=0; i < attachments.length; i++) {
        let attachment = attachments[i];
        let file = {attachment: attachment.url, name: attachment.filename};
        files.push(file);
    }

    if (args.length < 3 && files.length < 1) {
        return "⚠ No message provided to be send.\nUsage: `.say {channel} {message}`";
    }

    channel.startTyping();
    let contentStart = message.content.match(new RegExp(args.slice(0,2).map(x=>x.replace(/([\\\|\[\]\(\)\{\}\.\^\$\?\*\+])/g, "\\$&")).join('\\s+')))[0].length;
    let content = message.content.slice(contentStart).trim();

    await channel.send(content, {files: files});
    channel.stopTyping();
    return `Message sent to <#${channel_id}>.`;

}

async function edit(message, args) {

    let { guild } = message;

    if (args.length < 2) {
        return "⚠ No channel provided to edit a message from.";
    }

    let channel_id = args[1].match(/<?#?!?(\d+)>?/);        
    if (!channel_id) {
        return "⚠ No channel provided to edit a message from.";
    }
    channel_id = channel_id[1];
    
    let channel = guild.channels.get(channel_id);
    if (!channel) {
        return "⚠ Invalid channel provided or channel is not in this server.";
    }

    let member;
    try {
        member = await guild.fetchMember(Client.user.id);
    } catch (e) {
        member = null;
    }
    if (!member) {
        return "⚠ Error occurred.";
    }
    
    let botCanRead = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
    if (!botCanRead) {
        return "⚠ I cannot see this channel!";
    }

    if (args.length < 3) {
        return "⚠ No message ID provided to edit.";
    }

    let message_id = args[2].match(/^\d+$/);
    if (!message_id) {
        return "⚠ No message ID provided.";
    }

    let msg = channel.messages.get(message_id);
    if (!msg) {
        try {
            msg = await channel.fetchMessage(message_id);
        } catch (e) {
            return "⚠ Invalid message ID provided.";
        }
    }

    if (args.length < 4) {
        return "⚠ No content provided to edit the message with.\nUsage: `.edit {channel id} {message id} <new message content>`";
    }

    let contentStart = message.content.match(new RegExp(args.slice(0,3).map(x=>x.replace(/([\\\|\[\]\(\)\{\}\.\^\$\?\*\+])/g, "\\$&")).join('\\s+')))[0].length;
    let content = message.content.slice(contentStart).trim();

    await msg.edit(content);
    return "Message edited.";

}

async function get(message, args) {

    let { guild } = message;

    if (args.length < 1) {
        return "⚠ Please provide a message ID to be fetched.";
    }

    let channel_id = args[0].match(/<?#?!?(\d+)>?/);        
    if (!channel_id) {
        return "⚠ Please provide a message's channel to fetch.\nUsage: `.get {channel id} {message id}`";
    }
    channel_id = channel_id[1];
    
    let channel = guild.channels.get(channel_id);
    if (!channel) {
        return "⚠ Invalid channel provided or channel is not in this server.";
    }

    let member;
    try {
        member = await guild.fetchMember(Client.user.id);
    } catch (e) {
        member = null;
    }
    if (!member) {
        return "⚠ Error occurred.";
    }
    
    let botCanRead = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
    if (!botCanRead) {
        return "⚠ I cannot see this channel!";
    }

    let message_id = args[1].match(/^\d+$/);
    if (!message_id) {
        return "⚠ No message ID provided.";
    }

    let msg = await channel.fetchMessage(message_id);
    if (!msg) return "⚠ Invalid message provided.";
    if (msg.content.length < 1) return "⚠ Message has no content.";
    message.channel.send(`${msg.content.includes('```') ? `\` \`\`\`‌‌\` -> \`'''\`\n`:``}\`\`\`${msg.content.replace(/```/g, "'''").slice(0,2048)}\`\`\``);

}

async function addPollChannel(message, args) {

    let channel_id;
    if (args.length < 1) {
        channel_id = message.channel.id;
    } else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return "⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    if (!message.guild.channels.has(channel_id)) {
        return "⚠ Channel doesn't exist in this server.";
    }

    added = await database.add_poll_channel(message.guild.id, channel_id);
    return added ? `Poll channel added.` : `Poll channel already added.`;

}

async function delPollChannel(message, args) {

    let channel_id;
    if (args.length < 1) {
        channel_id = message.channel.id;
    } 
    else {
        channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            return "⚠ Invalid channel or channel ID.";
        }
        channel_id = channel_id[1];
    }
    if (!message.guild.channels.has(channel_id)) {
        return "⚠ Channel doesn't exist in this server.";
    }

    removed = await database.del_poll_channel(message.guild.id, channel_id);
    return removed ? `Poll channel removed.` : `Poll channel doesn't exist.`;

}

async function togglePoll(message) {

    let tog = await serverSettings.toggle(message.guild.id, "pollOn");
    return `Poll setting turned ${tog ? "on":"off"}.`;

}
