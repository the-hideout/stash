import {
    MessageEmbed,
} from 'discord.js';

import commands from '../modules/get-commands.mjs';

const help = (message) => {
    const helpCommand = message.content.toLowerCase().replace('!help', '').trim();
    const sendTo = message.fallbackChannel || message.channel;
    const embed = new MessageEmbed();

    if (helpCommand == '' || message.content.toLowerCase().indexOf('!help') !== 0) {
        embed.setTitle("Available Commands");
        embed.setDescription(`Need Help or Have Questions?
        [Come visit us in our server.](https://discord.gg/XPAsKGHSzH)`);

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