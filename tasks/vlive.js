// Require modules

const Client = require("../haseul.js").Client;

const axios = require("axios");

const database = require("../db_queries/vlive_db.js");
const clientdb = require("../db_queries/client_db.js");

// Consts

const vlive = axios.create({
    baseURL: 'http://api.vfan.vlive.tv/vproxy/channelplus/',
    timeout: 10000
})
const app_id = '8c6cc7b45d2568fb668be6e05b6e5a3b';

// Variables

let lastVliveCheck;

// Task loop

exports.tasks = async function() {

    vliveLoop().catch(console.error);

}

// Task

async function vliveLoop() {

    let startTime = Date.now();

    console.log("Started checking Vlives at " + new Date(startTime).toUTCString());
    if (!lastVliveCheck) {
        let clientData = await clientdb.get_client_data();
        lastVliveCheck = clientData ? clientData.lastVliveCheck : 0;
    }

    let channelNotifs = await database.get_all_vlive_channels();
    let channelSeqs = new Set(channelNotifs.map(x => x.channelSeq));

    for (let channelSeq of channelSeqs.values()) {
        
        let response;
        try {
            response = await vlive.get('getChannelVideoList', { params: { app_id, channelSeq, maxNumOfRows: 10, pageNo: 1 } });
        } catch(e) {
            console.error(Error(e));
            return "⚠ Unknown error occurred.";
        }
        let channelData = response.data.result;
        if (!channelData) { //
            console.error(channelSeq + ' has no channel data'); //
            console.error(response.data); //
        } //
        let { channelInfo, videoList } = channelData;
        let { channelCode, channelName, channelProfileImage, backgroundColor } = channelInfo;

        let oldVideos = await database.get_channel_vlive_videos(channelSeq);
        let oldVidSeqs = oldVideos.map(vid => vid.videoSeq);

        let newVideos = videoList.filter(vid => !oldVidSeqs.includes(vid.videoSeq)).sort((a,b) => {
            // sort videos in date order
            return new Date(a.onAirStartAt + " UTC+9:00").getTime() - new Date(b.onAirStartAt + " UTC+9:00").getTime();
        })
        let targetData = channelNotifs.filter(data => data.channelSeq == channelSeq);
        let channelColour = parseInt(backgroundColor.replace('#', ''), 16);

        for (let video of newVideos) {

            let { videoSeq, videoType, onAirStartAt, title, thumbnail, representChannelName } = video;

            let releaseTimestamp = new Date(onAirStartAt + " UTC+9:00").getTime();
            if (releaseTimestamp > Date.now()) {
                continue;
            }
            
            if (![channelName, 'V PICK!'].includes(representChannelName)) {
                continue;
            }

            await database.add_video(videoSeq, channelSeq);
            let videoLive = videoType == 'LIVE';

            if (!videoLive && releaseTimestamp < lastVliveCheck) {
                continue;
            }           

            for (let data of targetData) {
                let { guildID, discordChanID, mentionRoleID, VPICK } = data;

                if (!VPICK && representChannelName != channelName) {
                    continue;
                }

                let guild = Client.guilds.get(guildID);
                if (!guild) {
                    console.error(Error("Guild couldn't be retrieved to send Vlive notif to."));
                    continue;
                }
                let discordChannel = Client.channels.get(discordChanID) || guild.channels.get(discordChanID);
                if (!discordChannel) {
                    console.error(Error("Channel couldn't be retrieved to send Vlive notif to."));
                    continue;
                }

                let message = `https://www.vlive.tv/video/${videoSeq}/${mentionRoleID ? ` <@&${mentionRoleID}>`:``}`;
                let embed = {
                    author: { 
                        name: `${representChannelName} - ${videoLive ? 'Now Live!' : 'New Upload'}`, 
                        icon_url: 'https://i.imgur.com/gHo7BTO.png', 
                        url: `https://channels.vlive.tv/${channelCode}/home` 
                    },
                    title: (videoLive ? '**[LIVE]** ' : '**[VOD]** ') + title,
                    url: `https://www.vlive.tv/video/${videoSeq}/`,
                    thumbnail: { url: channelProfileImage },
                    image: { url: thumbnail + '?type=f886_499' },
                    footer: { text: videoLive ? 'Aired' : 'Uploaded', icon_url: videoLive ? 'https://i.imgur.com/h25t2pG.png':'' },
                    timestamp: releaseTimestamp,
                    color: channelColour
                }

                discordChannel.send(message, {embed}).catch(error => {
                    console.error(Error(error));
                });
            }            

        }

    }

    lastVliveCheck = startTime;
    await clientdb.set_last_vlive_check(lastVliveCheck);
    console.log("Finished checking vlives, took " + (Date.now() - startTime) / 1000 + "s");
    setTimeout(vliveLoop, Math.max(30000 - (Date.now() - startTime), 0)); // ensure runs every 30 secs unless processing time > 30 secs

}