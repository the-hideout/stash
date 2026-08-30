import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    WebhookClient,
} from 'discord.js';
import { DateTime } from 'luxon';

import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

let webhookClient;

const webhookUrl = process.env.BP_WEBHOOK_URL ?? process.env.WEBHOOK_URL;

if (webhookUrl) {
    const options = {
        url: webhookUrl,
    };
    webhookClient = new WebhookClient(options);
    webhookClient.name = 'Stash';
}

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('battlepassdocument')
        .setDescription('Report the location of a BattlePass document')
        .setNameLocalizations(getCommandLocalizations('battlepassdocument'))
        .setDescriptionLocalizations(getCommandLocalizations('battlepassdocument_desc'))
        .addAttachmentOption(option => option
            .setName('screenshot')
            .setDescription('Screenshot')
            .setDescriptionLocalizations(getCommandLocalizations('screenshot'))
            .setDescriptionLocalizations(getCommandLocalizations('battlepassdocument_screenshot_desc'))
            .setRequired(false)
        ),

    async execute(interaction) {
        const [
            { lang, gameMode },
        ] = await Promise.all([
            progress.getInteractionSettings(interaction),
            interaction.deferReply({flags: MessageFlags.Ephemeral}),
        ]);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');

        const attachment = interaction.options.getAttachment('screenshot');

        if (!attachment) {
            const helpEmbed = new EmbedBuilder();
            helpEmbed.setTitle(t('BattlePass Document Reporting'));
            helpEmbed.setDescription(t('bp_doc_reporting_help_description'));
            return interaction.editReply({
                embeds: [helpEmbed],
            });
        }

        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
            return interaction.editReply({
                content: t('Please upload a valid EFT screenshot.'),
            });
        }

        const nameMatch = /^\d{4}-\d{2}-\d{2}\d{2}-\d{2}_(?<x>-?\d+\.\d+)_(?<y>-?\d+\.\d+)_(?<z>-?\d+\.\d+)_/.exec(attachment.name);
        if (!nameMatch) {
            return interaction.editReply({
                content: t('Please upload a valid EFT screenshot.'),
            });
        }
        
        const [maps, documents] = await Promise.all([
            gameData.maps.getAll({lang, gameMode}),
            gameData.items.getBattlePassDocuments({lang, gameMode}),
        ]);
        maps.sort((a, b) => b.name - a.name);

        const mapMenu = new StringSelectMenuBuilder()
            .setCustomId('select_map')
            .setPlaceholder(t('Select map'))
            .addOptions(maps.map(m => {
                return {
                    label: m.name,
                    value: m.id,
                };
            }).sort((a, b) => a.label.localeCompare(b.label)));

        const documentMenu = new StringSelectMenuBuilder()
            .setCustomId('select_item')
            .setPlaceholder(t('Select document item'))
            .addOptions(documents.map(d => {
                return {
                    label: d.name,
                    value: d.id,
                };
            }).sort((a, b) => a.label.localeCompare(b.label)));

        const row1 = new ActionRowBuilder().addComponents(mapMenu);
        const row2 = new ActionRowBuilder().addComponents(documentMenu);

        const response = await interaction.editReply({
            content: t('Screenshot_received_prompt'),
            components: [row1, row2],
            fetchReply: true,
        });

        const selections = { map: null, document: null };

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60_000, // 60s to make both selections
            filter: i => i.user.id === interaction.user.id, // only the original user can pick
        });
        
        collector.on('collect', async i => {
            if (i.customId === 'select_map') {
                selections.map = i.values[0];
            } else if (i.customId === 'select_item') {
                selections.document = i.values[0];
            }
        
            // Acknowledge this particular select interaction
            await i.deferUpdate();
        
            // Once both are chosen, wrap up
            if (selections.map && selections.document) {
                collector.stop('done');
            }
        });
        
        collector.on('end', async (_collected, reason) => {
            if (reason !== 'done') {
                return interaction.editReply({
                content: t('Timed out waiting for a selection.'),
                components: [],
                });
            }

            const map = maps.find(m => m.id === selections.map);
            const document = documents.find(d => d.id === selections.document);
        
            // send message to admin channel re report
            const reportEmbed = new EmbedBuilder();
            reportEmbed.setTitle('BattlePass Document Report');
            reportEmbed.addFields([
                {
                    name: 'map', value: map.nameId,
                },
                {
                    name: 'item', value: document.id,
                },
                {
                    name: 'location', value: JSON.stringify({x: nameMatch.groups.x, y: nameMatch.groups.y, z: nameMatch.groups.z}),
                },
                {
                    name: 'reporter', value: interaction.user.id,
                },
            ]);
            webhookClient.send({
                content: `${map.name}\n${document.name}`,
                embeds: [reportEmbed],
                files: [attachment.url],
                avatarURL: process.env.WEBHOOK_AVATAR,
            }).then(async message => {
                const channel = await interaction.client.channels.fetch(message.channel_id);
                const fullMessage = await channel.messages.fetch(message.id);
                fullMessage.react('👍')
                fullMessage.react('👎')
                progress.addBattlePassReportMessage(message.id).catch(error => {
                    console.error('Error watching battlepass report submission', error);
                });
            });

            const embed = new EmbedBuilder();
            embed.setTitle(t('BattlePass Document Reported'));
            embed.setDescription(
                `**${map.name}**\n` + 
                `**${document.name}**\n` +
                attachment.url
            );
            embed.setThumbnail(document.iconLink);
            embed.setImage(attachment.url);
        
            await interaction.editReply({
                content: '',
                embeds: [embed],
                components: [], // remove the menus after completion
                // files: [outFile], // uncomment if you attach a processed result
            });
        });
    },
    examples: [
        '/$t(battlepassdocument) screenshot',
        '/$t(battlepassdocument)'
    ]
};

export default defaultFunction;
