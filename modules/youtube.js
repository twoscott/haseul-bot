//Require modules

const discord = require("discord.js");
const axios = require("axios")
const client = require("../haseul").client;
const functions = require("../functions/functions");

//Functions

exports.handle = async (message) => {
    let args = message.content.trim().split(" ");

    //Handle commands

    if (args.length < 1) return;
    switch (args[0].toLowerCase()) {

        case ".yt":
            message.channel.startTyping();
            yt_pages(message, args.slice(1).join(" ")).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })


    }
}

query = (query) => {
    return new Promise((resolve, reject) => {
        if (!query) {
            resolve("\\⚠ Please provide a query to search for!");
            return;
        }
        axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`).then(response => {
            let search = response.data.match(/<div class="yt-lockup-content"><h3 class="yt-lockup-title "><a href="\/watch\?v=([^&"]+)/i)
            if (!search) {
                resolve(`\\⚠ No results found for this search!`);
                return;
            }
            let video_id = search[1];
            resolve(`https://youtu.be/${video_id}`);
        }).catch(error => {
            reject(error);
        })
    })
}

yt_pages = (message, query) => {
    return new Promise((resolve, reject) => {
        if (!query) {
            resolve("\\⚠ Please provide a query to search for!");
            return;
        }
        axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`).then(response => {
            let regExp = /<div class="yt-lockup-content"><h3 class="yt-lockup-title "><a href="\/watch\?v=([^&"]+)/ig;
            let pages = [];
            let search = regExp.exec(response.data);
            while (search !== null) {
                pages.push(`https://youtu.be/${search[1]}`);
                search = regExp.exec(response.data);
            }
            if (pages.length < 1) {
                resolve(`\\⚠ No results found for this search!`);
                return;
            }
            functions.pages(message, pages, 600000, true);
            resolve();
        }).catch(error => {
            reject(error);
        })
    })
}

module.query = query;
