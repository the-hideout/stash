import { SlashCommandBuilder } from "discord.js";

import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import sendWebhook from '../modules/webhook.mjs';

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
        const { member } = interaction;
        const details = interaction.options.getString("message");
    
        sendWebhook({
            title: 'New Issue Reported 🐞',
            message: `**Issue Description:**\n${details}`,
            footer: `This issue was reported by @${member.user.username} | ${member.guild ? `Server: ${member.guild.name}` : 'Reported in a DM'}`,
        });
        return interaction.reply({
            content: t("Thanks for reporting, we're on it!"),
            ephemeral: true,
        });
    },
};

export default defaultFunction;
