// Require modules

const html = require("../functions/html.js");
const colours = require("../functions/colours.js");

// Functions

exports.msg = async function(message, args) {

    // Handle commands
    switch (args[0]) {

        case ".colour":
        case ".color":
            message.channel.startTyping();
            colour(message, args.slice(1)).then(() => {
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;

    }

}

async function colour(message, args) {

    let colour = args.join(' ').trim();

    let hex;
    let rgb;
    let hsv;

    if (colour.toLowerCase() == 'random') {

        hex = '#'+colours.randomHexColour(false);
        let [ red, green, blue ] = hex.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i).slice(1);
        rgb = [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)];
        hsv = colours.rgbToHsv(rgb);

    } else {

        hex = colour.match(/^(?:#|0x)?([0-9a-f]{6})$/i);
        rgb = colour.match(/(^\d{1,3})\s*,?\s*(\d{1,3})\s*,?\s*(\d{1,3}$)/i);

        if (!rgb && !hex) {
            message.channel.send("⚠ Please provide a valid colour hexcode or RGB values.");
            return;
        }

        if (!hex) {
            let [ red, green, blue ] = rgb.slice(1);
            hex = `#${colours.rgbToHex(red)}${colours.rgbToHex(green)}${colours.rgbToHex(blue)}`;
        } else {
            hex = '#'+hex[1];
        }

        if (!rgb) {
            let [ red, green, blue ] = hex.match(/^(?:#|0x)?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i).slice(1);
            rgb = [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)];
        } else {
            rgb = rgb.slice(1).map(c => parseInt(c))
        }
        
        hsv = colours.rgbToHsv(rgb);

    }

    let htmlString = `<html> <style>* {margin:0; padding:0;}</style> <div style="background-color:${hex}; width:200px; height:200px"></div></html>`;
    let image = await html.toImage(htmlString, 200, 200);

    let embed = {
        title: `Colour \`${hex.toLowerCase()}\``,
        color: parseInt(hex.split('#')[1], 16),
        image: { url: `attachment://${hex.replace('#','')}.jpg`},
        footer: { text: `RGB: ${rgb.join(', ')} | HSV: ${hsv[0]}, ${hsv[1]}%, ${hsv[2]}%` }
    }

    message.channel.send({embed, files: [{ attachment: image, name: `${hex.replace('#','')}.jpg` }]});

}