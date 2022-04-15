import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed
} from 'discord.js';
import asciiTable from 'ascii-table';
import getAmmo from "../modules/get-ammo.mjs";

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
        .setDescription('get ammunition information')
        .addStringOption(option => option
            .setName('name')
            .setDescription('Enter the ammo type')
            .setAutocomplete(true)
            .setRequired(true)
        ),
    async execute(interaction) {
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            await interaction.editReply({
                content: 'You need to specify an ammo type',
                ephemeral: true,
            });

            return true;
        }

        const embed = new MessageEmbed();
        embed.setURL(`https://tarkov.dev/ammo`);

        const table = new asciiTable();
        const tableData = [];

        table.removeBorder();
        table.addRow([
            'Name',
            'Pen',
            'Dmg',
            'A Dmg',
            'Frag',
            'Velo',
        ]);

        const ammoResponse = await getAmmo();
        let caliber = false;
        let penIcon = -1;
        for (const id in ammoResponse) {
            const ammo = ammoResponse[id];
            if (ammo.item.name.toLowerCase().includes(searchString.toLowerCase())) {
                caliber = ammo.caliber;
                break;
            }
        }
        if (!caliber) {
            await interaction.editReply({
                content: 'No matching ammo found',
                ephemeral: true,
            });

            return true;
        }

        let caliberLabel = ammoLabels[caliber];
        if (!caliberLabel) caliberLabel = caliber.replace('Caliber', '');
        embed.setTitle(`${caliberLabel} Ammo Table`);

        for (const id in ammoResponse) {
            const ammo = ammoResponse[id];
            if (ammo.caliber !== caliber) {
                continue;
            }
            if (!embed.thumbnail || penIcon < ammo.penetrationPower) {
                embed.setThumbnail(ammo.item.iconLink);
                if (embed.thumbnail) penIcon = ammo.penetrationPower;
            }
            let damage = ammo.damage;
            let projectileCount = ammo.projectileCount;

            if (projectileCount > 1) {
                damage = damage * projectileCount;
            }

            tableData.push([
                ammo.item.shortName,
                ammo.penetrationPower,
                damage,
                ammo.armorDamage,
                Math.floor(ammo.fragmentationChance * 100),
                ammo.initialSpeed,
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
};

export default defaultFunction;
