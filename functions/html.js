const axios = require('axios');

exports.toImage = async function(html, width, height, type='jpeg') {
    const image = await axios({
        method: 'post',
        url: 'http://localhost:3000/html',
        data: {
            html,
            width,
            height,
            imageFormat: type,
            quality: 100,
        },
        responseType: 'stream',
    });

    return image.data;
};
