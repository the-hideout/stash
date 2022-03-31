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
        const embed = new MessageEmbed();
        let data;

        try {
            data = await got('https://api.github.com/repos/the-hideout/stash/contributors', {
                responseType: 'json',
            });
        } catch (loadError) {
            console.error(loadError);
        }

        embed.setTitle('Stash - EFT Discord Bot');
        embed.setURL('https://github.com/the-hideout/stash');
        embed.setDescription('The official tarkov.dev Discord bot! An opensource project by the-hideout to help you play Escape from Tarkov.');
        embed.setAuthor({
            name: 'Stash - An Escape from Tarkov Discord bot!',
            iconURL: 'https://assets.tarkov.dev/tarkov-dev-icon.png',
            url: 'https://tarkov.dev.com',
        });
        embed.addField('Bugs? Missing features? Chat with us on discord!', 'https://discord.gg/XPAsKGHSzH', true);
        embed.addField('Want to contribute to the bot or checkout the source code? View the project on GitHub!', 'https://github.com/the-hideout/stash', true);
        // embed.addField('Like it? Support on Patreon', 'https://www.patreon.com/kokarn', true);
        embed.setFooter({
            text: 'Enjoy ❤️',
        });

        let contributorsString = '';

        for (const contributor of data?.body) {
            contributorsString = `${contributorsString}, ${contributor.login}`;
        }

        contributorsString = contributorsString.substring(1).trim();

        if (contributorsString) {
            embed.addField('Contributors', contributorsString);
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;