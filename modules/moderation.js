//Require modules

const discord = require("discord.js");
const client = require("../haseul").client;

//Functions

handle = async (message) => {

    let args = message.content.trim().split(" ");

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

    }
}

say = (message, args, raw) => {
    return new Promise((resolve, reject) => {
        if (args.length < 1) {
            resolve(`\\⚠ No content provided to be sent.`);
            return;
        }

        let channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            resolve("\\⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}`");
            return
        }
        channel_id = channel_id[1];

        let channel = client.channels.get(channel_id);
        if (!channel) {
            resolve ("\\⚠ Invalid channel provided.");
            return;
        }
        
        let attachments = message.attachments.array();
        let files = [];
        for (i=0; i < attachments.length; i++) {
            let attachment = attachments[i];
            let file = {attachment: attachment.url, name: attachment.filename};
            files.push(file);
        }

        let content = args.slice(1).join(" ");
        if (raw) content = content.replace(/^`+|`+$/g, '');
        channel.startTyping();
        channel.send(content, {files: files}).then(() => {
            channel.stopTyping();
            resolve(`Message sent to <#${channel_id}>.`);
        }).catch(error => {
            channel.stopTyping();
            console.error(error);
            resolve("\\⚠ Error occured sending message.");
        })
    })
}

edit = (message, args, raw) => {
    return new Promise((resolve, reject) => {
        if (args.length < 1) {
            resolve(`\\⚠ No content provided to be sent.`);
            return;
        }

        let channel_id = args[0].match(/<?#?!?(\d+)>?/);        
        if (!channel_id) {
            resolve("\\⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}`");
            return
        }
        channel_id = channel_id[1];
        
        let channel = client.channels.get(channel_id);
        if (!channel) {
            resolve("\\⚠ Invalid channel provided.");
            return;
        }

        let message_id = args[1].match(/^\d+$/);
        if (!message_id) {
            resolve("\\⚠ No message ID provided.");
            return;
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
        channel.fetchMessage(message_id).then(msg => {
            msg.edit(content, {files: files});
            resolve(`Message edited.`);
        }).catch(error => {
            console.error(error);
            resolve("\\⚠ Invalid message ID.")
        })
    })
}

module.exports = {
    handle: handle
}
