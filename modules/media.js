const { embedPages, withTyping } = require('../functions/discord.js');
const { trimArgs } = require('../functions/functions.js');

const axios = require('axios');

const youtube = axios.create({
    baseURL: 'https://youtube.com',
    timeout: 5000,
    headers: { 'X-YouTube-Client-Name': '1', 'X-YouTube-Client-Version': '2.20200424.06.00' },
});

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'youtube':
    case 'yt':
        withTyping(channel, ytPages, [message, args]);
        break;
    }
};

exports.ytVidQuery = async function(query) {
    if (query) {
        const response = await youtube.get('/results', { params: { search_query: query, pbj: 1, sp: 'EgIQAQ==' } });
        let result;
        try {
            const data = Array.isArray(response.data) ?
                response.data[1] :
                response.data;

            result = data
                .response
                .contents
                .twoColumnSearchResultsRenderer
                .primaryContents
                .sectionListRenderer
                .contents[0]
                .itemSectionRenderer
                .contents[0];
        } catch (e) {
            console.error(e);
            return null;
        }

        return result.videoRenderer ?
            result.videoRenderer.videoId || null : null;
    }
};

async function ytPages(message, args) {
    if (args.length < 2) {
        message.channel.send('⚠ Please provide a query to search for!');
        return;
    }

    const query = trimArgs(args, 1, message.content);
    const response = await youtube.get('/results', {
        params: { search_query: query, pbj: 1, sp: 'EgIQAQ==' },
    });

    let results;
    try {
        const data = Array.isArray(response.data) ?
            response.data[1] :
            response.data;

        results = data
            .response
            .contents
            .twoColumnSearchResultsRenderer
            .primaryContents
            .sectionListRenderer
            .contents[0]
            .itemSectionRenderer
            .contents;
    } catch (e) {
        console.error(e);
        message.channel.send('⚠ Error occurred searching YouTube.');
        return;
    }

    results = results
        .filter(result => result.videoRenderer && result.videoRenderer.videoId)
        .map((result, i) => `${i + 1}. https://youtu.be/${result.videoRenderer.videoId}`);

    if (results.length < 1) {
        message.channel.send('⚠ No results found for this query!');
        return;
    }

    embedPages(message, results.slice(0, 20), true);
}
