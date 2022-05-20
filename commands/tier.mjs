import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';

import { getTiers } from '../modules/loot-tier.js';
import lootTier from '../modules/loot-tier.js';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('tier')
        .setDescription('Shows the criteria for loot tiers'),

    async execute(interaction) {
        const tiers = getTiers();
        const embed = new MessageEmbed()
            .setTitle("Loot Tiers")
            .setDescription(`
                Loot tiers are divided primarily by the per-slot value of the item:
                • ${lootTier(tiers.legendary).msg} >= ${tiers.legendary.toLocaleString()}₽
                • ${lootTier(0, true).msg}
                • ${lootTier(tiers.great).msg} >= ${tiers.great.toLocaleString()}₽
                • ${lootTier(tiers.average).msg} >= ${tiers.average.toLocaleString()}₽
                • ${lootTier(tiers.average -1).msg} < ${tiers.average.toLocaleString()}₽
            `);

        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
