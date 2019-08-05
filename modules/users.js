// Require modules

const Discord = require("discord.js");
const axios = require("axios");

const Client = require("../haseul.js").Client;
const functions = require("../functions/functions.js");
const serverSettings = require("./server_settings.js");
const Image = require("../functions/images.js");

// Functions

async function log(member, colour, logEvent) {

    // Check if logs on
    let logsOn = await serverSettings.get(member.guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = await serverSettings.get(member.guild.id, "joinLogsChan");
    if (!member.guild.channels.has(logChannelID)) return;
    if (logChannelID) logEvent(member, logChannelID, colour); //Log

}

async function getMemberNo(member) {

    let guild = await member.guild.fetchMembers();

    let members = guild.members.array();
    members = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    let memNo = members.findIndex(e => e.id == member.id) + 1;
    return memNo;

}

// Join

exports.join = async function(member) {

    let colour = functions.randomHexColor();
    welcome(member, colour);
    log(member, colour, logJoin);

}

// Leave

exports.leave = async function(member) {

    let colour = functions.randomHexColor();
    log(member, colour, logLeave);

}

// Welcome 

async function welcome(member, colour) {
    
    let {
        user,
        guild
    } = member;

    if (user.bot) return;
    let welcomeOn = await serverSettings.get(member.guild.id, "welcomeOn");
    if (!welcomeOn) return;
    let welcomeChannelID = await serverSettings.get(member.guild.id, "welcomeChan");
    if (!member.guild.channels.has(welcomeChannelID)) return;
    if (!welcomeChannelID) return;

    let memNo = await getMemberNo(member);
    let defaultMsg = `**{username}**#{discriminator} has ${['arrived', 'joined', 'appeared'][Math.floor(Math.random() * 3)]}!`;
    let welcomeMsg = await serverSettings.get(member.guild.id, "welcomeMsg");

    let embed = new Discord.RichEmbed()
    .setAuthor(`New Member!`, null, user.displayAvatarURL)
    .setThumbnail(user.displayAvatarURL)
    .setDescription((welcomeMsg || defaultMsg).replace('{default}', defaultMsg).replace('{user}', user).replace('{username}', user.username).replace('{discriminator}', user.discriminator).replace('{usertag}', user.tag).replace('{server}', guild.name).replace('{memberno}', memNo))
    .setColor(colour)
    .setFooter(`Member #${memNo} 🎐`)
    .setTimestamp(member.joinedTimestamp);

    let channel = Client.channels.get(welcomeChannelID) || guild.channels.get(welcomeChannelID);
    channel.send(embed);

}

// Logs

async function logJoin(member, destination, colour) {
    
    let memNo = await getMemberNo(member);
    let {
        user,
        guild
    } = member;
    let embed = new Discord.RichEmbed()
    .setAuthor("Member joined!")
    .setTitle(user.tag)
    .setThumbnail(user.displayAvatarURL)
    .setDescription(`${user} joined ${guild}!`)
    .addField("Joined On", member.joinedAt.toGMTString().replace(' GMT', ' UTC'), true)
    .addField("Account Created On", user.createdAt.toGMTString().replace(' GMT', ' UTC'), true)
    .addField("User ID", user.id)   
    .setFooter(`Member #${memNo}`)
    .setColor(colour);
    
    let channel = Client.channels.get(destination) || guild.channels.get(destination);
    channel.send(embed);
}

const logLeave = async function (member, destination, colour) {

    member.leftAt = new Date(Date.now());
    let {
        user,
        guild
    } = member;
    let embed = new Discord.RichEmbed()
    .setAuthor("Member left!")
    .setTitle(user.tag)
    .setThumbnail(user.displayAvatarURL)
    .setDescription(`${user} left ${guild}!`)
    .addField("Left On", member.leftAt.toGMTString().replace(' GMT', ' UTC'), true)
    .addField("Account Created On", user.createdAt.toGMTString().replace(' GMT', ' UTC'), true)
    .addField("User ID", user.id)
    .setColor(colour);
    
    let channel = Client.channels.get(destination) || guild.channels.get(destination);
    channel.send(embed);

}

// Message

exports.msg = async function(message, args) {

    let perms;

    // Handle commands
    
    switch (args[0]) {

        case ".userinfo":
        case ".uinfo":
        case ".memberinfo":
        case ".meminfo":
            message.channel.startTyping();
            userinfo(message, args).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".avatar":
        case ".dp":
            message.channel.startTyping();
            user_dp(message, args).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

        case ".join":
        case ".joins":
        case ".joinlogs":
            perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
            if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
            if (!perms.some(p => message.member.hasPermission(p))) return;
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
            break;

        case ".welcome":
            perms = ["ADMINISTRATOR", "MANAGE_GUILD"];
            if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
            if (!perms.some(p => message.member.hasPermission(p))) return;
            switch (args[1]) {

                case "channel":
                    switch (args[2]) {

                        case "set":
                            message.channel.startTyping();
                            setWelcomeChannel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;

                case "message":
                case "msg":
                    switch(args[2]) {

                        case "set":
                            message.channel.startTyping();
                            setWelcomeMsg(message, args).then(response => {
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
                    toggleWelcome(message).then(response => {
                        message.channel.send(response);
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



// Userinfo
async function userinfo(message, args) {

    let { author, guild } = message;
    let target = args[1];
    let user_id;

    if (!target) {
        user_id = author.id;
    } else {
        let match = target.match(/^<?@?!?(\d{8,})>?$/);
        if (!match) {
            let textStart = message.content.match(new RegExp(args.slice(0, 1).join('\\s+')))[0].length;
            target = message.content.slice(textStart).trim();
            guild = await guild.fetchMembers();

            let member = await functions.searchMembers(guild, target)
            if (!member) {
                return "⚠ Invalid user or user ID.";
            }
                
            user_id = member.id;
        } else {
            user_id = match[1];
        }
    }

    try {
        let member = await guild.fetchMember(user_id);
        return member_embed(author, member);
    } catch (e) {
        try {
            let user = await Client.fetchUser(user_id)
            return user_embed(user);
        } catch (e) {
            console.error(e);
            return "⚠ Invalid user.";
        }

    }

}

async function member_embed(author, member) {

    let { user, guild } = member;
    let lastMsg = member.lastMessage

    let status = {
        "online" : "<:online_cb:533459049765928970>Online",
        "idle"   : "<:idle_cb:533459049702752266>Idle",
        "dnd"    : "<:dnd_cb:533459049547563008>Do Not Disturb", 
        "offline": "<:offline_cb:533459049648226317>Offline"
    }

    let embed = new Discord.RichEmbed()
    .setAuthor(user.tag, user.displayAvatarURL)
    .setURL(user.displayAvatarURL.split('?')[0]+'?size=1024')
    .setDescription(user)
    .setThumbnail(user.displayAvatarURL)
    .setColor(member.displayColor || 0xffffff)
    .setFooter(`Member #${await getMemberNo(member)}`)
    .setTimestamp(member.joinedAt)
    .addField("Status", status[user.presence.status], true)
    .addField("User ID", user.id, true)
    .addField("Joined On",  member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), true)
    .addField("Account Created", user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), true);

    if (lastMsg && user.id != author.id) {
        embed.addField("Last Seen", `[View Message](https://discordapp.com/channels/${guild.id}/${lastMsg.channel.id}/${lastMsg.id} "Go To User's Last Message")`, true);
    }

    if (member.roles && member.roles.size > 1) {
        let allRoles = member.roles.array().sort((a, b) => b.comparePositionTo(a)).slice(0,-1);
        let modRoles = [];
        let roles = [];
        let perms = [
            "ADMINISTRATOR", "MANAGE_GUILD", "VIEW_AUDIT_LOG", 
            "KICK_MEMBERS", "BAN_MEMBERS"
        ];
        for (let role of allRoles) {
            if (perms.some(p => role.hasPermission(p, false, true))) {
                modRoles.push(role);
            } else {
                roles.push(role);
            }
        }
        if (modRoles.length > 0) {
            modRoles = modRoles.join(" ");
            if (modRoles.length > 1024) {
                modRoles = modRoles.substring(0, 1024);
                modRoles = modRoles.substring(0, modRoles.lastIndexOf('>')+1);
                modRoles += '.'.repeat(modRoles.length > 1021 ? 1024-roles.length : 3);
            }
            embed.addField("Mod Roles", modRoles, true);
        }
        if (roles.length > 0) {
            roles = roles.join(" ");
            if (roles.length > 1024) {
                roles = roles.substring(0, 1024);
                roles = roles.substring(0, roles.lastIndexOf('>')+1);
                roles += '.'.repeat(roles.length > 1021 ? 1024-roles.length : 3);
            }
            embed.addField("Roles", roles, true);
        }
    }

    return embed;

}

async function user_embed(user) {

    let status = {
        "online" : "<:online:532078078063673355>Online",
        "offline": "<:offline:532078078210473994>Offline",
        "idle"   : "<:idle:532078078269194263>Idle",
        "dnd"    : "<:dnd:532078078382571540>Do Not Disturb" 
    }

    let embed = new Discord.RichEmbed()
    .setAuthor(user.tag, user.displayAvatarURL)
    .setURL(user.displayAvatarURL.split('?')[0]+'?size=1024')
    .setDescription(user)
    .setThumbnail(user.displayAvatarURL)
    .setColor(0xffffff)
    .setFooter(`User not in server`)
    .setTimestamp(user.createdAt)
    .addField("Status", status[user.presence.status], true)
    .addField("User ID", user.id, true)
    .addField("Account Created", user.createdAt.toUTCString().replace(' GMT', ' UTC'), true);

    return embed;
    
}

//User's avatar
async function user_dp(message, args) {

    let { author, guild } = message;
    let target = args[1];
    let user_id;

    if (!target) {
        user_id = author.id;
    } else {
        let match = target.match(/^<?@?!?(\d{8,})>?$/);
        if (!match) {
            let textStart = message.content.match(new RegExp(args.slice(0, 1).join('\\s+')))[0].length;
            target = message.content.slice(textStart).trim();
            guild = await guild.fetchMembers();

            let member = await functions.searchMembers(guild, target)
            if (!member) {
                return "⚠ Invalid user or user ID.";
            }
                
            user_id = member.id;
        } else {
            user_id = match[1];
        }
    }

    let member;
    let user;
    try {
        member = await guild.fetchMember(user_id);
        user = member.user;
    } catch (e) {
        try {
            user = await Client.fetchUser(user_id)  
        } catch (e) {
            console.error(e);
            return "⚠ Invalid user.";
        }
    }

    let res = await axios.get(user.displayAvatarURL.split('?')[0] + '?size=2048', {responseType: 'arraybuffer'});
    let img_size = Math.max(Math.round(res.headers['content-length']/10000)/100, 1/100);
    let img_type = res.headers['content-type'].split('/')[1];

    let img  = new Image(res.data);
    let dims = img.dimensions;
    let username = user.username;
    let p = username.toLowerCase().endsWith('s') ? "'" : "'s";

    return new Discord.RichEmbed()
    .setAuthor(`${username+p} Avatar`)
    .setImage(user.displayAvatarURL.split('?')[0] + '?size=2048')
    .setColor(member ? member.displayColor || 0xffffff : 0xffffff)
    .setFooter(`Type: ${img_type.toUpperCase()}  |  Size: ${dims ? dims.join('x') + ' - ':''}${img_size}MB`);
}

async function setJoinChannel(message, args) {

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
    
    await serverSettings.set(message.guild.id, "joinLogsChan", channel_id)
    return `Join logs channel set to <#${channel_id}>.`;

}

async function toggleJoin(message) {

    let tog = await serverSettings.toggle(message.guild.id, "joinLogsOn");
    return `Join logs turned ${tog ? "on":"off"}.`;
    
}



async function setWelcomeChannel(message, args) {

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
    
    await serverSettings.set(message.guild.id, "welcomeChan", channel_id)
    return `Welcome channel set to <#${channel_id}>.`;

}

async function setWelcomeMsg(message, args) {

    if (args.length < 4) {
        return "⚠ Please provide a message.";
    }
    let msgStart = message.content.match(new RegExp(args.slice(0,3).join('\\s+')))[0].length;
    let msg = message.content.slice(msgStart).trim();   
    await serverSettings.set(message.guild.id, "welcomeMsg", msg)
    return "Welcome message set.";

}

async function toggleWelcome(message) {

    let tog = await serverSettings.toggle(message.guild.id, "welcomeOn");
    return `Welcome turned ${tog ? "on":"off"}.`;

}
