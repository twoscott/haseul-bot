const { Client } = require("../haseul.js");

exports.setMuteRolePerms = async function(channelsArray, muteRoleID) {
    if (!channelsArray || channelsArray.length < 1 || !muteRoleID) {
        let err = new Error("Invalid parameters given");
        console.error(err);
    } else {
        let permsToDeny = ["SEND_MESSAGES", "CONNECT", "SPEAK", "ADD_REACTIONS"];
        for (let channel of channelsArray) {
            let mutePerms = channel.permissionsFor(muteRoleID);
            if (channel.viewable && mutePerms.any(permsToDeny)) {
                await channel.updateOverwrite(muteRoleID, { 
                    "SEND_MESSAGES": false,
                    "CONNECT": false,
                    "SPEAK": false,
                    "ADD_REACTIONS": false
                }, `Updated mute role's permissions.`).catch(console.error);
            }
        }
    }
}