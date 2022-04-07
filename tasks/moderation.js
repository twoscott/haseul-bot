const axios = require("axios");
const filterCache = require("../utils/filter_cache")

const hyperphish = axios.create({
    baseURL: 'https://api.hyperphish.com/',
    timeout: 5000
})

exports.tasks = async function() {

    updateFiltersLoop().catch(console.error);

}

async function updateFiltersLoop() {
    let startTime = Date.now();

    try {
        let res = await hyperphish.get("/gimme-domains");
        let spamDomains = res.data;
        if (!spamDomains) {
            return;
        }
        if (spamDomains.length < 1) {
            return;
        }
        filterCache.spamDomainsRegex = new RegExp(`(https?://|^|\\W)(${spamDomains.join("|")})($|\\W)`, "i")
    } catch (e) {
        console.error(e)
        setTimeout(updateFiltersLoop, 30000 - (Date.now() - startTime)); // 30 secs
        return;
    }

    setTimeout(updateFiltersLoop, 3600000 - (Date.now() - startTime)); // 1 hour
}