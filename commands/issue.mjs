import { SlashCommandBuilder } from "@discordjs/builders";

import sendError from '../modules/send-error.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("issue")
        .setDescription("Send issues to the developers")
        .addStringOption(option => option
            .setRequired(true)
            .setDescription("Enter your message")
            .setName("message")
        ),
    async execute(interaction) {
        const { client, member } = interaction;
        const details = interaction.options.getString("message");

        sendError(client, member, details);

        interaction.reply({
            content: "Thanks for reporting, we're on it!",
            ephemeral: true,
        });
    },
};

export default defaultFunction;