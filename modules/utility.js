//Require modules

const discord = require("discord.js");
const axios = require("axios")

const client = require("../haseul").client;
const config = require("../config.json");
const helpmodules = require("../haseul_data/help");
const functions = require("../functions/functions.js")

//Init

const translate_key = config.trans_key;

//Functions

exports.handle = async (message) => {

    let args = message.content.trim().split(" ");

    //Handle commands

    switch (args[0]) {

        case ".github":
        case ".git":
            message.channel.send("https://github.com/haseul/haseul-bot");
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
            message.channel.send("Discord API:").then(msg => {
                let end = Date.now();
                let ms = end - start;
                msg.edit(`Response: \`${ms}ms\``);
            })
            break;

    }
}

translate = async (args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 1) {
            resolve("\\⚠ Please provide a language and text to translate to.");
            return;
        }
        let response = await axios.get(`https://api.cognitive.microsofttranslator.com/languages?api-version=3.0`);
        let langs = response.data.translation;
        
        let lang_options = args[0]
        let text = args.slice(1).join(" ");

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
    
        if (!target_lang_code) {
            resolve(`\\⚠ Invalid language or language code given.`);
            return;
        }
        if (!text) {
            resolve(`\\⚠ No text given to be translated.`);
            return;
        }

        let url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(target_lang_code)}`;
        if (source_lang_code) {
            url += `&from=${encodeURIComponent(source_lang_code)}`;
        }
        let config = {
            headers: {
                "Ocp-Apim-Subscription-Key": translate_key
            }
        }
        axios.post(url, [{"Text": text}], config).then(response => {
            let source_language;
            let target_language;
            if (response.data[0].detectedLanguage) {
                source_language = response.data[0].detectedLanguage.language;
            } else {
                source_language = source_lang_code;
            }
            target_language = response.data[0].translations[0].to

            resolve(`**${source_language}-${target_language}** Translation: ${response.data[0].translations[0].text}`);
        }).catch(error => {
            reject(error);
        })
    })
}

help = async (message, args) => {
    return new Promise((resolve, reject) => {
        if (args.length < 1) {            
            let embed = new discord.RichEmbed()
            .setAuthor(`Help`, `https://i.imgur.com/p9n0Y0C.png`)
            .setColor(0xfe4971);
            let pages = [];
            let page = ["To get help, type `.help <module name>`. Here you will see the module's commands and how to use them.\n\n**Modules**"];
            let length = page[0].length;
    
            for (let module_name in helpmodules) {
                if (length + (module_name.length + 1) > 2048 || page.length > 19) { // + 1 = line break
                    pages.push(page.join("\n"));
                    page = [module_name];
                    length = module_name.length + 1;
                } else {
                    page.push(module_name);
                    length += module_name.length + 1;
                }
            }
            pages.push(page.join("\n"));
    
            functions.embedPages(message, embed, pages, 600000);
            resolve();
            return;
        }

        let module_name;
        switch (args[0]) {
            case "lastfm":
            case "fm":
            case "lf":
                module_name = "lastfm";
                break;
            
            case "youtube":
            case "yt":
                module_name = "youtube";
                break;
            
            case "utility":
            case "ut":
                module_name = "utility";
                break;
            
            default:
                resolve("\\⚠ Invalid module name provided.");
                return;
        }

        let module_obj = helpmodules[module_name];
        
        let commands = module_obj.commands;
        let pages = [];
        let page = [];
        let field_count = 0;
        for (i=0; i < commands.length; i++) {
            if (field_count > 4) {
                pages.push(page);
                page = [commands[i]];
                field_count = 1;
            } else {
                page.push(commands[i]);
                field_count += 1;
            }
        }
        pages.push(page);

        let embed = new discord.RichEmbed()
        .setAuthor(module_obj.name, module_obj.image)
        .setColor(+module_obj.colour)
        .setDescription(module_obj.description)

        functions.embedPagesFields(message, embed, pages, 600000);
        resolve();
    })  
}
