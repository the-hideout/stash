import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import asciiTable from 'ascii-table';

import { getAmmo } from '../modules/game-data.mjs';
import { getFixedT } from '../modules/translations.mjs';

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

const comT = getFixedT(null, 'command');

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('ammo')
        .setDescription('Get ammunition information')
        .setNameLocalizations({
            'es-ES': comT('ammo', {lng: 'es-ES'}),
            ru: comT('ammo', {lng: 'ru'}),
        })
        .setDescriptionLocalizations({
            'es-ES': comT('ammo_desc', {lng: 'es-ES'}),
            ru: comT('ammo_desc', {lng: 'ru'}),
        })
        .addStringOption(option => option
            .setName('name')
            .setDescription('Enter the ammo type')
            .setNameLocalizations({
                'es-ES': comT('name', {lng: 'es-ES'}),
                ru: comT('name', {lng: 'ru'}),
            })
            .setDescriptionLocalizations({
                'es-ES': comT('ammo_name_desc', {lng: 'es-ES'}),
                ru: comT('ammo_name_desc', {lng: 'ru'}),
            })
            .setAutocomplete(true)
            .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const t = getFixedT(interaction.locale);
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            await interaction.editReply({
                content: t('You need to specify an ammo type'),
                ephemeral: true,
            });

            return true;
        }

        const embed = new EmbedBuilder();
        embed.setURL(`https://tarkov.dev/ammo`);

        const table = new asciiTable();
        const tableData = [];

        table.removeBorder();
        table.addRow([
            t('Name'),
            t('Pen'),
            t('Dmg'),
            t('A Dmg'),
            t('Frag'),
            t('Velo'),
        ]);

        const ammos = await getAmmo(interaction.locale);
        console.log(ammos);
        let caliber = false;
        let penIcon = -1;
        for (const ammo of ammos) {
            if (ammo.name.toLowerCase().replace(/\./g, '').includes(searchString.toLowerCase().replace(/\./g, ''))) {
                caliber = ammo.properties.caliber;
                break;
            }
        }
        if (!caliber) {
            await interaction.editReply({
                content: t('No matching ammo found'),
                ephemeral: true,
            });

            return true;
        }

        let caliberLabel = ammoLabels[caliber];
        if (!caliberLabel) caliberLabel = caliber.replace('Caliber', '');
        embed.setTitle(`${caliberLabel} ${t('Ammo Table')}`);

        for (const ammo of ammos) {
            if (ammo.properties.caliber !== caliber) {
                continue;
            }
            if (!embed.thumbnail || penIcon < ammo.properties.penetrationPower) {
                embed.setThumbnail(ammo.iconLink);
                if (embed.thumbnail) penIcon = ammo.properties.penetrationPower;
            }
            let damage = ammo.properties.damage;
            let projectileCount = ammo.properties.projectileCount;

            if (projectileCount > 1) {
                damage = damage * projectileCount;
            }

            tableData.push([
                ammo.shortName,
                ammo.properties.penetrationPower,
                damage,
                ammo.properties.armorDamage,
                Math.floor(ammo.properties.fragmentationChance * 100),
                ammo.properties.initialSpeed,
            ]);
        }

        // sort penetrationPower, then damage by descending order
        // could add subcommand for multiple sorting methods
        tableData.sort(
            function (x, y) {
                return y[1] - x[1] || y[2] - x[2];
            }
        );

        for (const i in tableData) {
            table.addRow([
                tableData[i][0],
                tableData[i][1],
                tableData[i][2],
                tableData[i][3],
                `${tableData[i][4]} %`,
                `${tableData[i][5]} m/s`,
            ]);
            table.setAlign(i, asciiTable.LEFT);
        }

        embed.setDescription('```' + table.toString() + '```');
        await interaction.editReply({ embeds: [embed] });
    },
    examples: [
        '/ammo 7.62x51mm'
    ]
};

export default defaultFunction;
