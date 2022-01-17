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
            data = await got('https://api.github.com/repos/kokarn/tarkov-tools-discord-bot/contributors', {
                responseType: 'json',
            });
        } catch (loadError){
            console.error(loadError);
        }

        embed.setTitle('Tarkov Tools Discord Bot');
        embed.setURL('https://github.com/kokarn/tarkov-tools-discord-bot');
        embed.setDescription('The official tarkov-tools.com discord bot. Devloped open-source with a bunch of contributors');
        embed.setAuthor({
            name: 'Built by tarkov-tools',
            iconURL: 'https://tarkov-tools.com/apple-touch-icon.png',
            url: 'https://tarkov-tools.com',
        });
        embed.addField('Bugs? Missing features? Report on discord!', 'https://discord.gg/F7JeqsfSkq', true);
        embed.addField('Like it? Support on Patreon', 'https://www.patreon.com/kokarn', true);
        embed.setFooter({
            text: 'Enjoy ❤️',
        });

        let contributorsString = '';

        for(const contributor of data?.body){
            contributorsString = `${contributorsString}, ${contributor.login}`;
        }

        contributorsString = contributorsString.substring(1).trim();

        if(contributorsString){
            embed.addField('Contributors', contributorsString);
        }

        await interaction.editReply({ embeds: [embed] });
	},
};

export default defaultFunction;