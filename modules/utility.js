//Require modules

const discord = require("discord.js");
const axios = require("axios")
const client = require("../haseul").client;

//Variables

const translate_key = "KEY"

//Functions

handle = (message) => {

    let args = message.content.trim().split(" ");

    //Handle commands

    switch (args[0]) {

        case ".github":
            message.channel.startTyping();
            message.channel.send("https://github.com/haseul/haseul-bot");
            message.channel.stopTyping();
            break;
        
        case ".translate":
        case ".trans":
        case ".tr":
            message.channel.startTyping();
            translate(args.slice(1)).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })

    }
}

translate = async (args) => {
    return new Promise(async (resolve, reject) => {
        let response = await axios.get(`https://api.cognitive.microsofttranslator.com/languages?api-version=3.0`);
        let langs = response.data.translation;
        
        let target_lang = args[0].replace("zh", "zh-Hans").replace("chinese", "chinese simplified");
        let text = args.slice(1).join(" ");

        let target_lang_code;
    
        if (langs[target_lang]) {
            target_lang_code = target_lang;
        } else {
            for (property in langs) {
                if (langs[property].name.toLowerCase() == target_lang.toLowerCase()) {
                    target_lang_code = property;
                }
            }
        }
    
        if (!target_lang_code) {
            resolve(`\\⚠ Invalid language or language code given.`);
            return;
        }
        if (!text) {
            resolve(`\\⚠ No text given to be translated.`);
            return;
        }

        let config = {
            headers: {
                "Ocp-Apim-Subscription-Key": translate_key
            }
        }
        axios.post(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(target_lang_code)}`, [{"Text": text}], config).then(response => {
            let detected_lang = response.data[0].detectedLanguage.language;
            resolve(`**${detected_lang}-${target_lang_code}** Translation: ${response.data[0].translations[0].text}`);
        }).catch(error => {
            reject(error);
        })
    })
}

module.exports = {
    handle: handle
}