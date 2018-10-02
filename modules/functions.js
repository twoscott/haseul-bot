const discord = require("discord.js");

module.exports = (client = discord.Client) => {

    capitalize = (string_arg) => {
        return (string_arg[0].toUpperCase() + string_arg.slice(1).toLowerCase());
    }
}