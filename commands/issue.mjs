import { SlashCommandBuilder } from "discord.js";

import sendError from '../modules/send-error.mjs';
import { changeLanguage, t } from '../modules/translations.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("issue")
        .setDescription("Send issues to the developers")
        .setNameLocalizations({
            'es-ES': 'problema',
            ru: 'проблема',
        })
        .setDescriptionLocalizations({
            'es-ES': 'Enviar problemas a los desarrolladores',
            ru: 'Отправить проблемы разработчикам',
        })
        .addStringOption(option => option
            .setRequired(true)
            .setName("message")
            .setDescription("Enter your message")
            .setNameLocalizations({
                'es-ES': 'mensaje',
                ru: 'сообщение',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Ingrese su mensaje',
                ru: 'Введите сообщение',
            })
            .setRequired(true)
        ),

    async execute(interaction) {
        const { client, member } = interaction;
        const details = interaction.options.getString("message");

        sendError(client, member, details);

        changeLanguage(interaction.locale);
        interaction.reply({
            content: t("Thanks for reporting, we're on it!"),
            ephemeral: true,
        });
    },
};

export default defaultFunction;
