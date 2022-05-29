const Discord = require('discord.js');
const { checkPermissions, embedPages, withTyping } = require('../functions/discord.js');
const { getPrefix } = require('../functions/bot.js');

const database = require('../db_queries/commands_db.js');
const reservedCommands = require('../resources/JSON/commands.json');
const serverSettings = require('../utils/server_settings.js');
const { trimArgs } = require('../functions/functions.js');

async function cmdCheck(message, commandName) {
    const cmd = await database.getCommand(message.guild.id, commandName);
    if (cmd) {
        message.channel.send({ content: cmd })
    }
}

exports.onCommand = async function(message, args) {
    const { channel, member } = message;

    const cmdsOn = serverSettings.get(message.guild.id, 'commandsOn');
    if (cmdsOn) {
        cmdCheck(message, args[0]);
    }

    switch (args[0]) {
    case 'commands':
    case 'command':
    case 'cmds':
    case 'cmd':
        switch (args[1]) {
        case 'add':
            if (cmdsOn) {
                withTyping(channel, addCommand, [message, args]);
            }
            break;
        case 'remove':
        case 'delete':
            if (cmdsOn) {
                withTyping(channel, removeCommand, [message, args[2]]);
            }
            break;
        case 'rename':
            if (cmdsOn) {
                withTyping(channel, renameCommand, [message, args]);
            }
            break;
        case 'edit':
            if (cmdsOn) {
                withTyping(channel, editCommand, [message, args]);
            }
            break;
        case 'list':
            switch (args[2]) {
            case 'raw':
                if (cmdsOn) {
                    listCommandsRaw(message);
                }
                break;
            default:
                if (cmdsOn) {
                    withTyping(channel, listCommands, [message]);
                }
                break;
            }
            break;
        case 'search':
            if (cmdsOn) {
                withTyping(channel, searchCommands, [message, args[2]]);
            }
            break;
        case 'toggle':
            if (checkPermissions(member, ['MANAGE_GUILD', 'MANAGE_CHANNELS'])) {
                withTyping(channel, toggleCommands, [message]);
            }
            break;
        case 'help':
        default:
            if (cmdsOn) {
                channel.send({ content: 'Help with custom commands can be found here: https://haseulbot.xyz/#custom-commands' });
            }
            break;
        }
        break;
    }
};

async function addCommand(message, args) {
    if (args.length < 3) {
        message.channel.send({ content: '⚠ Please provide a command name and text and/or file.' });
        return;
    }

    const files = message.attachments.array();
    if (args.length < 4 && files.length < 1) {
        message.channel.send({ content: '⚠ Please provide text or an uploaded file for a command response.' });
        return;
    }

    const commandName = args[2].toLowerCase();
    if (commandName.length > 30) {
        message.channel.send({ content: '⚠ Command names may not exceed 20 characters in length.' });
        return;
    }

    if (!/^[a-z0-9]+$/.test(commandName)) {
        message.channel.send({ content: '⚠ This command name contains invalid characters, please use characters A-Z and 0-9.' });
        return;
    }

    if (reservedCommands.list.includes(commandName)) {
        message.channel.send({ content: '⚠ This is a reserved command name, please use another name.' });
        return;
    }

    let text = trimArgs(args, 3, message.content);
    const fileUrl = files[0] ? files[0].url : '';
    if (fileUrl) text = [text, fileUrl].join('\n');

    const added = await database
        .addCommand(message.guild.id, commandName, text);
    message.channel.send({ content: added ? `Command \`${commandName}\` was added.` : `⚠ A command with the name \`${commandName}\` already exists.` })
}

async function removeCommand(message, commandName) {
    if (!commandName) {
        message.channel.send({ content: '⚠ Please provide a command name to remove.' });
        return;
    }

    const removed = await database.removeCommand(message.guild.id, commandName);
    message.channel.send({ content: removed ? `Command \`${commandName}\` was removed.` : `⚠ No command with the name \`${commandName}\` was found.` })
}

async function renameCommand(message, args) {
    if (args.length < 3) {
        message.channel.send({ content: '⚠ Please provide a command name and a new name for the command.' });
        return;
    }

    if (args.length < 4) {
        message.channel.send({ content: '⚠ Please provide a new name for the command.' });
        return;
    }

    const commandName = args[2].toLowerCase();
    const newName = args[3].toLowerCase();

    if (!/^[a-z0-9]+$/.test(newName)) {
        message.channel.send({ content: `⚠ \`${newName}\` contains invalid characters \`${newName.replace(/([a-z0-9]+)/g, '')}\`, please use characters A-Z and 0-9.` });
        return;
    }

    if (reservedCommands.list.includes(newName)) {
        message.channel.send({ content: `⚠ \`${newName}\` is a reserved command name, please use another name.` });
        return;
    }

    const command = await database.getCommand(message.guild.id, commandName);
    if (!command) {
        message.channel.send({ content: `⚠ \`${commandName}\` does not exist.` });
        return;
    }

    const renamed = await database
        .renameCommand(message.guild.id, commandName, newName);
    message.channel.send({ content: renamed ? `\`${commandName}\` was renamed to \`${newName}\`.` : `⚠ \`${newName}\` already exists.` })
}

async function editCommand(message, args) {
    if (args.length < 3) {
        message.channel.send({ content: '⚠ Please provide a command name and text and/or file.' });
        return;
    }

    const files = message.attachments.array();
    if (args.length < 4 && files.length < 1) {
        message.channel.send({ content: '⚠ Please provide text or an uploaded file for a command response.' });
        return;
    }

    const commandName = args[2].toLowerCase();
    if (!/^[a-z0-9]+$/.test(commandName)) {
        message.channel.send({ content: '⚠ This command name contains invalid characters, please use characters A-Z and 0-9.' });
        return;
    }

    if (reservedCommands.list.includes(commandName)) {
        message.channel.send({ content: '⚠ This is a reserved command name, please use another name.' });
        return;
    }

    let text = trimArgs(args, 3, message.content);

    const fileUrl = files[0] ? files[0].url : '';
    text = [text, fileUrl].join('\n');

    const edited = await database
        .editCommand(message.guild.id, commandName, text);
    message.channel.send({ content: edited ? `Command \`${commandName}\` was edited.` : `⚠ No command with the name \`${commandName}\` was found.` })
}

async function listCommands(message) {
    const { guild } = message;
    const commands = await database.getCommands(guild.id);
    const commandNames = commands.map(x => x.command);
    if (commandNames.length < 1) {
        message.channel.send({ content: '⚠ There are no commands added to this server.' });
        return;
    }
    const prefix = getPrefix(message.guild.id);
    commandString = commandNames.sort((a, b) => a.localeCompare(b)).map(x => prefix+x).join('\n');

    const descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 25) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        commandString = commandString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(commandString);

    const pages = descriptions.map((desc, i) => ({
        embed: {
            author: {
                name: `${commandNames.length.toLocaleString()} Custom Command${commandNames.length != 1 ? 's':''}`, icon_url: 'https://i.imgur.com/gzL6uIE.png',
            },
            description: desc,
            color: 0x1a1a1a,
            footer: {
                text: `Page ${i+1} of ${descriptions.length}`,
            },
        },
    }));

    embedPages(message, pages);
}

async function listCommandsRaw(message) {
    const { guild } = message;
    let commands = await database.getCommands(guild.id);
    commands = commands.map(x => ({ command: x.command, text: x.text }));

    const jsonFile = Buffer.from(JSON.stringify(commands, null, 4));
    const attachment = new Discord.MessageAttachment(jsonFile, `${guild.name}_custom_commands.json`);

    message.channel.send(attachment);
}

async function searchCommands(message, query) {
    if (!query) {
        message.channel.send({ content: '⚠ Please provide a search query.' });
        return;
    }

    if (query.length > 30) {
        message.channel.send({ content: '⚠ Command names may not exceed 30 characters in length.' });
        return;
    }

    const { guild } = message;
    const commands = await database.getCommands(guild.id);
    let commandNames = commands.map(x => x.command);

    if (commandNames.length < 1) {
        message.channel.send({ content: '⚠ There are no commands added to this server.' });
        return;
    }

    commandNames = commandNames
        .filter(x => x.toLowerCase().includes(query.toLowerCase()));

    if (commandNames.length < 1) {
        message.channel.send({ content: `⚠ No results were found searching for "${query}".` });
        return;
    }

    const prefix = getPrefix(message.guild.id);
    let commandString = commandNames
        .sort((a, b) => a.localeCompare(b))
        .sort((a, b) => {
            const diff = a.length - b.length;
            if (diff == 0) {
                return a.indexOf(query.toLowerCase()) -
                    b.indexOf(query.toLowerCase());
            } else {
                return diff;
            }
        }).map(x => prefix+x).join('\n');

    const descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 25) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            const index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        commandString = commandString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(commandString);

    const pages = descriptions.map((desc, i) => ({
        embed: {
            author: {
                name: `${commandNames.length} Result${commandNames.length != 1 ? 's':'' } Found for "${query}"`, icon_url: 'https://i.imgur.com/gzL6uIE.png',
            },
            description: desc,
            color: 0x1a1a1a,
            footer: {
                text: `Page ${i+1} of ${descriptions.length}`,
            },
        },
    }));

    embedPages(message, pages);
}

async function toggleCommands(message) {
    const tog = await serverSettings.toggle(message.guild.id, 'commandsOn');
    message.channel.send({ content: `Custom commands turned ${tog ? 'on':'off'}.` });
}
