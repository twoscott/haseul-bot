// Require modules

const fs = require('fs');
const process = require('process');

const Discord = require("discord.js");
const Client = require("../haseul.js").Client;

const functions = require("../functions/functions.js");

// Functions

exports.msg = async function(message, args) {

    // Handle commands
    switch (args[0]) {

        case ".botinfo":
        case ".binfo":
        case ".clientinfo":
            message.channel.startTyping();
            botinfo(message).then(() => {
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".serverlist":
        case ".guildlist":
            if (message.author.id != '125414437229297664') {
                break;
            }
            message.channel.startTyping();
            serverlist(message).then(() => {
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }

}

async function botinfo(message) {

    let { guild } = message;

    let stat;
    try {
        stat = fs.readFileSync(`/proc/${process.pid}/stat`);
    } catch(e) {
        console.error(Error(e));
        message.channel.send("⚠ Error occurred.");
    }
    let statArray = stat.toString().split(/(?<!\(\w+)\s(?!\w+\))/i);
    let memory = Math.round((parseInt(statArray[23]) * 4096)/10000)/100;
    let threads = statArray[19];

    let botMember = await guild.fetchMember(Client.user.id);
    let uptime = functions.getDelta(Client.uptime, 'days');
    let uptimeString = "";
    if (uptime.days) uptimeString += `${uptime.days}d `;
    if (uptime.hours) uptimeString += `${uptime.hours}h `;
    if (uptime.minutes) uptimeString += `${uptime.minutes}m `;
    if (uptime.seconds) uptimeString += `${uptime.seconds}s `;

    let status = {
        "0": "<:online_cb:533459049765928970>Ready",
        "1": "<:idle_cb:533459049702752266>Connecting",
        "2": "<:idle_cb:533459049702752266>Reconnecting",
        "3": "<:idle_cb:533459049702752266>Idle",
        "4": "<:idle_cb:533459049702752266>Nearly",
        "5": "<:offline_cb:533459049648226317>Offline"
    }

    let embed = {
        author: { name: `${Client.user.username} Info`, icon_url: Client.user.displayAvatarURL },
        description: `<@${Client.user.id}>`,
        thumbnail: { url: Client.user.displayAvatarURL },
        color: botMember.displayColor || 0xffffff,
        fields: [
            { name: 'Status', value: status[Client.status], inline: true },
            { name: 'Author', value: '<@125414437229297664>', inline: true },
            { name: 'Uptime', value: uptimeString, inline: true },
            { name: 'Ping', value: Math.floor(Client.ping) + 'ms', inline: true },
            { name: 'Bot Joined', value: botMember.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), inline: true },
            { name: 'Bot Created', value: Client.user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), inline: true },
            { name: 'Server Count', value: Client.guilds.size, inline: true },
            { name: 'Cached Users', value: Client.users.size, inline: true },
            { name: 'Memory', value: memory + 'MB', inline: true },
            { name: 'Threads', value: threads, inline: true },
            { name: 'Links', value: '[Website](https://haseulbot.xyz/) - [Discord](https://discord.gg/w4q5qux) - [Patreon](https://www.patreon.com/haseulbot)' }
        ],
        footer: { text: 'Type .help for help' }
    }

    message.channel.send({embed});

}

async function serverlist(message) {

    let guildString = Client.guilds.array().map(guild => `${guild.name} (${guild.id})`).join('\n');

    let descriptions = [];
    while (guildString.length > 2048 || guildString.split('\n').length > 25) {
        let currString = guildString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString   = currString.slice(0, lastIndex);
        guildString = guildString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(guildString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: { name: "Server List" },
                description: desc,
                color: 0xffffff,
                footer: {
                    text: `Page ${i+1} of ${descriptions.length}`
                }
            }}
        }
    })

    functions.pages(message, pages);

}