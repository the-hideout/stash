import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';
import got from 'got';
import asciiTable from 'ascii-table';

const ammoTypes = [
    ['7.62x51mm', '7.62x51mm'],
    ['7.62x39mm', '7.62x39mm'],
    ['5.56x45mm', '5.56x45mm'],
    ['5.45x39mm', '5.45x39mm'],
    ['7.62x54mm', '7.62x54mm'],
    ['9x39mm', '9x39mm'],
    ['9x19mm', '9x19mm'],
    ['9x18mm', '9x18mm'],
    ['9x21mm', '9x21mm'],
    ['12/70', '12/70'],
    ['4.6x30mm', '4.6x30mm'],
    ['.338 Lapua', '.338 Lapua'],
    ['.300 Blackout', '.300 Blackout'],
    ['.45 ACP', '.45 ACP'],
    ['5.7x28mm', '5.7x28mm'],
    ['7.62x25mm', '7.62x25mm'],
    ['23x75mm', '23x75mm'],
    ['20/70', '20/70'],
    ['12.7x55mm', '12.7x55mm'],
];

const ammoResponse = await got('https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/ammunition.json', {
    responseType: 'json',
}).json();

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('ammo')
        .setDescription('get ammunition information')
        .addStringOption(option => option
            .setName('ammo_type')
            .setDescription('Enter the ammo type')
            .setChoices(ammoTypes)
        ),
    async execute(interaction) {
        const searchString = interaction.options.getString('ammo_type');
        console.log('ammo ' + searchString);

        if(!searchString){
            await interaction.reply({
                content: 'You need to specify an ammo type',
                ephemeral: true,
            });

            return true;
        }

        const table = new asciiTable;
        const tableData = [];

        table.removeBorder();
        table.addRow([
            'Name',
            'Pen',
            'Dmg'
        ]);

        for (const id in ammoResponse) {
            if (!ammoResponse[id].name.toLowerCase().includes(searchString.toLowerCase())) {
                continue;
            }

            let damage = ammoResponse[id].ballistics.damage;
            let projectileCount = ammoResponse[id].projectileCount;

            if (projectileCount > 1) {
                damage = damage * projectileCount;
            }

            tableData.push([
                ammoResponse[id].shortName,
                ammoResponse[id].ballistics.penetrationPower,
                damage,
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
                tableData[i][2]
            ]);
            table.setAlign(i, asciiTable.LEFT)
        }

        const embed = new MessageEmbed();
        embed.addField(searchString + ' Ammo Chart', '```' + table.toString() + '```', true);
        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;