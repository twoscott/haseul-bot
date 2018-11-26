module.exports = {
    modules: 
    {
        lastfm: {
            name: "lastfm | fm",
            description: "\\⚠ `[]` signifies the parameter is required, `<>` parameters and words ending with `?` are optional.",
            image: "https://i.imgur.com/YbZ52lN.png",
            colour: 0xc1222a,
            commands: [
                {
                    name: "fm set",
                    usage: "`.fm set [lastfm username]` this links your Discord account to your Last.fm account, meaning when you use other commands such as fm or fmyt you won't need to define a username."
                },
                {
                    name: "fm remove | delete",
                    usage: "`.fm remove` this unlinks your Discord account from your Last.fm."
                },
                {
                    name: "fm recent | recents",
                    usage: "`.fm recent <track count> <lastfm user>` this displays a defined amount of recent tracks you have listened to recently, displayed differently depending on if you request 1, 2, or more than 2 tracks to be displayed."
                },
                {
                    name: "fm np",
                    usage: "`.fm np <lastfm user>` this is shorthand for `.fm recent 1`"
                },
                {
                    name: "fm",
                    usage: "`.fm <lastfm user>` this is shorthand for `.fm recent 2`"
                },
                {
                    name: "fmyt",
                    usage: "`.fmyt` this searches YouTube for the song you're listening to/last listened to on Last.fm and returns it."
                },
                {
                    name: "fm topartists | ta",
                    usage: "`.fm topartists <time period> <lastfm user>` this shows your most listened to artists for a given time period."
                },
                {
                    name: "fm topalbums | tal | tab",
                    usage: "`.fm topalbums <time period> <lastfm user>` this shows your most listened to albums for a given time period."
                },
                {
                    name: "fm toptracks | tt",
                    usage: "`.fm toptracks <time period> <lastfm user>` this shows your most listened to tracks for a given time period."
                },
                {
                    name: "fm profile",
                    usage: "`.fm profile <lastfm user>` this displays some information about your last.fm profile."
                },
                {
                    name: "chart",
                    usage: "`.chart artists? <time period> <grid size (3x3/4x4/5x5)>` this displays a chart of your most listened to albums (or artists if \"artists\" is included) for the given time period."
                }
            ]
        },
        youtube: {
            name: "youtube | yt",
            description: "\\⚠ `[]` signifies the parameter is required, `<>` parameters and words ending with `?` are optional.",
            image: "https://i.imgur.com/U3xey80.png",
            colour: 0xe35556,
            commands: [
                {
                    name: "youtube | yt",
                    usage: "`.youtube <query>` this searches YouTube for your query and returns the top result."
                }
            ]
        },
        utility: {
            name: "utility",
            description: "\\⚠ `[]` signifies the parameter is required, `<>` parameters and words ending with `?` are optional.",
            image: "https://i.imgur.com/UCXza9B.png",
            colour: 0x4965fe,
            commands: [
                {
                    name: "translate | tr",
                    usage: "`.translate <source language code>-?<target language code> <text>` this translates text either from a given source language or the auto-detected language of your text to your desired language and returns it (uses Bing translate :/)"
                },
                {
                    name: "help",
                    usage: "`.help <module name>?` displays the commands under a given module and how to use them."
                }
            ]
        }
    }
}