//Require modules

const logs = require("../modules/users.js");

//Handle joins

exports.handleJoins = (member) => {

    logs.join(member);

}

//Handle leaves

exports.handleLeaves = (member) => {

    logs.leave(member);
    
}