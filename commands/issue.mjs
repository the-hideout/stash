import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("issue")
        .setDescription("Send issues to the developers")
        .setNameLocalizations(getCommandLocalizations('issue'))
        .setDescriptionLocalizations(getCommandLocalizations('issue_desc'))
        .addStringOption(option => option
            .setRequired(true)
            .setName("message")
            .setDescription("Enter your message")
            .setNameLocalizations(getCommandLocalizations('message'))
            .setDescriptionLocalizations(getCommandLocalizations('issue_message_desc'))
            .setRequired(true)
        ),

    async execute(interaction) {
        const t = getFixedT(interaction.locale);
        const { client, member } = interaction;
        const details = interaction.options.getString("message");
    
        client.shard.send({
            type: 'reportIssue', 
            details: details,
            user: member.user.username,
            reportLocation: member.guild ? `Server: ${member.guild.name}` : 'Reported in a DM',
        });
        return interaction.reply({
            content: t("Thanks for reporting, we're on it!"),
            ephemeral: true,
        });
    },
};

export default defaultFunction;
