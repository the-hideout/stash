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

            for (const command in commands) {
                const c = commands[command];

                embed.addField(c.syntax, c.description);
            }

            await interaction.reply({ embeds: [embed] });

            return true;
        }

        const c = commands[helpCommand];

        embed.setTitle("!" + helpCommand + " command help");
        embed.addField(c.syntax, c.description + "\r\n\r\nExamples:\r\n" + c.examples);

        await interaction.reply({ embeds: [embed] });
	},
};

export default defaultFunction;