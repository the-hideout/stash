import { SlashCommandBuilder } from "discord.js";

import sendError from '../modules/send-error.mjs';
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

        sendError(client, member, details);

        return interaction.reply({
            content: t("Thanks for reporting, we're on it!"),
            ephemeral: true,
        });
    },
};

export default defaultFunction;
