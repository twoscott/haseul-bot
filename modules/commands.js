// Require modules

const functions = require("../functions/functions.js");
const reservedCommands = require("../resources/JSON/commands.json");
const serverSettings = require("./server_settings.js");

const database = require("../db_queries/commands_db.js");

// Functions

async function cmdCheck(message, commandName) {

    let cmdsOn = await serverSettings.get(message.guild.id, "commandsOn");
    if (!cmdsOn) return;
    let cmd = await database.get_command(message.guild.id, commandName);
    if (!cmd) return;

    await message.channel.send(cmd);

}

exports.msg = async function(message, args) {

    // Check if custom command

    if (args[0].startsWith('.')) {
        cmdCheck(message, args[0].replace(/^\./, ''));
    }

    // Handle commands

    switch (args[0]) {

        case ".commands":
        case ".command":
        case ".cmds":
        case ".cmd":
            switch(args[1]) {

                case "add":
                        message.channel.startTyping();
                        addCommand(message, args).then(response => {
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
                        delCommand(message, args[2]).then(response => {
                            if (response) message.channel.send(response);
                            message.channel.stopTyping();
                        }).catch(error => {
                            console.error(error);
                            message.channel.stopTyping();
                        })
                        break;

                case "edit":
                        message.channel.startTyping();
                        editCommand(message, args).then(response => {
                            if (response) message.channel.send(response);
                            message.channel.stopTyping();
                        }).catch(error => {
                            console.error(error);
                            message.channel.stopTyping();
                        })
                        break;

                case "list":
                    message.channel.startTyping();
                    listCommands(message).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;  

                case "search":
                    message.channel.startTyping();
                    searchCommands(message, args[2]).then(response => {
                        if (response) message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;
                    
                case "toggle":
                    message.channel.startTyping();
                    toggleCommands(message).then(response => {
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

async function addCommand(message, args) {

    if (args.length < 3) {
        return "⚠ Please provide a command name and text and/or file.";
    }

    let files = message.attachments.array(); 
    if (args.length < 4 && files.length < 1) {
        return "⚠ Please provide text or an uploaded file for a command response.";
    }

    let commandName = args[2].toLowerCase();
    if (commandName.length > 30) {
        return "⚠ Command names may not exceed 20 characters in length.";
    }

    if (!/^[\x00-\x7F]+$/.test(commandName)) {
        return "⚠ This command name contains invalid characters, please use standard characters.";
    }

    if (reservedCommands.list.includes(commandName)) {
        return "⚠ This is a reserved command name, please use another name.";
    }

    let textStart = message.content.match(new RegExp(args.slice(0,3).join('\\s+')))[0].length;
    let text = message.content.slice(textStart).trim();

    let fileUrl = files[0] ? files[0].url : '';
    text = [text, fileUrl].join('\n');
    
    let added = await database.add_command(message.guild.id, commandName, text);
    return added ? `Command \`.${command_name}\` was added.` : `⚠ A command with the name \`${command_name}\` already exists.`;

}

async function delCommand(message, commandName) {

    if (!commandName) {
        return "⚠ Please provide a command name to remove.";
    }

    let removed = await database.remove_command(message.guild.id, commandName);
    return removed ? `Command \`.${command_name}\` was removed.` : `⚠ No command with the name \`${command_name}\` was found.`;

}

async function editCommand(message, args) {

    if (args.length < 3) {
        return "⚠ Please provide a command name and text and/or file.";
    }

    let files = message.attachments.array(); 
    if (args.length < 4 && files.length < 1) {
        return "⚠ Please provide text or an uploaded file for a command response.";
    }

    let commandName = args[2].toLowerCase();
    if (!/^[\x00-\x7F]+$/.test(commandName)) {
        return "⚠ This command name contains invalid characters, please use standard characters.";
    }

    if (reservedCommands.list.includes(commandName)) {
        return "⚠ This is a reserved command name, please use another name.";
    }

    let textStart = message.content.match(new RegExp(args.slice(0,3).join('\\s+')))[0].length;
    let text = message.content.slice(textStart).trim();

    let fileUrl = files[0] ? files[0].url : '';
    text = [text, fileUrl].join('\n');
    
    let edited = await database.edit_command(message.guild.id, commandName, text);
    return edited ? `Command \`.${command_name}\` was edited.` : `⚠ No command with the name \`${command_name}\` was found.`;

}

async function listCommands(message) {

    let { guild } = message;
    let commandNames = await database.get_commands(guild.id);
    if (commandNames.length < 1) {
        return "⚠ There are no commands added to this server.";
    }
    commandString = commandNames.sort((a,b) => a.localeCompare(b)).map(x => '.'+x).join('\n');

    let descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 20) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
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
            attachments: {embed: {
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

    functions.pages(message, pages);

}

async function searchCommands(message, query) {

    if (!query) {
        return "⚠ Please provide a search query.";
    }

    if (query.length > 30) {
        return "⚠ Command names may not exceed 30 characters in length.";
    }

    let { guild } = message;
    let commandNames = await database.get_commands(guild.id);

    if (commandNames.length < 1) {
        return "⚠ There are no commands added to this server.";
    }

    commandNames = commandNames.filter(x => x.toLowerCase().includes(query.toLowerCase()));
    
    if (commandNames.length < 1) {
        return `⚠ No results were found searching for "${query}".`;
    }
    
    let commandString = commandNames.sort((a,b) => a.localeCompare(b)).sort((a,b)=> {
        let diff = query.length / b.length - query.length / a.length;
        if (diff == 0) return a.indexOf(query.toLowerCase()) - b.indexOf(query.toLowerCase());
        else return diff;
    }).map(x => '.'+x).join('\n');

    let descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 20) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 20; i++) {
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
            attachments: {embed: {
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

    functions.pages(message, pages);

}

async function toggleCommands(message) {

    let tog = await serverSettings.toggle(message.guild.id, "commandsOn");
    return `Custom commands turned ${tog ? "on":"off"}.`;

}
