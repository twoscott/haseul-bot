//Require modules

const axios = require("axios");

//Functions

exports.toImage = async function (html, width, height, type="jpeg") {
    
    let image = await axios({
        method: 'post',
        url: "http://localhost:3000/html",
        data: {
            html: html, 
            width: width, 
            height: height,
            imageFormat: type,
            quality: 100
        },
        responseType: "stream"
    })
    
    return image.data;

}