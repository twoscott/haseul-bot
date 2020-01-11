const { 
    checkPermissions,
    resolveMember, 
    resolveMessage, 
    withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const { parseChannelID, trimArgs } = require("../functions/functions.js");

exports.onCommand = async function(message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "say":
            if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                withTyping(channel, say, [message, args]);
            break;
        case "edit":
            if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                withTyping(channel, edit, [message, args]);
            break;
        case "get":
            if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                withTyping(channel, get, [message, args.slice(1)]);
            break;
    }

}

async function say(message, args) {

    let { guild } = message;

    if (args.length < 2) {
        message.channel.send("⚠ No channel provided to send a message to.\nUsage: `.say {channel} {message}`");
        return;
    }

    let channelID = parseChannelID(args[1]);
    if (!channelID) {
        message.channel.send("⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}`");
        return;
    }
    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ Invalid channel provided or channel is not in this server.");
        return;
    }

    let member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send("⚠ Error occurred.");
        return;
    }
    
    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        message.channel.send("⚠ I cannot see this channel!");
        return;
    }
    if (!botPerms.has("SEND_MESSAGES", true)) {
        message.channel.send("⚠ I cannot send messages to this channel!");
        return;
    }
    
    let attachments = message.attachments.array();
    let files = [];
    for (i=0; i < attachments.length; i++) {
        let attachment = attachments[i];
        let file = {attachment: attachment.url, name: attachment.filename};
        files.push(file);
    }

    if (args.length < 3 && files.length < 1) {
        message.channel.send("⚠ No message provided to be sent.\nUsage: `.say {channel} {message}`");
        return;
    }

    channel.startTyping();
    let content = trimArgs(args, 2, message.content);
    await channel.send(content, { files });
    channel.stopTyping();
    message.channel.send(`Message sent to <#${channelID}>.`);

}

async function edit(message, args) {

    let { guild } = message;

    if (args.length < 2) {
        message.channel.send("⚠ No channel provided to edit a message from.");
        return;
    }

    let channelID = parseChannelID(args[1]);      
    if (!channelID) {
        message.channel.send("⚠ No channel provided to edit a message from.");
        return;
    }
    
    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ Invalid channel provided or channel is not in this server.");
        return;
    }

    let member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send("⚠ Error occurred.");
        return;
    }
    
    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        message.channel.send("⚠ I cannot see this channel!");
        return;
    }

    if (args.length < 3) {
        message.channel.send("⚠ No message ID provided to edit.");
    }

    let messageID = args[2].match(/^\d+$/);
    if (!messageID) {
        message.channel.send("⚠ No message ID provided.");
        return;
    }

    let msg = await resolveMessage(channel, messageID);
    if (!msg) {
        message.channel.send("⚠ Invalid message ID provided.");
        return;
    }

    if (args.length < 4) {
        message.channel.send("⚠ No content provided to edit the message with.\nUsage: `.edit {channel id} {message id} <new message content>`");
        return;
    }

    let content = trimArgs(args, 3, message.content);
    await msg.edit(content);
    message.channel.send("Message edited.");

}

async function get(message, args) {

    let { guild } = message;

    if (args.length < 1) {
        message.channel.send("⚠ Please provide a message ID to be fetched.");
        return;
    }

    let channelID = parseChannelID(args[0]);        
    if (!channelID) {
        message.channel.send("⚠ Please provide a message's channel to fetch.\nUsage: `.get {channel id} {message id}`");
        return;
    }
    
    let channel = guild.channels.get(channelID);
    if (!channel) {
        message.channel.send("⚠ Invalid channel provided or channel is not in this server.");
        return;
    }

    let member = await resolveMember(guild, Client.user.id);
    if (!member) {
        message.channel.send("⚠ Error occurred.");
        return;
    }
    
    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        message.channel.send("⚠ I cannot see this channel!");
        return;
    }

    let messageID = args[1].match(/^\d+$/);
    if (!messageID) {
        message.channel.send("⚠ No message ID provided.");
        return;
    }

    let msg = await resolveMessage(channel, messageID);
    if (!msg) {
        message.channel.send("⚠ Invalid message ID provided.");
        return;
    }
    if (msg.content.length < 1) {
        message.channel.send("⚠ Message has no content.");
        return;
    }

    message.channel.send(`${msg.content.includes('```') ? `\` \`\`\`‌‌\` -> \`'''\`\n`:``}\`\`\`${msg.content.replace(/```/g, "'''").slice(0,2048)}\`\`\``);

}
