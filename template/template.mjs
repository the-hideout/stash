// A template file to quickly create a new bot command
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
// import generalError from '../modules/general-error.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("TEMPLATE")
        .setDescription("TEMPLATE DESCRIPTION"),
    async execute(interaction) {
        const embed = new EmbedBuilder();
        embed.setTitle("TEMPLATE TITLE");
        embed.setDescription("TEMPLATE DESCRIPTION");
        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
