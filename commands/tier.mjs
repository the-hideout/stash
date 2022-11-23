import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import lootTier, { getTiers } from '../modules/loot-tier.mjs';
import { changeLanguage, t } from '../modules/translations.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('tier')
        .setDescription('Shows the criteria for loot tiers')
        .setNameLocalizations({
            'es-ES': 'tier',
            ru: 'ярус',
        })
        .setDescriptionLocalizations({
            'es-ES': 'Muestra los criterios para los niveles de botín.',
            ru: 'Показывает критерии уровней добычи',
        }),

    async execute(interaction) {
        const tiers = getTiers();
        changeLanguage(interaction.locale);
        const embed = new EmbedBuilder()
            .setTitle(t('Loot Tiers'))
            .setDescription(`
                ${t('Loot tiers are divided primarily by the per-slot value of the item')}:
                • ${t(lootTier(tiers.legendary).msg)} ≥ ${tiers.legendary.toLocaleString()}₽
                • ${t(lootTier(0, true).msg)}
                • ${t(lootTier(tiers.great).msg)} ≥ ${tiers.great.toLocaleString()}₽
                • ${t(lootTier(tiers.average).msg)} ≥ ${tiers.average.toLocaleString()}₽
                • ${t(lootTier(tiers.average -1).msg)} < ${tiers.average.toLocaleString()}₽
            `);

        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
