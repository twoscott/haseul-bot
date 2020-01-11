const axios = require("axios");
const { JSDOM } = require("jsdom");

exports.scrapeArtistImage = async function(artist) {

    let response;
    try {
        response = await axios.get(`https://www.last.fm/music/${encodeURIComponent(artist)}/+images`);
    } catch (e) {
        let err = new Error(e.response.data);
        console.error(err);
        return null;
    }
    
    let doc = new JSDOM(response.data).window.document;
    let images = doc.getElementsByClassName('image-list-item-wrapper');
    if (images.length < 1) {
        return "https://lastfm-img2.akamaized.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png";
    }

    return images[0].getElementsByTagName('img')[0].src.replace('/avatar170s/', '/300x300/') + '.png';
    
}

exports.scrapeArtistsWithImages = async function(username, datePreset, itemCount) {
    let collection = [];
    let pageCount = Math.ceil(itemCount / 50);

    for (let i = 0; i < pageCount; i++) {
        if (i > 0 && collection.length < 50) break;
        let response;
        try {
            response = await axios.get(`https://www.last.fm/user/${username}/library/artists?date_preset=${datePreset}&page=${i+1}`);
        } catch (e) {
            let { message } = e.response.data;
            message.channel.send(`⚠ ${message || "Unknown Error Occurred."}`);
            return;
        }

        let doc = new JSDOM(response.data).window.document;
        let rows = doc.getElementsByClassName('chartlist-row link-block-basic js-link-block');
        for (let j = 0; j < rows.length && j < itemCount - (i*50); j++) {
            let row = rows[j];
            collection.push({ 
                'image': [{
                    '#text': row.getElementsByClassName('avatar')[0].getElementsByTagName('img')[0].src.replace('/avatar70s/', '/300x300/'),
                }],
                'name': row.getElementsByClassName('link-block-target')[0].textContent, 
                'playcount': row.getElementsByClassName('chartlist-count-bar-value')[0].textContent.match(/[0-9,]+/)[0]
            })
        }
    }

    return collection;
}

exports.getTimeFrame = function(timeframe) {
    
    let displayTime;
    let datePreset;
    let defaulted = false;

    let week = ["7", "7day", "7days", "weekly", "week", "1week"];
    let month = ["30", "30day", "30days", "monthly", "month", "1month"];
    let threeMonth = ["90", "90day", "90days", "3months", "3month"];
    let sixMonth = ["180", "180day", "180days", "6months", "6month"];
    let year = ["365", "365day", "365days", "1year", "year", "yr", "12months", "12month", "yearly"];
    let overall = ["all", "at", "alltime", "forever", "overall"];

    switch (true) {
        case week.includes(timeframe):
            timeframe = "7day";
            displayTime = "Last Week";
            datePreset = "LAST_7_DAYS";
            break;
        case month.includes(timeframe):
            timeframe = "1month";
            displayTime = "Last Month";
            datePreset = "LAST_30_DAYS";
            break;
        case threeMonth.includes(timeframe):
            timeframe = "3month";
            displayTime = "Last 3 Months";
            datePreset = "LAST_90_DAYS";
            break;
        case sixMonth.includes(timeframe):
            timeframe = "6month";
            displayTime = "Last 6 Months";
            datePreset = "LAST_180_DAYS";
            break;
        case year.includes(timeframe):
            timeframe = "12month";
            displayTime = "Last Year";
            datePreset = "LAST_365_DAYS";
            break;
        case overall.includes(timeframe):
            timeframe = "overall";
            displayTime = "All Time";
            datePreset = "ALL";
            break;
        default:
            timeframe = "7day";
            displayTime = "Last Week";
            datePreset = "LAST_7_DAYS";
            defaulted = true;
    }

    return {
        timeframe: timeframe,
        displayTime: displayTime,
        datePreset: datePreset,
        defaulted: defaulted
    };
}