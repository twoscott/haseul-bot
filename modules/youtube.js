//Require modules

const discord = require("discord.js");
const axios = require("axios")
const client = require("../haseul").client;

//Functions

handle = (message) => {
    var args = message.content.trim().split(" ");

    //Handle commands

    switch (args[0]) {

        case ".yt":
            query(args.slice(1).join(" ")).then(response => {
                message.channel.send(response);
            }).catch(error => {
                console.error(error);
            })


    }
}

query = (query) => {
    return new Promise((resolve, reject) => {
        axios.get(`https://www.youtube.com/results?search_query=${encodeURI(query)}`).then(response => {
            var search = response.data.match(/<div class="yt-lockup-content"><h3 class="yt-lockup-title "><a href="\/watch\?v=([^&"]+)/i)
            if (!search) {
                console.error("Something went wrong requesting a Youtube search.");
                return;
            }
            var video_id = search[1];
            resolve(`https://youtu.be/${video_id}`);
        }).catch(error => {
            reject(error);
        })
    })
}

module.exports = {
    handle: handle,
    query: query
}
