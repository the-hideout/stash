// A template file to quickly create a new bot command
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from 'discord.js';
// import generalError from '../modules/general-error.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("TEMPLATE")
        .setDescription("TEMPLATE DESCRIPTION"),
    async execute(interaction) {
        const embed = new MessageEmbed();
        embed.setTitle("TEMPLATE TITLE");
        embed.setDescription("TEMPLATE DESCRIPTION");
        await interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;