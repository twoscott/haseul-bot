exports.setMuteRolePerms = async function(channelsArray, muteRoleID) {
    if (!channelsArray || channelsArray.size < 1 || !muteRoleID) {
        const err = new Error('Invalid parameters given');
        console.error(err);
    } else {
        const permsToDeny = ['SEND_MESSAGES', 'CONNECT', 'SPEAK', 'ADD_REACTIONS'];
        for (const channel of channelsArray) {
            const mutePerms = channel.permissionsFor(muteRoleID);
            if (channel.viewable && mutePerms.any(permsToDeny)) {
                await channel.updateOverwrite(muteRoleID, {
                    'SEND_MESSAGES': false,
                    'CONNECT': false,
                    'SPEAK': false,
                    'ADD_REACTIONS': false,
                }, 'Updated mute role\'s permissions.').catch(console.error);
            }
        }
    }
};
