const http = require('http');
const axios = require("axios");

const config = require("../config.json");

const database = require("../db_queries/instagram_db.js");

const instagram = axios.create({
    baseURL: 'https://www.instagram.com',
    timeout: 5000,
    headers: { 'User-Agent': 'Instagram 10.26.0 (iPhone7,2; iOS 10_1_1; en_US; en-US; scale=2.00; gamut=normal; 750x1334) AppleWebKit/420+' }
})

const graphql = axios.create({
    baseURL: 'https://www.instagram.com/graphql',
    timeout: 5000,
})

exports.instagram = instagram;
exports.graphql = graphql;
exports.timeline_hash = 'f2405b236d85e8296cf30347c9f08c2a';
exports.stories_hash = '638a95f198f0312787a7c58d042fafcf';

const server = http.createServer(async (req, res) => {
    let customUrlMatch = req.url.match(new RegExp('/insta/(\\w+)/([0-9]+)'));
    if (customUrlMatch) {
        let [ type, id ] = customUrlMatch.slice(1);
        switch (type) {
            case "img":
                let imageURL = await database.getCustomImageUrl(id).catch(console.error);
                res.writeHead(301, { Location: imageURL });
                break;
            case "vid":
                let videoURL = await database.getCustomVideoUrl(id).catch(console.error);
                res.writeHead(301, { Location: videoURL });
                break;
        }
    }
    res.end();
})
server.listen(7000, '127.0.0.1');

exports.login = async function() {

    console.log("Logging in to Instagram...");
    let response;
    try {
        response = await instagram.get('/web/__mid/', { headers: {Cookie: 'ig_cb=1'} });
    } catch(e) {
        console.error(e);
        return null;
    }

    let csrf_token = response.headers['set-cookie'][1].split('csrftoken=')[1].split(';')[0];
    let cookie = response.headers['set-cookie'][0];
    let { instagram_username, instagram_password } = config;

    try {
        response = await instagram.post('/accounts/login/ajax/', `username=${encodeURIComponent(instagram_username)}&password=${encodeURIComponent(instagram_password)}`, {
            headers: { 'X-CSRFToken': csrf_token, 'Cookie': cookie }
        });
    } catch(e) {
        console.error(e);
        return null;
    }
    console.log(response.headers);
    let session_id = response.headers['set-cookie'].filter(x => x.startsWith('sessionid='))[0].split(';')[0];
    cookie += '; ' + session_id;

    exports.credentials = { cookie, csrf_token };
    console.log("Logged in to Instagram successfully");

}
