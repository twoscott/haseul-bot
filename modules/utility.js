const { withTyping } = require('../functions/discord.js');

const axios = require('axios');

const config = require('../config.json');
const langs = require('../resources/JSON/languages.json');
const { trimArgs } = require('../functions/functions.js');

const translateKey = config.trans_key;

exports.onCommand = async function(message, args) {
    const { channel } = message;

    switch (args[0]) {
    case 'github':
    case 'git':
        message.channel.send('https://github.com/twoscott/haseul-bot');
        break;
    case 'discord':
    case 'invite':
        message.channel.send('https://discord.gg/w4q5qux');
        break;
    case 'translate':
    case 'trans':
    case 'tr':
        withTyping(channel, translate, [message, args]);
        break;
    case 'help':
        message.channel.send('Commands can be found here: https://haseulbot.xyz/');
        break;
    case 'ping':
        const start = Date.now();
        message.channel.send('Response: ').then(msg => {
            const end = Date.now();
            const ms = end - start;
            msg.edit(`Response: \`${ms}ms\``);
        });
        break;
    }
};

async function translate(message, args) {
    if (args.length < 2) {
        return 'Help with translation can be found here: https://haseulbot.xyz/#misc';
    }

    const langOptions = args[1];
    const text = trimArgs(args, 2, message.content);

    if (langOptions.toLowerCase() == 'languages') {
        return 'Language codes can be found here: https://haseulbot.xyz/languages/';
    }

    let sourceLang;
    let targetLang;
    const langOptionsArray = langOptions.split('-');
    if (langOptionsArray.length > 2) {
        if (langOptions.toLowerCase().startsWith('zh-hans') || langOptions.toLowerCase().startsWith('zh-hant')) {
            sourceLang = langOptionsArray.slice(0, 2).join('-');
            targetLang = langOptionsArray[2];
        } else {
            sourceLang = langOptionsArray[0];
            targetLang = langOptionsArray.slice(1).join('-');
        }
    } else if (langOptionsArray.length > 1) {
        sourceLang = langOptionsArray[0];
        targetLang = langOptionsArray[1];
    } else {
        targetLang = langOptions;
    }

    let sourceLangCode;
    if (sourceLang) {
        if (langs[sourceLang]) {
            sourceLangCode = sourceLang;
        } else {
            for (property in langs) {
                if (langs[property].name.toLowerCase() ==
                    sourceLang.toLowerCase()) {
                    sourceLangCode = property;
                }
            }
        }
    }
    let targetLangCode;
    if (langs[targetLang]) {
        targetLangCode = targetLang;
    } else {
        for (property in langs) {
            if (langs[property].name.toLowerCase() ==
                targetLang.toLowerCase()) {
                targetLangCode = property;
            }
        }
    }

    if (!targetLangCode) {
        message.channel.send('⚠ Invalid language or language code given.');
        return;
    }
    if (!text) {
        message.channel.send('⚠ No text given to be translated.');
        return;
    }

    let url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(targetLangCode)}`;
    if (sourceLangCode) {
        url += `&from=${encodeURIComponent(sourceLangCode)}`;
    }

    const translation = await axios.post(url, [{ 'Text': text }], {
        headers: { 'Ocp-Apim-Subscription-Key': translateKey },
    });
    const { detectedLanguage, translations } = translation.data[0];
    const sourceLanguage = detectedLanguage ?
        detectedLanguage.language :
        sourceLangCode;
    const targetLanguage = translations[0].to;

    message.channel.send(`**${sourceLanguage}-${targetLanguage}** Translation: ${translations[0].text}`);
}
