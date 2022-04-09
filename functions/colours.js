const axios = require('axios');
const getColors = require('get-image-colors');

exports.randomHexColour = maxBright => {
    const rgb = [];

    let full;
    if (maxBright) {
        full = Math.floor(Math.random() * 3);
        rgb[full] = 'ff';
    }

    for (let i = 0; i < 3; i++) {
        if (i === full) continue;
        const val = Math.floor(Math.random() * 256).toString(16);
        rgb[i] = val.length === 1 ? '0'+val : val;
    }

    return rgb.join('');
};

exports.rgbToHex = c => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0'+hex : hex;
};

exports.rgbToHsv = ([red, green, blue]) => {
    red /= 255;
    green /= 255;
    blue /= 255;

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const diff = max - min;

    const val = Math.round(max*100);
    const sat = Math.round((max == 0 ? 0 : diff / max)*100);

    let hue;
    if (max == min) {
        hue = 0;
    } else {
        switch (max) {
        case red: hue = (green - blue ) / diff + 0; break;
        case green: hue = (blue - red ) / diff + 2; break;
        case blue: hue = (red - green) / diff + 4; break;
        }
        hue /= 6;
        if (hue < 0) hue += 1;
        hue = Math.round(hue*360);
    }

    return [hue, sat, val];
};

exports.getImgColours = async function(url) {
    let imgColours = null;
    try {
        response = await axios.get(url, { responseType: 'arraybuffer' });
        imgColours = await getColors(response.data, response.headers['content-type']);
    } catch (e) {
        console.error(e);
    }

    return imgColours;
};

exports.colours = {
    joinColour: 0x01b762,
    leaveColour: 0xf93437,
    welcomeColour: 0x7c62d1,
    embedColour: 0x2f3136,
};
