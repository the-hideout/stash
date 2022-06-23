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

        embed.setTitle('Stash - EFT Discord Bot');
        embed.setURL('https://github.com/the-hideout/stash');
        embed.setDescription('The official Tarkov.dev Discord bot! An open source project by the-hideout to help you play Escape from Tarkov.');
        embed.setAuthor({
            name: 'Stash - An Escape from Tarkov Discord bot!',
            iconURL: 'https://assets.tarkov.dev/tarkov-dev-icon.png',
            url: 'https://tarkov.dev.com',
        });
        embed.addField('Bugs? Missing features? Questions? Chat with us on Discord!', 'https://discord.gg/XPAsKGHSzH', true);
        embed.addField('Want to contribute to the bot or checkout the source code? View the project on GitHub!', 'https://github.com/the-hideout/stash', true);
        embed.addField('Want to check the status of our services (api, website, bot, etc)?', 'https://status.tarkov.dev', true);
        // embed.addField('Like it? Support on Patreon', 'https://www.patreon.com/kokarn', true);
        embed.setFooter({
            text: 'Enjoy ❤️',
        });

        let contributorsString = '';

        for (const contributor of data.body) {
            contributorsString = `${contributorsString}, ${contributor.login}`;
        }

        contributorsString = contributorsString.substring(1).trim();

        if (contributorsString) {
            embed.addField('Contributors', contributorsString);
        }

        interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;
