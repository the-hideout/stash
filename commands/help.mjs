import {
    MessageEmbed,
} from 'discord.js';

const help = (message) => {
    const helpCommand = message.content.toLowerCase().replace('!help', '').trim();
    const commands = {
        'help': { syntax: '!help [{command}]', description: 'Show details for {command}', examples: '!help rig' },
        'map': { syntax: '!map [{mapname} {mapname}] [-{mapname}]', description: 'Select a random map', examples: '!map -woods\r\n!map customs shoreline interchange' },
        'price': { syntax: '!price {itemname}', description: 'Show prices for item(s) matching {itemname}', examples: '!price bitcoin' },
        'barter': { syntax: '!barter {itemname}', description: 'Shows barter trades for item(s) matching {itemname}', examples: '!barter slick' },
        'craft': { syntax: '!craft {itemname}', description: 'Shows crafts for item(s) matching {itemname}', examples: '!craft 7n31' }
    };
    const embed = new MessageEmbed();

    if (helpCommand == '') {
        embed.setTitle("Available Commands");
        for (const command in commands) {
            const c = commands[command];
            embed.addField(c.syntax, c.description);
        }
    } else {
        if (commands.hasOwnProperty(helpCommand)) {
            const c = commands[helpCommand];
            embed.setTitle("!" + helpCommand + " command help");
            embed.addField(c.syntax, c.description + "\r\nExamples:\r\n" + c.examples);
        }
    }

    if (embed.length > 0) {
        message.channel.send({embeds: [embed]})
            .then(console.log)
            .catch(console.error);
    } else {
        message.react('❌');
    }
};

export default help;