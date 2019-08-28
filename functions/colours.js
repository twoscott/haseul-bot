
exports.randomHexColour = (maxBright) => {
    
    let rgb = [];

    let full;
    if (maxBright) {
        full = Math.floor(Math.random() * 3);
        rgb[full] = 'ff';
    }

    for (let i = 0; i < 3; i++) {
        if (i === full) continue;
        let val = Math.floor(Math.random() * 256).toString(16);
        rgb[i] = val.length === 1 ? '0'+val : val;
    }

    return rgb.join('');

}

exports.rgbToHex = (c) => {
    let hex = parseInt(c).toString(16);
    return hex.length === 1 ? '0'+hex : hex;
}

exports.rgbToHsv = ([red, green, blue]) => {
    red   /= 255;
    green /= 255;
    blue  /= 255;
    
    let max = Math.max(red, green, blue);
    let min = Math.min(red, green, blue);
    let hue, sat, val;
    val = Math.round(max*100);

    let diff = max - min;
    sat = Math.round((max == 0 ? 0 : diff / max)*100);

    if (max == min) {
        hue = 0;
    } else {
        switch (max) {
        case red:   hue = (green - blue ) / diff + 0; break;
        case green: hue = (blue  - red  ) / diff + 2; break;
        case blue:  hue = (red   - green) / diff + 4; break;
        }
        hue /= 6;
        if (hue < 0) hue += 1;
        hue = Math.round(hue*360);
    }

    return [ hue, sat, val ];

}