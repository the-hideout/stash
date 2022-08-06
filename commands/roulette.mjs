import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from 'discord.js';
import fs from 'fs';

const rouletteData = JSON.parse(fs.readFileSync('data/roulette.json'));

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("roulette")
        .setDescription("Spin the roulette wheel for a fun or challenging game of tarkov!"),
    async execute(interaction) {

        const draw = rouletteData[Math.floor(Math.random()*rouletteData.length)];

        const embed = new MessageEmbed();
        embed.setTitle(draw.name);
        embed.setDescription(draw.description);
        embed.setFooter({
            text: 'Good Luck! 🎲',
        });

        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
