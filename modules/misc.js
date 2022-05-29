const Discord = require('discord.js');
const { withTyping } = require('../functions/discord.js');

const html = require('../functions/html.js');
const colours = require('../functions/colours.js');

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'colour':
    case 'color':
        switch (args[1]) {
        case 'random':
            withTyping(channel, colourRandom, [message]);
            break;
        default:
            withTyping(channel, colour, [message, args.slice(1)]);
            break;
        }
        break;
    }
};

async function colour(message, args) {
    const colour = args.join(' ').trim();
    let hex = colour.match(/^(?:#|0x)([0-9a-f]{6})$/i);
    let rgb = colour.match(/(^\d{1,3})\s*,?\s*(\d{1,3})\s*,?\s*(\d{1,3}$)/i);

    if (!rgb && !hex) {
        message.channel.send({ content: '⚠ Please provide a valid colour hexcode or RGB values.' });
        return;
    }

    if (hex) {
        hex = hex[1];
        const [red, green, blue] = hex.match(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i).slice(1);
        rgb = [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)];
    } else if (rgb) {
        rgb = rgb.slice(1).map(c => parseInt(c));
        const [red, green, blue] = rgb;
        hex = `${colours.rgbToHex(red)}${colours.rgbToHex(green)}${colours.rgbToHex(blue)}`;
    }

    const hexValue = parseInt(hex, 16);
    if (hexValue < 0 || hexValue > 16777215) {
        message.channel.send({ content: '⚠ Please provide a valid colour hexcode or RGB values.' });
        return;
    }

    for (const component of rgb) {
        if (component < 0 || component > 255) {
            message.channel.send({ content: '⚠ Please provide a valid colour hexcode or RGB values.' });
            return;
        }
    }

    const hsv = colours.rgbToHsv(rgb);

    const htmlString = `<html> <style>* {margin:0; padding:0;}</style> <div style="background-color:${hex}; width:200px; height:200px"></div></html>`;
    const image = await html.toImage(htmlString, 200, 200);

    const embed = new Discord.MessageEmbed({
        title: `Colour \`#${hex.toLowerCase()}\``,
        color: hexValue,
        image: { url: `attachment://${hex}.jpg` },
        footer: { text: `RGB: ${rgb.join(', ')} | HSV: ${hsv[0]}, ${hsv[1]}%, ${hsv[2]}%` },
    });

    message.channel.send({ embed, files: [{ attachment: image, name: `${hex}.jpg` }] });
}

async function colourRandom(message) {
    const hex = '#'+colours.randomHexColour(false);
    const [red, green, blue] = hex.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i).slice(1);

    const rgb = [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)];
    const hsv = colours.rgbToHsv(rgb);

    const htmlString = `<html> <style>* {margin:0; padding:0;}</style> <div style="background-color:${hex}; width:200px; height:200px"></div> </html>`;
    const image = await html.toImage(htmlString, 200, 200);

    const embed = new Discord.MessageEmbed({
        title: `Colour \`${hex.toLowerCase()}\``,
        color: parseInt(hex.split('#')[1], 16),
        image: { url: `attachment://${hex.replace('#', '')}.jpg` },
        footer: { text: `RGB: ${rgb.join(', ')} | HSV: ${hsv[0]}, ${hsv[1]}%, ${hsv[2]}%` },
    });

    message.channel.send({ embed, files: [{ attachment: image, name: `${hex.replace('#', '')}.jpg` }] });
}
