// About command to show info about the bot

import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';
import got from 'got';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Tells you a bit about the bot'),
    async execute(interaction) {
        await interaction.deferReply();
        const embed = new MessageEmbed();
        let data;

        try {
            data = await got('https://api.github.com/repos/the-hideout/stash/contributors', {
                responseType: 'json',
                headers: { "user-agent": "stash-tarkov-dev" }
            });
        } catch (loadError) {
            console.error(loadError);
        }

        embed.setTitle('Stash - EFT Discord Bot!');
        embed.setURL('https://github.com/the-hideout/stash');
        embed.setDescription('The official Tarkov.dev Discord bot! An open source project by The Hideout to help you play Escape from Tarkov.');
        embed.setAuthor({
            name: 'Stash - An Escape from Tarkov Discord bot!',
            iconURL: 'https://assets.tarkov.dev/tarkov-dev-icon.png',
            url: 'https://tarkov.dev.com',
        });
        embed.addFields(
            { name: 'Bugs? Missing features? Questions? Chat with us on Discord!', value: 'https://discord.gg/XPAsKGHSzH', inline: true} ,
            { name: 'Want to contribute to the bot or checkout the source code? View the project on GitHub!', value: 'https://github.com/the-hideout/stash', inline: true} ,
            { name: 'Want to check the status of our services (api, website, bot, etc)?', value: 'https://status.tarkov.dev', inline: true} ,
            //{ name: 'Like it? Support on Patreon', value: 'https://www.patreon.com/kokarn', inline: true} ,
        );
        embed.setFooter({
            text: 'Enjoy ❤️',
        });

        let contributorsString = '';

        for (const contributor of data.body) {
            contributorsString = `${contributorsString}, ${contributor.login}`;
        }

        contributorsString = contributorsString.substring(1).trim();

        if (contributorsString) {
            embed.addFields({name: 'Contributors', value: contributorsString});
        }

        interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;
