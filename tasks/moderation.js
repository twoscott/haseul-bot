const axios = require('axios');
const filterCache = require('../utils/filter_cache');

const hyperphish = axios.create({
    baseURL: 'https://api.hyperphish.com/',
    timeout: 5000,
});

exports.tasks = async function() {
    updateFiltersLoop().catch(console.error);
};

async function updateFiltersLoop() {
    const startTime = Date.now();

    try {
        const res = await hyperphish.get('/gimme-domains');
        const spamDomains = res.data;
        if (!spamDomains) {
            return;
        }
        if (spamDomains.length < 1) {
            return;
        }
        filterCache.spamDomainsRegex = new RegExp(`(https?://|^|\\W)(${spamDomains.join('|')})($|\\W)`, 'i');
    } catch (e) {
        console.error(e);

        // 30 secs
        setTimeout(updateFiltersLoop, 30000 - (Date.now() - startTime));
        return;
    }

    setTimeout(updateFiltersLoop, 3600000 - (Date.now() - startTime)); // 1 hour
}
