import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import getPriceTier, { getTiers } from '../modules/loot-tier.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('tier')
        .setDescription('Shows the criteria for loot tiers')
        .setNameLocalizations(getCommandLocalizations('tier'))
        .setDescriptionLocalizations(getCommandLocalizations('tier_desc')),

    async execute(interaction) {
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const tiers = await getTiers();
        const embed = new EmbedBuilder()
            .setTitle(t('Loot Tiers'))
            .setDescription(`
                ${t('Loot tiers are divided primarily by the per-slot value of the item')}:
                • ${t((await getPriceTier(tiers.legendary)).msg)} ≥ ${tiers.legendary.toLocaleString(locale)}₽
                • ${t((await getPriceTier(0, true)).msg)}
                • ${t((await getPriceTier(tiers.great)).msg)} ≥ ${tiers.great.toLocaleString(locale)}₽
                • ${t((await getPriceTier(tiers.average)).msg)} ≥ ${tiers.average.toLocaleString(locale)}₽
                • ${t((await getPriceTier(tiers.average -1)).msg)} < ${tiers.average.toLocaleString(locale)}₽
            `);

        return interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
