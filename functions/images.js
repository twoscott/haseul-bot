//Require modules

//Classes

class Image {
    constructor(data) {
        this.image = Uint8Array.from(data);
    }

    get type() {
        let data = this.image;
        return (
            data.slice(0, 2).join(' ') == '255 216'                  ? 'jpg' :
            data.slice(0, 8).join(' ') == '137 80 78 71 13 10 26 10' ? 'png' :
            data.slice(0, 6).join(' ') == '71 73 70 56 57 97'        ? 'gif' :
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

module.exports = Image;