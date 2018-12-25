//Require modules

const discord = require("discord.js");
const client = require("../haseul.js").client;
const serverSettings = require("../modules/server_settings.js");

//Logs
log = async (member, logEvent) => {

    //Check if logs on
    let logsOn = await serverSettings.getSetting(member.guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = await serverSettings.getSetting(member.guild.id, "joinLogsChan");
    if (!member.guild.channels.has(logChannelID)) return;
    if (logChannelID) logEvent(member, logChannelID); //Log

}

exports.join = async (member) => {

    log(member, logJoin);

}

exports.leave = async (member) => {

    log(member, logLeave);

}

logJoin = async (member, destination) => {
    
    let memNo = await getMemberNo(member);
    let {
        user,
        guild
    } = member;
    let embed = new discord.RichEmbed()
    .setAuthor(`Member joined!`)
    .setTitle(user.tag)
    .setURL(user.avatarURL)
    .setThumbnail(user.avatarURL)
    .setDescription(`${user} joined ${guild}!`)
    .addField(`Joined On`, member.joinedAt.toGMTString())
    .addField(`Account Created On`, user.createdAt.toGMTString())
    .setFooter(`ID: ${user.id} • Member #${memNo}`)
    .setColor(0x13ef67);
    client.channels.get(destination).send(embed);

}

logLeave = async (member, destination) => {

    member.leftAt = new Date(Date.now());
    let {
        user,
        guild
    } = member;
    let embed = new discord.RichEmbed()
    .setAuthor(`Member left!`)
    .setTitle(user.tag)
    .setURL(user.avatarURL)
    .setThumbnail(user.avatarURL)
    .setDescription(`${user} left ${guild}!`)
    .addField(`Left On`, member.leftAt.toGMTString())
    .addField(`Account Created On`, user.createdAt.toGMTString())
    .setFooter(`ID: ${user.id}`)
    .setColor(0xef1354);
    client.channels.get(destination).send(embed);

}

getMemberNo = async (member) => {

    let guild = await member.guild.fetchMembers();

    let members = guild.members.array();
    members = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    let memNo = members.findIndex(e => e.id == member.id) + 1;
    return memNo;

}