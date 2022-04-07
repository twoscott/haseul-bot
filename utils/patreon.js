const config = require("../config.json");
const axios = require("axios");

const tier1ID = '3938943';
const tier2ID = '3950833';

const patreon = axios.create({
    baseURL: 'https://www.patreon.com/api/oauth2/v2',
    timeout: 5000,
    headers: { 
        'authorization': 'Bearer ' + config.patreon_access_token,
        'Content-Type': 'application/vnd.api+json'
    }
})

module.exports = { 
    patreon,
    tier1ID,
    tier2ID    
};
