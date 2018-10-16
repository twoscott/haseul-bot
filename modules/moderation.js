//Require modules

const discord = require("discord.js");
const client = require("../haseul").client;

//Functions

handle = (message) => {

    let args = message.content.trim().split(" ");

    //Handle commands

    let perms = ["ADMINISTRATOR", "MANAGE_GUILD", "VIEW_AUDIT_LOG"];
    if (!perms.some(p => message.member.hasPermission(p))) return;

    switch (args[0]) {

        case ".say":
            message.channel.startTyping();
            say(message, args.slice(1)).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }
}

say = (message, args) => {
    return new Promise((resolve, reject) => {
        let channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            resolve("\\⚠ Please provide a channel to send the message to.\nUsage: `.say {channel} {message}");
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
            let file = {attachment: attachment.url, name: attachment.filename}
            files.push(file);
        }

        let content = args.slice(1).join(" ");
        channel.send(content, {files: files}).then(() => {
            resolve(`Message sent to <#${channel_id}>.`)
        }).catch(error => {
            console.error(error);
            resolve("Error occured sending message.")
        })

    })
}

module.exports = {
    handle: handle
}
