import {
    EmbedBuilder,
} from 'discord.js';

import { getFixedT } from "./translations.mjs";

// Send a generic error message as an embed
// :param interaction: The Discord interaction object
// :param message: The message text to send
const generalError = async (interaction, message) => {
    const t = getFixedT(interaction.locale);
    const sendTo = interaction.fallbackChannel || interaction.channel;
    const embed = new EmbedBuilder();

    message = message || t('An error has occurred');
    message = `${interaction.user} ${message}`;

    embed.setTitle(t('❌ ERROR ❌'));
    embed.setDescription(message);

    sendTo.send({
        embeds: [embed],
    });
};

export default generalError;
