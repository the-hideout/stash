import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getFixedT, getCommandLocalizations, comT } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';
import gameData from '../modules/game-data.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('gamemode')
        .setDescription('Set the game mode (regular, PVE) for bot responses')
        .setNameLocalizations(getCommandLocalizations('gamemode'))
        .setDescriptionLocalizations(getCommandLocalizations('gamemode_desc'))
        .addStringOption(option => option
            .setName('gamemode')
            .setDescription('Game mode to use')
            .setNameLocalizations(getCommandLocalizations('gamemode'))
            .setDescriptionLocalizations(getCommandLocalizations('gamemode_option_desc'))
            .setRequired(true)
            .setChoices(...gameData.gameModes.choices())
        ),
    async execute(interaction) {
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const gameMode = interaction.options.getString('gamemode');
        progress.setGameMode(interaction.user.id, gameMode);
        const gameModeT = comT(`game_mode_${gameMode}`, {lng: locale});
        return interaction.reply({
            content: `✅ ${t('Game mode set to {{gameMode}}.', {gameMode: gameModeT})}`,
            ephemeral: true
        });
    },
};

export default defaultFunction;
