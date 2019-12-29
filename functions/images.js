const fs = require("fs");
const html = require("../functions/html.js");

class Image {
    constructor(data) {
        this.image = Uint8Array.from(data);
    }

    get type() {
        let data = this.image;
        return (
            data.slice(0, 2).join(" ") == '255 216'                  ? 'jpg' :
            data.slice(0, 8).join(" ") == '137 80 78 71 13 10 26 10' ? 'png' :
            data.slice(0, 6).join(" ") == '71 73 70 56 57 97'        ? 'gif' :
            null
        );
    }

    jpgDim(data) {
        let marker = data.findIndex((x, i) => x == 255 && data[i+1] == 192);
        let SOF0   = data.slice(marker, marker+13);
        this.imgHeight = SOF0.slice(5, 7).reduce((sum, x, i) => sum + (x * (2 ** (16 - ((i+1)*8) ))), 0);
        this.imgWidth  = SOF0.slice(7, 9).reduce((sum, x, i) => sum + (x * (2 ** (16 - ((i+1)*8) ))), 0);
        return [this.imgWidth, this.imgHeight];
    }

    pngDim(data) {
        this.imgWidth  = data.slice(16, 20).reduce((sum, x, i) => sum + (x * (2 ** (32 - ((i+1)*8) ))), 0);
        this.imgHeight = data.slice(20, 24).reduce((sum, x, i) => sum + (x * (2 ** (32 - ((i+1)*8) ))), 0);
        return [this.imgWidth, this.imgHeight];
    }

    gifDim(data) {
        this.imgWidth  = data.slice(6,  8).reduce((sum, x, i) => sum + (x * (2 ** (i*8) )), 0);
        this.imgHeight = data.slice(8, 10).reduce((sum, x, i) => sum + (x * (2 ** (i*8) )), 0);
        return [this.imgWidth, this.imgHeight];
    }

    get dimensions() {
        if (!this.imgDims) {
            let data = this.image;
            let type = this.type;
            this.imgDims = (
                type == 'jpg' ? this.jpgDim(data) :
                type == 'png' ? this.pngDim(data) :
                type == 'gif' ? this.gifDim(data) :
                null
            );
        }
        return this.imgDims;
    }

    get width() {
        return this.imgWidth || this.dimensions[0];
    }

    get height() {
        return this.imgHeight || this.dimensions[1];
    }

}

async function createMediaCollage(media, width, height, col1w) {

    if (media.length < 2) {
        return media[0];
    }

    if (media.length > 4) {
        media = media.slice(0, 4);
    }

    if (media.length == 4) {
        let temp = media[1];
        media[1] = media[2];
        media[2] = temp;
    }

    let col1 = media.slice(0, Math.floor(media.length/2));
    let col2 = media.slice(Math.floor(media.length/2), 4);

    let htmlString = "";
    htmlString += '<div class="media-container">\n';

    if (col1) {
        if (col1.length == 1) {
            if (col2.length > 1) {
                htmlString += `<div class="media-column c1 media-image" style="background-image:url(${col1[0]}); height:${height}px; width:${(col1w || width/2)-2}px;"></div>\n`;
            } else {
                htmlString += `<div class="media-column c1 media-image" style="background-image:url(${col1[0]}); height:${height}px; width:${width/2-2}px;"></div>\n`;
            }
        }
        if (col1.length == 2) {
            htmlString += `<div class="media-column c1">\n`
            for (let i=0; i<2; i++) {
                htmlString += `<div class="media-image i${i+1}" style="background-image:url(${col1[i]}); height:${height/2-2}px; width:${width/2-2}px;"></div>\n`
            }
            htmlString += `</div>\n`
        }
    }

    if (col2) {
        if (col2.length == 1) {
            htmlString += `<div class="media-column c2 media-image" style="background-image:url(${col2[0]}); height:${height}px; width:${width/2-2}px;"></div>\n`;
        }
        if (col2.length == 2) {
            htmlString += `<div class="media-column c2">\n`
            for (let i=0; i<2; i++) {
                htmlString += `<div class="media-image i${i+1}" style="background-image:url(${col2[i]}); height:${height/2-2}px; width:${(col1w && col1.length==1 ? width-col1w : width/2)-2}px;"></div>\n`
            }
            htmlString += `</div>\n`
        }
    }

    htmlString+= '</div>\n'

    let css = fs.readFileSync("./resources/css/twittermedia.css", {encoding: 'utf8'});
    htmlString = [
        `<html>\n`,
        `<style>\n`,
        `${css}\n`,
        `</style>\n\n`,
        `<body>\n`,
        `${htmlString}\n`,
        `</body>\n\n`,
        `</html>\n`
    ].join(``);

    let image = await html.toImage(htmlString, width, height, 'png');
    return image;

}

module.exports = { Image, createMediaCollage };
