import { SlashCommandBuilder } from "@discordjs/builders";
import {
    MessageEmbed,
} from 'discord.js';
import got from "got";
import asciiTable from "ascii-table";

const ammo_types = [
    ["7.62x51mm", "7.62x51mm"],
    ["7.62x39mm", "7.62x39mm"],
    ["5.56x45mm", "5.56x45mm"],
    ["5.45x39mm", "5.45x39mm"],
    ["7.62x54mm", "7.62x54mm"],
    ["9x39mm", "9x39mm"],
    ["9x19mm", "9x19mm"],
    ["9x18mm", "9x18mm"],
    ["9x21mm", "9x21mm"],
    ["12/70", "12/70"],
    ["4.6x30mm", "4.6x30mm"],
    [".338 Lapua", ".338 Lapua"],
    [".300 Blackout", ".300 Blackout"],
    [".45 ACP", ".45 ACP"],
    ["5.7x28mm", "5.7x28mm"],
    ["7.62x25mm", "7.62x25mm"],
    ["23x75mm", "23x75mm"],
    ["20/70", "20/70"],
    ["12.7x55mm", "12.7x55mm"],
];

const ammo_response = await got('https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/ammunition.json', {
    responseType: 'json',
}).json();


const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('ammo')
        .setDescription('get ammunition information')
        .addStringOption(option => option
            .setName('ammo_type')
            .setDescription('Enter the ammo type')
            .setChoices(ammo_types)
        ),
    async execute(interaction) {
        const searchString = interaction.options.getString('ammo_type');
        console.log("ammo " + searchString);

        const table = new asciiTable;
        const table_data = [];
        table.setHeading("Name", "Pen", "Damage");
        table.removeBorder();
        table.setHeadingAlign(asciiTable.LEFT);

        for (const id in ammo_response) {
            let short_name = ammo_response[id]["shortName"];
            let penetration_power = ammo_response[id]["ballistics"]["penetrationPower"];
            let damage = ammo_response[id]["ballistics"]["damage"];
            let projectile_count = ammo_response[id]["projectileCount"];

            if (projectile_count > 1) {
                damage = damage * projectile_count;
            }
            if (ammo_response[id]["name"].toLowerCase().includes(searchString.toLowerCase())) {
                table_data.push([
                    short_name,
                    penetration_power,
                    damage,
                ]);
            }
        }

        // sort penetration_power by descending order
        // could add subcommand for multiple sorting methods
        table_data.sort(
            function (x, y) {
                return y[1] - x[1];
            }
        );

        for (const i in table_data) {
            table.addRow([
                table_data[i][0],
                table_data[i][1],
                table_data[i][2]
            ]);
        }


        const embed = new MessageEmbed();
        embed.addField(searchString + " Ammo Chart", "```" + table.toString() + "```", true);
        await interaction.reply({ embeds: [embed] });

    },
    

};

export default defaultFunction;