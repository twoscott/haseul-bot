exports.guildRank = function(xp) {
    const lvl = Math.floor(Math.log(xp/1000+100)/Math.log(10) * 200 - 399);
    const baseXp = Math.ceil(((10**((lvl+399)/200))-100)*1000);
    const nextXp = Math.ceil(((10**((lvl+400)/200))-100)*1000);
    return { lvl, baseXp, nextXp };
};

exports.globalRank = function(xp) {
    const lvl = Math.floor(Math.log(xp/1000+100)/Math.log(10) * 150 - 299);
    const baseXp = Math.ceil(((10**((lvl+299)/150))-100)*1000);
    const nextXp = Math.ceil(((10**((lvl+1+300)/150))-100)*1000);
    return { lvl, baseXp, nextXp };
};

exports.cleanMsgCache = function(lastMsgCache) {
    const now = Date.now();
    console.log('Clearing message timestamp cache...');
    console.log('Cache size before: ' + lastMsgCache.size);
    for (const [userID, lastMsgTime] of lastMsgCache) {
        if (now - lastMsgTime > 300000 /* 5 mins*/) {
            lastMsgCache.delete(userID);
        }
    }
    console.log('Cache size after:  ' + lastMsgCache.size);
};
