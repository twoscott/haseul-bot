//Require modules

const logs = require("../modules/users.js");
const roles = require("../modules/roles.js")

//Handle joins

exports.handleJoins = (member) => {

    logs.join(member);
    roles.join(member);

}

//Handle leaves

exports.handleLeaves = (member) => {

    logs.leave(member);
    
}