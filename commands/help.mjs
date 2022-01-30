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
        [Come visit us in our support server.](https://discord.gg/F7JeqsfSkq)`);

            for (const command in commands) {
                const c = commands[command];

                embed.addField(c.syntax, c.description);
            }

            await interaction.editReply({ embeds: [embed] });

            return true;
        }

        const c = commands[helpCommand];

        embed.setTitle("!" + helpCommand + " command help");
        embed.addField(c.syntax, c.description + "\r\n\r\nExamples:\r\n" + c.examples);

        await interaction.editReply({ embeds: [embed] });
	},
};

export default defaultFunction;