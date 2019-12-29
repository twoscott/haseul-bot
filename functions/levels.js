exports.guildRank = function(xp) {
    let lvl = Math.floor(Math.log(xp/1000+100)/Math.log(10) * 200 - 399);
    let baseXp = Math.ceil(((10**((lvl+399)/200))-100)*1000);
    let nextXp = Math.ceil(((10**((lvl+400)/200))-100)*1000);
    return { lvl, baseXp, nextXp };
}

exports.globalRank = function(xp) {
    let lvl = Math.floor(Math.log(xp/1000+100)/Math.log(10) * 150 - 299);
    let baseXp = Math.ceil(((10**((lvl+299)/150))-100)*1000);
    let nextXp = Math.ceil(((10**((lvl+1+300)/150))-100)*1000);
    return { lvl, baseXp, nextXp };
}
