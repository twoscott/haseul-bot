// Require modules

const Discord = require("discord.js");
const axios = require("axios")

const config = require("../config.json");
const helpmodules = require("../resources/JSON/help.json");
const langs = require("../resources/JSON/languages.json");

const functions = require("../functions/functions.js")

const units = {
    nm: ['nanometer', 'nanometre', 'nanometers', 'nanometres'],
    μm: ['um', 'micrometer', 'micrometre', 'micrometers', 'micrometres'],
    mm: ['millimeter', 'millimeter', 'millimeters', 'millimeters'],
    cm: ['centimeter', 'centimetre', 'centimeters', 'centimetres'],
    m:  ['meter', 'metre', 'meters', 'metres'],
    km: ['kilometer', 'kilometre', 'kilometers', 'kilometres'],
    in: ['inch', 'inches'],
    ft: ['foot', 'feet'],
    yd: ['yard', 'yards'],
    mi: ['mile', 'miles']
}

const meter_const = {

    nm: 0.000000001,
    μm: 0.000001,
    mm: 0.001,
    cm: 0.01,
     m: 1,
    km: 1000,

    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mi: 1609.344,

}

// Init

const translate_key = config.trans_key;
// const strawpoll_timeouts = new Map();

// Functions

exports.msg = async function(message, args) {

    // Handle commands

    switch (args[0]) {

        // case ".convert":
        // case ".cv":
        //     message.channel.startTyping();
        //     convert(args).then(response => {
        //         message.channel.send(response);
        //         message.channel.stopTyping();
        //     }).catch(error => {
        //         console.error(error);
        //         message.channel.stopTyping();
        //     })
        //     break;

        case ".github":
        case ".git":
            message.channel.send("https://github.com/haseul/haseul-bot");
            break;
        
        case ".discord":
            message.channel.send("https://discord.gg/w4q5qux");
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
            break;

        // case ".strawpoll":
        // case ".straw":
        // case ".sp":
        //     message.channel.startTyping();
        //     strawpoll(message, args.slice(1)).then(response => {
        //         message.channel.send(response);
        //         message.channel.stopTyping();
        //     }).catch(error => {
        //         console.error(error);
        //         message.channel.stopTyping();
        //     })
        //     break;

        case ".help":
            message.channel.startTyping();
            help(message, args.slice(1)).then(response => {
                if (response) message.channel.send(response);
                message.channel.stopTyping();
            }).catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
            break;
            
        case ".ping":
            let start = Date.now();
            message.channel.send("Response: ").then(msg => {
                let end = Date.now();
                let ms = end - start;
                msg.edit(`Response: \`${ms}ms\``);
            })
            break;

    }
}

async function convert(args) {

    if (args.length < 1) {
        return "⚠ Please provide units to convert!";
    }

    let match = args.slice(1).join(" ").match(/([0-9,\.]+)([A-z ]+)\s*(?:to|-)\s*([A-z ]+)/i);
    if (!match) {
        return `⚠ Please format conversions like this \`${args[0]} {number}[unit] to [unit]\`, for example \`${args[0]} 100cm to inches\``
    }

    let input = parseInt(match[1], 10);
    let source = match[2].trim();
    let target = match[3].trim();

    for (abbrv in units) {
        if (abbrv == source || units[abbrv].includes(source)) source = abbrv;
    }
    for (abbrv in units) {
        if (abbrv == target || units[abbrv].includes(target)) target = abbrv;
    }

    let result = Math.round((input * meter_const[source] * meter_const[target] ** -1) * 100) / 100;
    
    let output;
    let alt;
    if (target == 'ft') {
        let feet = Math.floor(input * meter_const[source] * meter_const['ft'] ** -1);
        let inches = Math.round((input * meter_const[source] * meter_const['in'] ** -1) % 12);
        alt = `${feet}ft ${Math.round((inches * 10) / 10)}in`;
    }

    return new Discord.RichEmbed().setAuthor(`${input}${source} = ${result}${target}${alt ? ` (${alt})`:``}`);

}

async function translate(args) {

    if (args.length < 1) {
        return "Help with translation can be found here: https://haseulbot.xyz/#misc";
    }

    let lang_options = args[0]
    let text = args.slice(1).join(" ");

    if (lang_options.toLowerCase() == "languages") {
        return "Language codes can be found here: https://haseulbot.xyz/languages/"
    }

    let source_lang;
    let target_lang;
    let lang_options_array = lang_options.split("-");
    if (lang_options_array.length > 2) {
        if (lang_options.toLowerCase().startsWith("zh-hans") || lang_options.toLowerCase().startsWith("zh-hant")) {
            source_lang = lang_options_array.slice(0, 2).join("-");
            target_lang = lang_options_array[2];
        } else {
            source_lang = lang_options_array[0];
            target_lang = lang_options_array.slice(1).join("-");
        }
    } else if (lang_options_array.length > 1) {
        source_lang = lang_options_array[0];
        target_lang = lang_options_array[1];
    } else {
        target_lang = lang_options;
    }

    let source_lang_code;
    if (source_lang) {
        if (langs[source_lang]) {
            source_lang_code = source_lang;
        } else {
            for (property in langs) {
                if (langs[property].name.toLowerCase() == source_lang.toLowerCase()) {
                    source_lang_code = property;
                }
            }
        }
    }
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

    if (!target_lang_code) return `⚠ Invalid language or language code given.`;
    if (!text) return `⚠ No text given to be translated.`;

    let url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(target_lang_code)}`;
    if (source_lang_code) {
        url += `&from=${encodeURIComponent(source_lang_code)}`;
    }

    let translation = await axios.post(url, [{"Text": text}], {
        headers: { "Ocp-Apim-Subscription-Key": translate_key }
    });
    let { detectedLanguage, translations } = translation.data[0];
    let source_language = detectedLanguage ? detectedLanguage.language : source_lang_code;
    let target_language = translations[0].to;

    return `**${source_language}-${target_language}** Translation: ${translations[0].text}`;

}

// const strawpoll = async function (message, args) {

//     if (args.length < 1) {
//         return "⚠ Please provide a question and at least 2 options.\nUsage: `.strawpoll Question | option#1, option#2, optio...`";
//     }

//     let { author } = message;

//     let timeout = strawpoll_timeouts.get(author.id);
//     if (timeout && author.id != '125414437229297664') {
//         let timeElapsed = Date.now() - timeout;
//         if (timeElapsed < 600000) {
//             let mins = Math.ceil(10 - timeElapsed / 60000);
//             return `⚠ You're making strawpolls too fast! Please wait another ${mins == 1 ? 'minute' : `${mins} minutes`}.`;
//         }
//     } 

//     let multi = false;
//     if (args[0] == 'multi') {
//         multi = true;
//         args.shift();
//     }
//     if (args[0] == 'single') {
//         multi = false;
//         args.shift();
//     }

//     args = args.join(" ");

//     let sep = new RegExp(/[^\\]\|/);
//     let [ question, options ] = args.split(sep, 2);
//     question = question.replace(/\\\|/g, '|').trim();
//     options  = options.split(',').map(o => o.replace(/\\\|/g, '|').trim());

//     if (options.length < 2) {
//         return "⚠ Please provide at least 2 options.";
//     }

//     try {
//         let { data } = await axios.post('https://www.strawpoll.me/api/v2/polls', 
//             { title: question,
//               options: options,
//               multi: multi }, 
//             { headers: { 'Content-Type': 'application/json' } }
//         )
//         strawpoll_timeouts.set(author.id, Date.now())
//         return `https://www.strawpoll.me/${data.id}`;
//     } catch (e) {
//         console.error(Error(e));
//         return "⚠ Error occurred.";
//     }

// }

async function help(args) {

    switch (args[0]) {
        default:
            return "Commands can be found here: https://haseulbot.xyz/";
    }

}
