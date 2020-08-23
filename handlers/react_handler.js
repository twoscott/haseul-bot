const whitelist = require("../modules/whitelist.js");

exports.onReact = async function(reaction, user) {

    if (user.bot) return;

    whitelist.onReact(reaction, user);

}