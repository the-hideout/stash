import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';

import commands from '../modules/get-commands.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tells you a bit about the bot')
        .addStringOption(option => option
            .setName('command')
            .setDescription('Get help about command')),
    async execute(interaction) {
        const embed = new MessageEmbed();
        const helpCommand = interaction.options.getString('command');

        if (!helpCommand || !commands[helpCommand]) {
            embed.setTitle("Available Commands");
            embed.setDescription(`Need Help or Have Questions?
        [Come visit us in our server.](https://discord.gg/XPAsKGHSzH)`);

            for (const command in commands) {
                const cmd = commands[command];

                embed.addField(cmd.syntax, cmd.description);
            }

            await interaction.editReply({ embeds: [embed] });

            return true;
        }

        const cmd = commands[helpCommand];

        embed.setTitle("!" + helpCommand + " command help");
        embed.addField(cmd.syntax, cmd.description + "\r\n\r\nExamples:\r\n" + cmd.examples);

        await interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;