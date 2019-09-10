//Require modules

const instagram = require("../tasks/instagram.js");
const twitter = require("../tasks/twitter.js");
const vlive = require("../tasks/vlive.js");

//Handle tasks

exports.handleTasks = () => {

    instagram.tasks();
    twitter.tasks();
    vlive.tasks();

}