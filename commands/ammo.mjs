import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
    MessageActionRow,
    MessageSelectMenu,
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
        let searchString = '';
        if(interaction.type === 'MESSAGE_COMPONENT'){
            searchString = interaction.values[0];
        } else {
            searchString = interaction.options.getString('ammo_type');
        }
        console.log('ammo ' + searchString);

        if(!searchString){
            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('select')
                        .setPlaceholder('Nothing selected')
                        .addOptions(ammoTypes.map(ammoType => {
                            return {
                                label: ammoType[0],
                                value: ammoType[1],
                            }
                        })),
                );
            await interaction.editReply({
                content: 'Select caliber',
                components: [row],
                // ephemeral: true,
            });

            return true;
        }

        const table = new asciiTable;
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
                ammoResponse[id].ballistics.armorDamage,
                Math.floor(ammoResponse[id].ballistics.fragmentationChance * 100),
                ammoResponse[id].ballistics.initialSpeed,
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
            table.setAlign(i, asciiTable.LEFT)
        }

        const embed = new MessageEmbed();
        embed.setURL(`https://tarkov-tools.com/ammo`);
        embed.setTitle(`${searchString} Ammo Table`);
        embed.setDescription('```' + table.toString() + '```');
        await interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;