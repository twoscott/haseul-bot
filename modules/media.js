const { embedPages, withTyping } = require("../functions/discord.js");

const { trimArgs } = require("../functions/functions.js");

const axios = require("axios");

const letterboxd = axios.create({
    baseURL: "https://letterboxd.com",
    timeout: 5000,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36" }
})

const youtube = axios.create({
    baseURL: "https://youtube.com",
    timeout: 5000
});

exports.onCommand = async function(message, args) {

    let { channel } = message;

    switch (args[0]) {
        case "youtube":
        case "yt":
            withTyping(channel, ytPages, [message, args]);
            break;
        case "letterboxd":
        case "lb":
            withTyping(channel, lbMovieQuery, [message, args]);
            break;
    }

}

async function ytVidQuery(query) {

    if (!query) {
        return "⚠ Please provide a query to search for!";
    }
    let response = await youtube.get(`/results?search_query=${encodeURIComponent(query)}`);
    let search = response.data.match(/<div class="yt-lockup-content"><h3 class="yt-lockup-title "><a href="\/watch\?v=([^&"]+)/i);
    if (!search) {
        return "⚠ No results found for this search!";
    }
    let video_id = search[1];
    return video_id;

}

async function ytPages(message, args) {

    if (args.length < 2) {
        message.channel.send("⚠ Please provide a query to search for!");
        return;
    }

    let query = trimArgs(args, 1, message.content);
    let { data } = await youtube.get(`/results?search_query=${encodeURIComponent(query)}`);
    let regExp = /<div class="yt-lockup-content"><h3 class="yt-lockup-title "><a href="\/watch\?v=([^&"]+)/ig;
    let pages = [];

    let search = regExp.exec(data);
    for (let i = 0; search && i < 20; i++) {
        pages.push({ content: `${i+1}. https://youtu.be/${search[1]}`, options: undefined });
        search = regExp.exec(data);
    }
    if (pages.length < 1) {
        message.channel.send("⚠ No results found for this query!");
        return;
    }

    embedPages(message, pages, true);
    
}

async function lbMovieQuery(message, args) {
    
    if (args.length < 2) {
        message.channel.send("⚠ Please provide a query to search for!");
        return;
    }

    let query = trimArgs(args, 1, message.content);
    let { data } = await letterboxd.get(`/search/films/${encodeURIComponent(query)}`);
    let regExp = /<ul class="results">[^]*?data-film-link="(.*?)"/i;
    let result = data.match(regExp);
    
    message.channel.send(result ? "https://letterboxd.com" + result[1] : "⚠ No results found.");

}

exports.ytVidQuery = ytVidQuery;
