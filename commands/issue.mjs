import { SlashCommandBuilder } from "discord.js";

import sendError from '../modules/send-error.mjs';
import { getFixedT } from '../modules/translations.mjs';

const comT = getFixedT(null, 'command');

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("issue")
        .setDescription("Send issues to the developers")
        .setNameLocalizations({
            'es-ES': comT('issue', {lng: 'es-ES'}),
            ru: comT('issue', {lng: 'ru'}),
        })
        .setDescriptionLocalizations({
            'es-ES': comT('issue_desc', {lng: 'es-ES'}),
            ru: comT('issue_desc', {lng: 'ru'}),
        })
        .addStringOption(option => option
            .setRequired(true)
            .setName("message")
            .setDescription("Enter your message")
            .setNameLocalizations({
                'es-ES': comT('message', {lng: 'es-ES'}),
                ru: comT('message', {lng: 'ru'}),
            })
            .setDescriptionLocalizations({
                'es-ES': comT('issue_message_desc', {lng: 'es-ES'}),
                ru: comT('issue_message_desc', {lng: 'ru'}),
            })
            .setRequired(true)
        ),

    async execute(interaction) {
        const t = getFixedT(interaction.locale);
        const { client, member } = interaction;
        const details = interaction.options.getString("message");

        sendError(client, member, details);

        interaction.reply({
            content: t("Thanks for reporting, we're on it!"),
            ephemeral: true,
        });
    },
};

export default defaultFunction;
