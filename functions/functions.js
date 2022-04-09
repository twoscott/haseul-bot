exports.capitalise = text =>
    text[0].toUpperCase() + text.slice(1).toLowerCase();

exports.trimArgs = function(args, limit, content) {
    for (let i = 0; i < limit; i++) {
        const arg = args[i];
        content = content.slice(content.indexOf(arg) + arg.length);
    }
    return content.trim();
};

exports.parseChannelID = function(text) {
    if (!text || text.length < 1) {
        const err = new Error('No text provided to resolve to channel');
        console.error(err);
    } else {
        const match = text.match(/<?#?!?(\d+)>?/);
        if (!match) {
            return null;
        } else {
            return match[1];
        }
    }
};

exports.parseUserID = function(text) {
    if (!text || text.length < 1) {
        const err = new Error('No text provided to resolve to channel');
        console.error(err);
    } else {
        const match = text.match(/<?@?!?(\d+)>?/);
        if (!match) {
            return null;
        } else {
            return match[1];
        }
    }
};

exports.getTimeAgo = (time, limit) => {
    const currTime = Date.now() / 1000;
    const timeDiffSecs = currTime - time;
    let timeAgoText;
    let timeAgo;

    if (timeDiffSecs < 60 || limit == 'seconds') { // 60 = minute
        timeAgo = Math.floor(timeDiffSecs);
        timeAgoText = timeAgo > 1 ? `${timeAgo} secs ago` : `${timeAgo} sec ago`;
    } else if (timeDiffSecs < 3600 || limit == 'minutes') { // 3600 = hour
        timeAgo = Math.floor((timeDiffSecs) / 60);
        timeAgoText = timeAgo > 1 ? `${timeAgo} mins ago` : `${timeAgo} min ago`;
    } else if (timeDiffSecs < 86400 || limit == 'hours') { // 86400 = day
        timeAgo = Math.floor((timeDiffSecs) / 3600);
        timeAgoText = timeAgo > 1 ? `${timeAgo} hrs ago` : `${timeAgo} hr ago`;
    } else if (timeDiffSecs < 604800 || limit == 'days') { // 604800 = week
        timeAgo = Math.floor((timeDiffSecs) / 86400);
        timeAgoText = timeAgo > 1 ? `${timeAgo} days ago` : `${timeAgo} day ago`;
    } else { // More than a week
        timeAgo = Math.floor((timeDiffSecs) / 604800);
        timeAgoText = timeAgo > 1 ? `${timeAgo} wks ago` : `${timeAgo} wk ago`;
    }

    return timeAgoText;
};

exports.getDelta = (ms, type) => {
    let delta = Math.ceil(ms / 1000);
    let days = 0; let hours = 0; let minutes = 0; let seconds = 0;

    if (['days'].includes(type) || !type) {
        days = Math.floor(delta / 86400);
        delta -= days * 86400;
    }

    if (['days', 'hours'].includes(type) || !type) {
        hours = Math.floor(delta / 3600);
        if (['days'].includes(type)) {
            hours = hours % 24;
        }
        delta -= hours * 3600;
    }

    if (['days', 'hours', 'minutes'].includes(type) || !type) {
        minutes = Math.floor(delta / 60);
        if (['days', 'hours'].includes(type)) {
            minutes = minutes % 60;
        }
        delta -= minutes * 60;
    }

    if (['days', 'hours', 'minutes', 'seconds'].includes(type) || !type) {
        if (['days', 'hours', 'minutes'].includes(type)) {
            seconds = seconds % 60;
        }
        seconds = delta % 60;
    }

    return { days, hours, minutes, seconds, ms };
};
