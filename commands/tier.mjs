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
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});
        const tiers = await getTiers(gameMode);
        const embed = new EmbedBuilder()
            .setTitle(t('Loot Tiers'))
            .setDescription(`
                ${t('Loot tiers are divided primarily by the per-slot value of the item')}:
                • ${t((await getPriceTier(tiers.legendary)).msg)} ≥ ${tiers.legendary.toLocaleString(lang)}₽
                • ${t((await getPriceTier(0, true)).msg)}
                • ${t((await getPriceTier(tiers.great)).msg)} ≥ ${tiers.great.toLocaleString(lang)}₽
                • ${t((await getPriceTier(tiers.average)).msg)} ≥ ${tiers.average.toLocaleString(lang)}₽
                • ${t((await getPriceTier(tiers.average -1)).msg)} < ${tiers.average.toLocaleString(lang)}₽
            `)
            .setFooter({text: gameModeLabel});
        return interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
