import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import got from 'got';

import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('goons')
        .setDescription('Check or report the location of the Goons')
        .setNameLocalizations(getCommandLocalizations('goons'))
        .setDescriptionLocalizations(getCommandLocalizations('goons_desc'))
        .addStringOption(option => option
            .setName('map')
            .setDescription('Select a map')
            .setNameLocalizations(getCommandLocalizations('map'))
            .setDescriptionLocalizations(getCommandLocalizations('goons_map_select_desc'))
            .setRequired(false)
            .setChoices(...gameData.maps.choicesGoons())
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const mapId = interaction.options.getString('map');

        if (!mapId) {
            const locationEmbed = new EmbedBuilder();
            locationEmbed.setTitle('Coming soon(?)');
            locationEmbed.setDescription('Once we start getting a sufficient number of reports, we will be able to provide location');
            return interaction.editReply({
                embeds: [locationEmbed],
            });
        }

        const mapData = await gameData.maps.getAll(locale);
        const selectedMap = mapData.find(m => m.id === mapId);

        const confirm = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel(t('Confirm'))
			.setStyle(ButtonStyle.Danger);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel(t('Cancel'))
			.setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
			.addComponents(cancel, confirm);

        const buttonResponse = await interaction.editReply({
            content: t(`Are you sure you want to report the Goons on {{mapName}}? You will also submit your discord id# and ip address so we can act against false reports.`, {mapName: selectedMap.name}),
            components: [row],
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await buttonResponse.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
            if (confirmation.customId !== 'confirm') {
                return confirmation.update({ content: t('Confirmation not received within 1 minute, cancelling'), components: [] });
            }

            try {
                const response = await got.post('https://manager.tarkov.dev/api/goons', {
                    json: {
                        map: selectedMap.nameId,
                        timestamp: new Date().getTime(),
                        accountId: parseInt(interaction.user.id.slice(-10)),
                    },
                }).json();
                
                if (response.status !== 'success') {
                    throw new Error (response.status);
                }
    
                const embed = new EmbedBuilder();
        
                // Construct the embed
                embed.setTitle(t('Goons reported on {{mapName}}', {mapName: selectedMap.name}));
                embed.setURL(`https://tarkov.dev/map/${selectedMap.normalizedName}`);
                embed.setDescription(t('Thank you for your report!'));
                if (selectedMap.key) {
                    embed.setThumbnail(`https://tarkov.dev/maps/${selectedMap.key}.jpg`);
                }
        
                return confirmation.update({
                    embeds: [embed],
                });
            } catch (error) {
                return confirmation.update({
                    content: `❌ ${t('Error submitting Goons report: {{error}}', {error: error.message})}`
                });
            }
        } catch (e) {
            return interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
        }
    },
    examples: [
        '/$t(goons) Woods',
        '/$t(goons)'
    ]
};

export default defaultFunction;
