//Require modules

const Discord = require("discord.js");
const axios = require("axios");

const Client = require("../haseul.js").Client;
const serverSettings = require("./server_settings.js");
const Image = require("../functions/images.js");

//Functions

log = async (member, logEvent) => {

    //Check if logs on
    let logsOn = await serverSettings.get(member.guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = await serverSettings.get(member.guild.id, "joinLogsChan");
    if (!member.guild.channels.has(logChannelID)) return;
    if (logChannelID) logEvent(member, logChannelID); //Log

}

getMemberNo = async (member) => {

    let guild = await member.guild.fetchMembers();

    let members = guild.members.array();
    members = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    let memNo = members.findIndex(e => e.id == member.id) + 1;
    return memNo;

}

// getUserPosts = async (guild, user) => {

//     let user = await user_db.getPosts(guild.id, user.id);
//     if (!user) {
//         return [0, null];   
//     }

//     let posts = userPosts[user.id].postCount;
//     let lastMsg = {
//         channel: {
//             id: userPosts[user.id].lastMsgChanID
//         },
//         id: userPosts[user.id].lastMsgID
//     }
//     return [posts, lastMsg];

// }

//Join

exports.join = async function (member) {

    log(member, logJoin);

}

//Leave

exports.leave = async function (member) {

    log(member, logLeave);

}

//Logs

logJoin = async function (member, destination) {
    
    let memNo = await getMemberNo(member);
    let {
        user,
        guild
    } = member;
    let embed = new Discord.RichEmbed()
    .setAuthor("Member joined!")
    .setTitle(user.tag)
    .setThumbnail(user.avatarURL)
    .setDescription(`${user} joined ${guild}!`)
    .addField("Joined On", member.joinedAt.toGMTString(), true)
    .addField("Account Created On", user.createdAt.toGMTString(), true)
    .addField("User ID", user.id)   
    .setFooter(`Member #${memNo}`)
    .setColor(0x13ef67);
    Client.channels.get(destination).send(embed);

}

logLeave = async function (member, destination) {

    member.leftAt = new Date(Date.now());
    let {
        user,
        guild
    } = member;
    let embed = new Discord.RichEmbed()
    .setAuthor("Member left!")
    .setTitle(user.tag)
    .setThumbnail(user.avatarURL)
    .setDescription(`${user} left ${guild}!`)
    .addField("Left On", member.leftAt.toGMTString(), true)
    .addField("Account Created On", user.createdAt.toGMTString(), true)
    .addField("User ID", user.id)
    .setColor(0xef1354);
    Client.channels.get(destination).send(embed);

}

//Message

exports.msg = async function (message, args) {

    //Handle commands
    switch (args[0]) {

        case ".userinfo":
        case ".uinfo":
        case ".memberinfo":
        case ".meminfo":
            message.channel.startTyping();
            userinfo(message, args.slice(1)).then(response => {
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
            user_dp(message, args.slice(1)).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }

}

searchMembers = (members, target) => {
   
    let member;
    
    member = members.find(m => m.user.tag.toLowerCase() == target.replace(/^@/, ''));
    if (!member) {
        member = members.find(m => m.user.username.toLowerCase() == target);
    }
    if (!member) {
        member = members.find(m => m.user.username.toLowerCase().includes(target));
    }
    if (!member) {
        member = members.find(m => m.nickname ? m.nickname.toLowerCase() == target : false);
    }
    if (!member) {
        member = members.find(m => m.nickname ? m.nickname.toLowerCase().includes(target) : false);
    }
    if (!member) {
        member = null
    }

    return member;

}

//Userinfo
const userinfo = async function (message, args) {

    let { author, guild } = message;
    let target = args[0];
    let user_id;

    if (!target) {
        user_id = author.id;
    } else {
        let match = target.match(/^<?@?!?(\d{8,})>?$/);
        if (!match) {
            target = args.join(' ').toLowerCase();
            guild = await guild.fetchMembers();

            let member = searchMembers(guild.members, target)
            if (!member) {
                return "\\⚠ Invalid user or user ID.";
            }
                
            user_id = member.id;
        } else {
            user_id = match[1];
        }
    }

    try {
        let member = await guild.fetchMember(user_id);
        return member_embed(member);
    } catch (e) {
        try {
            let user = await Client.fetchUser(user_id)
            return user_embed(user, guild);
        } catch (e) {
            console.error(e);
            return "\\⚠ Invalid user.";
        }

    }

}

const member_embed = async (member) => {

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
    .addField("Joined On",  member.joinedAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true)
    .addField("User ID", user.id, true)
    .addField("Account Created", user.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ''), true);

    if (lastMsg) {
        embed.addField("Last Seen", `[View Message](https://discordapp.com/channels/${guild.id}/${lastMsg.channel.id}/${lastMsg.id} "Go To User's Last Message")`);
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
            modRoles = modRoles.join(' ');
            if (modRoles.length > 1024) {
                modRoles = modRoles.substring(0, 1024);
                modRoles = modRoles.substring(0, modRoles.lastIndexOf('>')+1);
                modRoles += '.'.repeat(modRoles.length > 1021 ? 1024-roles.length : 3);
            }
            embed.addField("Mod Roles", modRoles, true);
        }
        if (roles.length > 0) {
            roles = roles.join(' ');
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

const user_embed = async (user) => {

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
    .addField("Account Created", user.createdAt.toUTCString(), true);

    return embed;
    
}

//User's avatar
user_dp = async function (message, args) {

    let { author, guild } = message;
    let target = args[0];
    let user_id;

    if (!target) {
        user_id = author.id;
    } else {
        let match = target.match(/^<?@?!?(\d{8,})>?$/);
        if (!match) {
            target = args.join(' ').toLowerCase();
            guild = await guild.fetchMembers();

            let member = searchMembers(guild.members, target)
            if (!member) {
                return "\\⚠ Invalid user or user ID.";
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
            return "\\⚠ Invalid user.";
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
