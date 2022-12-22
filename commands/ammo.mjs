import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import asciiTable from 'ascii-table';

import { getAmmo } from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import { dateTimestampInSeconds } from '@sentry/utils';

const ammoLabels = {
    Caliber12g: '12/70',
    Caliber20g: '20/70',
    Caliber23x75: '23x75mm',
    Caliber30x29: '30x29mm',
    Caliber366TKM: '.366 TKM',
    Caliber40x46: '40x46mm',
    Caliber46x30: '4.6x30mm',
    Caliber57x28: '5.7x28mm',
    Caliber556x45NATO: '5.56x45mm',
    Caliber762x25TT: '7.62x25mm',
    Caliber762x35: '.300 Blackout',
    Caliber545x39: '5.45x39mm',
    Caliber762x51: '7.62x51mm',
    Caliber762x39: '7.62x39mm',
    Caliber762x54R: '7.62x54mm',
    Caliber86x70: '.338 Lapua',
    Caliber9x18PM: '9x18mm',
    Caliber9x19PARA: '9x19mm',
    Caliber9x21: '9x21mm',
    Caliber9x33R: '.357 Magnum',
    Caliber9x39: '9x39mm',
    Caliber127x55: '12.7x55mm',
    Caliber1143x23ACP: '.45 ACP',
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('ammo')
        .setDescription('Get ammunition information')
        .setNameLocalizations(getCommandLocalizations('ammo'))
        .setDescriptionLocalizations(getCommandLocalizations('ammo_desc'))
        .addStringOption(option => option
            .setName('name')
            .setDescription('Enter the ammo type')
            .setNameLocalizations(getCommandLocalizations('name'))
            .setDescriptionLocalizations(getCommandLocalizations('ammo_name_desc'))
            .setAutocomplete(true)
            .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const t = getFixedT(interaction.locale);
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            return interaction.editReply({
                content: t('You need to specify an ammo type'),
            });
        }

        const clientStatus = interaction.member?.presence?.clientStatus;
        let mobile = clientStatus?.mobile === 'online' && clientStatus?.desktop !== 'online' && clientStatus?.web !== 'online';

        const embed = new EmbedBuilder();
        embed.setURL(`https://tarkov.dev/ammo`);

        const table = new asciiTable();
        const tableData = [];
        const tableHeaders = [
            t('Name'),
            t('Pen'),
            t('Dmg'),
            t('A Dmg'),
            t('Frag'),
            t('Velo'),
        ];

        table.removeBorder();
        table.addRow(tableHeaders);

        let ammos = await getAmmo(interaction.locale);
        let caliber = false;
        let penIcon = -1;
        for (const ammo of ammos) {
            if (ammo.name.toLowerCase().replace(/\./g, '').includes(searchString.toLowerCase().replace(/\./g, ''))) {
                caliber = ammo.properties.caliber;
                break;
            }
        }
        if (!caliber) {
            return interaction.editReply({
                content: t('Found no results for "{{searchString}}"', {
                    searchString: searchString
                }),
            });
        }

        ammos = ammos.filter(ammo => ammo.properties.caliber === caliber).map(ammo => {
            let damage = ammo.properties.damage;
            let projectileCount = ammo.properties.projectileCount;

            if (projectileCount > 1) {
                damage = damage * projectileCount;
            };
            return {
                ...ammo,
                properties: {
                    ...ammo.properties,
                    totalDamage: damage
                }
            };
        }).sort((x, y) => {
            // sort penetrationPower, then damage by descending order
            // could add subcommand for multiple sorting methods
            return y.properties.penetrationPower - x.properties.penetrationPower || y.properties.totalDamage - x.properties.totalDamage;
        });

        let caliberLabel = ammoLabels[caliber];
        if (!caliberLabel) caliberLabel = caliber.replace('Caliber', '');
        embed.setTitle(`${caliberLabel} ${t('Ammo Table')}`);

        if (ammos.length > 0) {
            embed.setThumbnail(ammos[0].iconLink);
        }

        for (const ammo of ammos) {
            tableData.push([
                ammo.shortName.substring(0, 11),
                ammo.properties.penetrationPower,
                ammo.properties.totalDamage,
                ammo.properties.armorDamage,
                `${Math.floor(ammo.properties.fragmentationChance * 100)} %`,
                `${ammo.properties.initialSpeed || 0} m/s`,
            ]);
        }

        for (const i in tableData) {
            table.addRow([
                ...tableData[i],
            ]);
            table.setAlign(i, asciiTable.LEFT);
            if (!mobile) {
                continue;
            } 
            embed.addFields({
                name: tableData[i][0],
                value: tableData[i].reduce((data, value, index) =>{
                    if (index !== 0) {
                        data.push(`${tableHeaders[index]}: ${value}`);
                    };
                    return data;
                }, []).join('\n'),
                inline: true,
            });
        }

        if (!mobile) {
            embed.setDescription('```' + table.toString() + '```');
        }
        return interaction.editReply({ embeds: [embed] });
    },
    examples: [
        '/$t(ammo) 7.62x51mm'
    ]
};

export default defaultFunction;
