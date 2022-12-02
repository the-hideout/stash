import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import lootTier, { getTiers } from '../modules/loot-tier.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('tier')
        .setDescription('Shows the criteria for loot tiers')
        .setNameLocalizations(getCommandLocalizations('tier'))
        .setDescriptionLocalizations(getCommandLocalizations('tier_desc')),

    async execute(interaction) {
        const t = getFixedT(interaction.locale);
        const tiers = getTiers();
        const embed = new EmbedBuilder()
            .setTitle(t('Loot Tiers'))
            .setDescription(`
                ${t('Loot tiers are divided primarily by the per-slot value of the item')}:
                • ${t(lootTier(tiers.legendary).msg)} ≥ ${tiers.legendary.toLocaleString(interaction.locale)}₽
                • ${t(lootTier(0, true).msg)}
                • ${t(lootTier(tiers.great).msg)} ≥ ${tiers.great.toLocaleString(interaction.locale)}₽
                • ${t(lootTier(tiers.average).msg)} ≥ ${tiers.average.toLocaleString(interaction.locale)}₽
                • ${t(lootTier(tiers.average -1).msg)} < ${tiers.average.toLocaleString(interaction.locale)}₽
            `);

        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
