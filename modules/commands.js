const { checkPermissions, embedPages, withTyping } = require("../functions/discord.js");

const database = require("../db_queries/commands_db.js");
const reservedCommands = require("../resources/JSON/commands.json");
const serverSettings = require("./server_settings.js");
const { trimArgs } = require("../functions/functions.js");

async function cmdCheck(message, commandName) {
    let cmd = await database.getCommand(message.guild.id, commandName);
    if (cmd) {
        message.channel.send(cmd);
    }
}

exports.onCommand = async function(message, args) {

    let { channel, member } = message;

    let cmdsOn = serverSettings.get(message.guild.id, "commandsOn");
    if (cmdsOn) {
        cmdCheck(message, args[0]);
    }

    switch (args[0]) {
        case "commands":
        case "command":
        case "cmds":
        case "cmd":
            switch (args[1]) {
                case "add":
                    if (cmdsOn)
                        withTyping(channel, addCommand, [message, args]);
                    break
                case "remove":
                case "delete":
                    if (cmdsOn)
                        withTyping(channel, removeCommand, [message, args[2]]);
                    break;
                case "rename":
                    if (cmdsOn)
                        withTyping(channel, renameCommand, [message, args]);
                    break;
                case "edit":
                    if (cmdsOn)
                        withTyping(channel, editCommand, [message, args]);
                    break;
                case "list":
                    if (cmdsOn)
                        withTyping(channel, listCommands, [message]);
                    break;
                case "search":
                    if (cmdsOn)
                        withTyping(channel, searchCommands, [message, args[2]]);
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD", "MANAGE_CHANNELS"]))
                        withTyping(channel, toggleCommands, [message]);
                    break;
                case "help":
                default:
                    if (cmdsOn) 
                        channel.send("Help with custom commands can be found here: https://haseulbot.xyz/#custom-commands");
                    break;
            }
            break;
    }
    
}

async function addCommand(message, args) {

    if (args.length < 3) {
        message.channel.send("⚠ Please provide a command name and text and/or file.")
        return;
    }

    let files = message.attachments.array(); 
    if (args.length < 4 && files.length < 1) {
        message.channel.send("⚠ Please provide text or an uploaded file for a command response.")
        return;
    }

    let commandName = args[2].toLowerCase();
    if (commandName.length > 30) {
        message.channel.send("⚠ Command names may not exceed 20 characters in length.")
        return;
    }

    if (!/^[a-z0-9]+$/.test(commandName)) {
        message.channel.send("⚠ This command name contains invalid characters, please use characters A-Z and 0-9.")
        return;
    }

    if (reservedCommands.list.includes(commandName)) {
        message.channel.send("⚠ This is a reserved command name, please use another name.")
        return;
    }

    let text = trimArgs(args, 3, message.content);
    let fileUrl = files[0] ? files[0].url : '';
    text = [text, fileUrl].join('\n');
    
    let added = await database.addCommand(message.guild.id, commandName, text);
    message.channel.send(added ? `Command \`${commandName}\` was added.` : `⚠ A command with the name \`${commandName}\` already exists.`);

}

async function removeCommand(message, commandName) {

    if (!commandName) {
        message.channel.send("⚠ Please provide a command name to remove.")
        return;
    }

    let removed = await database.removeCommand(message.guild.id, commandName);
    message.channel.send(removed ? `Command \`${commandName}\` was removed.` : `⚠ No command with the name \`${commandName}\` was found.`);

}

async function renameCommand(message, args) {

    if (args.length < 3) {
        message.channel.send("⚠ Please provide a command name and a new name for the command.")
        return;
    }

    if (args.length < 4) {
        message.channel.send("⚠ Please provide a new name for the command.")
        return;
    }

    let commandName = args[2].toLowerCase();
    let newName = args[3].toLowerCase();
    
    if (!/^[a-z0-9]+$/.test(newName)) {
        message.channel.send(`⚠ \`${newName}\` contains invalid characters \`${newName.replace(/([a-z0-9]+)/g, '')}\`, please use characters A-Z and 0-9.`)
        return;
    }

    if (reservedCommands.list.includes(newName)) {
        message.channel.send(`⚠ \`${newName}\` is a reserved command name, please use another name.`)
        return;
    }

    let command = await database.getCommand(message.guild.id, commandName);
    if (!command) {
        message.channel.send(`⚠ \`${commandName}\` does not exist.`)
        return;
    }
    
    let renamed = await database.renameCommand(message.guild.id, commandName, newName);
    message.channel.send(renamed ? `\`${commandName}\` was renamed to \`${newName}\`.` : `⚠ \`${newName}\` already exists.`);

}

async function editCommand(message, args) {

    if (args.length < 3) {
        message.channel.send("⚠ Please provide a command name and text and/or file.")
        return;
    }

    let files = message.attachments.array(); 
    if (args.length < 4 && files.length < 1) {
        message.channel.send("⚠ Please provide text or an uploaded file for a command response.")
        return;
    }

    let commandName = args[2].toLowerCase();
    if (!/^[a-z0-9]+$/.test(commandName)) {
        message.channel.send("⚠ This command name contains invalid characters, please use characters A-Z and 0-9.")
        return;
    }

    if (reservedCommands.list.includes(commandName)) {
        message.channel.send("⚠ This is a reserved command name, please use another name.")
        return;
    }

    let text = trimArgs(args, 3, message.content);

    let fileUrl = files[0] ? files[0].url : '';
    text = [text, fileUrl].join('\n');
    
    let edited = await database.editCommand(message.guild.id, commandName, text);
    message.channel.send(edited ? `Command \`${commandName}\` was edited.` : `⚠ No command with the name \`${commandName}\` was found.`);

}

async function listCommands(message) {

    let { guild } = message;
    let commands = await database.getCommands(guild.id);
    let commandNames = commands.map(x => x.command);
    if (commandNames.length < 1) {
        message.channel.send("⚠ There are no commands added to this server.")
        return;
    }
    let prefix = serverSettings.get(message.guild.id, 'prefix');
    commandString = commandNames.sort((a,b) => a.localeCompare(b)).map(x => prefix+x).join('\n');

    let descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 25) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString   = currString.slice(0, lastIndex);
        commandString = commandString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(commandString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: "Custom Commands List", icon_url: 'https://i.imgur.com/gzL6uIE.png'
                },
                description: desc,
                color: 0x1a1a1a,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    embedPages(message, pages);

}

async function searchCommands(message, query) {

    if (!query) {
        message.channel.send("⚠ Please provide a search query.")
        return;
    }

    if (query.length > 30) {
        message.channel.send("⚠ Command names may not exceed 30 characters in length.")
        return;
    }

    let { guild } = message;
    let commands = await database.getCommands(guild.id);
    let commandNames = commands.map(x => x.command);

    if (commandNames.length < 1) {
        message.channel.send("⚠ There are no commands added to this server.")
        return;
    }

    commandNames = commandNames.filter(x => x.toLowerCase().includes(query.toLowerCase()));
    
    if (commandNames.length < 1) {
        message.channel.send(`⚠ No results were found searching for "${query}".`)
        return;
    }
    
    let prefix = serverSettings.get(message.guild.id, 'prefix');
    let commandString = commandNames.sort((a,b) => a.localeCompare(b)).sort((a,b)=> {
        let diff = a.length - b.length;
        if (diff == 0) return a.indexOf(query.toLowerCase()) - b.indexOf(query.toLowerCase());
        else return diff;
    }).map(x => prefix+x).join('\n');

    let descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 25) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString    = currString.slice(0, lastIndex);
        commandString = commandString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(commandString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: `${commandNames.length} Results Found for "${query}"`, icon_url: 'https://i.imgur.com/gzL6uIE.png'
                },
                description: desc,
                color: 0x1a1a1a,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    embedPages(message, pages);

}

async function toggleCommands(message) {

    let tog = await serverSettings.toggle(message.guild.id, "commandsOn");
    message.channel.send(`Custom commands turned ${tog ? "on":"off"}.`);

}
