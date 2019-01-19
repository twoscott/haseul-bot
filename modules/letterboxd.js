//Require modules

const axios = require("axios");

//Init

const letterboxd = axios.create({
    baseURL: 'https://letterboxd.com',
    timeout: 10000,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36" }
})

//Functions

exports.msg = async function (message, args) {

    //Handle commands

    if (args.length < 1) return;
    switch (args[0]) {

        case ".letterboxd":
        case ".lb":
            message.channel.startTyping();
            lb_movie_query(args.slice(1).join(' ')).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }

}

lb_movie_query = async function (query) {
    
    if (!query) {
        return "\\⚠ Please provide a query to search for!";
    }
    
    let { data } = await letterboxd.get(`/search/films/${encodeURIComponent(query)}`);
    let regExp = /<ul class="results">[^]*?data-film-link="(.*?)"/i;
    let result = data.match(regExp);
    return result ? "https://letterboxd.com" + result[1] : "\\⚠ No results found.";

}