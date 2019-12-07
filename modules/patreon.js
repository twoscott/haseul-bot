// Import modules

const Client = require("../haseul.js").Client;
const config = require("../config.json");

const axios = require("axios");

const functions = require("../functions/functions.js");

// Consts

const patreon = axios.create({
    baseURL: 'https://www.patreon.com/api/oauth2/v2',
    timeout: 5000,
    headers: { 
        'authorization': 'Bearer ' + config.patreon_access_token,
        'Content-Type': 'application/vnd.api+json'
    }
})

// Init

exports.msg = async function(message, args) {

    // Handle commands

    switch (args[0]) {

        case ".donate":
        case ".patreon":
            message.channel.send("https://www.patreon.com/haseulbot");
            break;

        case ".donors":
        case ".donators":
        case ".patrons":
        case ".supporters":
            message.channel.startTyping();
            patrons(message).then(() => {
                message.channel.stopTyping();
            }).catch(err => {
                console.error(err);
                message.channel.stopTyping();
            });
            break;
        
    }

}

async function patrons(message) {
    
    let response;
    try {
        response = await patreon.get('/campaigns/'+config.haseulCampaignID+'/members?include=user&fields'+encodeURI('[member]')+'=full_name,patron_status,pledge_relationship_start&fields'+encodeURI('[user]')+'=social_connections');
    } catch(e) {
        console.error("Patreon error: " + e.response.status);
        message.channel.send('⚠ Error occurred.');
        return;
    }

    let members = response.data.data;
    let users = response.data.included.filter(x => x.type == 'user');
    if (members.length < 1) {
        message.channel.send("Nobody is currently supporting Haseul Bot :pensive:");
        return;
    }

    memberString = members.sort((a,b) => {
        return a.attributes.pledge_relationship_start - b.attributes.pledge_relationship_start
    }).filter(x => {
        let user = users.find(u => u.id == x.relationships.user.data.id);
        let socials = user.attributes.social_connections;
        return socials.discord;
    }).map(x => {
        let user = users.find(u => u.id == x.relationships.user.data.id);
        let { discord } = user.attributes.social_connections;
        let discordUser = Client.users.get(discord.user_id);
        return `<@${discord.user_id}> (${discordUser ? discordUser.tag : discord.user_id})`;
    }).join('\n');

    let descriptions = [];
    while (memberString.length > 2048 || memberString.split('\n').length > 25) {
        let currString = memberString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString   = currString.slice(0, lastIndex);
        memberString = memberString.slice(lastIndex);

        descriptions.push(currString);
    } 
    descriptions.push(memberString);

    let pages = descriptions.map((desc, i) => {
        return {
            content: undefined,
            options: {embed: {
                author: {
                    name: "Haseul Bot Patrons", icon_url: 'https://i.imgur.com/iUKnebH.png'
                },
                description: desc,
                color: 0xf2abba,
                footer: {
                    text: `Thank you for supporting me! ${descriptions.length > 1 ? `| Page ${i+1} of ${descriptions.length}`:``}`
                }
            }}
        }
    })

    functions.pages(message, pages);
}
