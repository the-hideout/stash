import {
    MessageEmbed,
} from 'discord.js';

const help = (message) => {
    const helpCommand = message.content.toLowerCase().replace('!help', '').trim();
    const sendTo = message.fallbackChannel || message.channel;
    const commands = {
        'help': {
            syntax: '!help [command]',
            description: 'Show details for command',
            examples: '!help barter',
        },
        'map': {
            syntax: '/map or !map [mapname mapname] [-mapname]',
            description: 'Select a random map',
            examples: '!map -woods\r\n!map customs shoreline interchange',
         },
        'price': {
            syntax: '/price or !price itemname',
            description: 'Show prices for item(s) matching itemname',
            examples: '!price bitcoin',
        },
        'barter': {
            syntax: '/barter or !barter itemname',
            description: 'Shows barter trades for item(s) matching itemname',
            examples: '!barter slick',
        },
        'craft': {
            syntax: '/craft or !craft itemname',
            description: 'Shows crafts for item(s) matching itemname',
            examples: '!craft 7n31',
        },
    };
    const embed = new MessageEmbed();

    if (helpCommand == '' || message.content.toLowerCase().indexOf('!help') !== 0) {
        embed.setTitle("Available Commands");
        for (const command in commands) {
            const c = commands[command];
            embed.addField(c.syntax, c.description);
        }
    } else {
        if (commands.hasOwnProperty(helpCommand)) {
            const c = commands[helpCommand];
            embed.setTitle("!" + helpCommand + " command help");
            embed.addField(c.syntax, c.description + "\r\n\r\nExamples:\r\n" + c.examples);
        }
    }

    if (embed.length > 0) {
        sendTo.send({embeds: [embed]})
            .catch(console.error);
            // .then(console.log)
    } else {
        message.react('❌');
    }
};

export default help;