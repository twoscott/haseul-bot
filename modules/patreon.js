const { embedPages, withTyping } = require('../functions/discord.js');
const { Client } = require('../haseul.js');

const config = require('../config.json');
const { patreon } = require('../utils/patreon.js');

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'donate':
    case 'patreon':
        message.channel.send({ content: 'https://www.patreon.com/haseulbot' });
        break;
    case 'donors':
    case 'donators':
    case 'patrons':
    case 'supporters':
        withTyping(channel, patrons, [message]);
        break;
    }
};

async function patrons(message) {
    let response;
    try {
        response = await patreon.get('/campaigns/'+config.haseul_campaign_id+'/members?include=user&fields'+encodeURI('[member]')+'=full_name,patron_status,pledge_relationship_start&fields'+encodeURI('[user]')+'=social_connections');
    } catch (e) {
        console.error('Patreon error: ' + e.response.status);
        message.channel.send({ content: '⚠ Error occurred.' });
        return;
    }

    try {
        const members = response.data.data.filter(m => m.attributes.patron_status == 'active_patron');
        const users = response.data.included.filter(x => x.type == 'user');
        if (members.length < 1) {
            message.channel.send({ content: 'Nobody is currently supporting Haseul Bot :pensive:' });
            return;
        }

        memberString = members.sort((a, b) => {
            const aPledgeTime = new Date(a.attributes.pledge_relationship_start)
                .getTime();
            const bPledgeTime = new Date(b.attributes.pledge_relationship_start)
                .getTime();
            return aPledgeTime - bPledgeTime;
        }).filter(member => {
            const user = users
                .find(u => u.id == member.relationships.user.data.id);
            const socials = user.attributes.social_connections;
            return socials.discord;
        }).map(member => {
            const user = users
                .find(u => u.id == member.relationships.user.data.id);
            const { discord } = user.attributes.social_connections;
            const discordUser = Client.users.cache.get(discord.user_id);
            return `<@${discord.user_id}> (${discordUser ? discordUser.tag : discord.user_id})`;
        }).join('\n');

        const descriptions = [];
        while (memberString.length > 2048 || memberString.split('\n').length > 25) {
            let currString = memberString.slice(0, 2048);

            let lastIndex = 0;
            for (let i = 0; i < 25; i++) {
                const index = currString.indexOf('\n', lastIndex) + 1;
                if (index) lastIndex = index; else break;
            }
            currString = currString.slice(0, lastIndex);
            memberString = memberString.slice(lastIndex);

            descriptions.push(currString);
        }
        descriptions.push(memberString);

        const pages = descriptions.map((desc, i) => ({
            embeds: [{
                author: {
                    name: 'Haseul Bot Patrons', icon_url: 'https://i.imgur.com/iUKnebH.png',
                },
                description: desc,
                color: 0xf2abba,
                footer: {
                    text: `Thank you for supporting me! ${descriptions.length > 1 ? `| Page ${i+1} of ${descriptions.length}`:''}`,
                },
            }],
        }));

        embedPages(message, pages);
    } catch (e) {
        message.channel.send({ content: '⚠ Unknown error occurred.' });
    }
}
