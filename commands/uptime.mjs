import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from 'discord.js';
import { formatHMS } from '../modules/utils.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("Shows the uptime of the bot"),
    async execute(interaction) {
        const embed = new MessageEmbed();
        embed.setTitle("Stash Uptime ⌛");

        const uptime = process.uptime();
        const date = new Date(uptime * 1000);
        const uptimeFmt = formatHMS(date);

        embed.setDescription(`I have been online for: ${uptimeFmt}`);
        embed.setFooter({"text": "Format HH:MM:SS"});
        await interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;
