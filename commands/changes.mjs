import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';
import got from 'got';

const URL = 'https://tarkov-changes.com';

const getChanges = async () => {
    const data = await got(`${URL}/changelogs/data.txt`);
    return data.body;
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('changes')
        .setDescription('Get the latest changes for EFT'),
    async execute(interaction) {
        await interaction.deferReply();
        
        const data = await getChanges();
        const embed = new MessageEmbed();
        embed.setURL(URL);
        embed.setTitle('Latest EFT Changes');
        embed.setDescription(data);
        embed.setFooter({text: `Get the full data from ${URL}`});
        await interaction.editReply({ embeds: [embed] });
    }
};

export default defaultFunction;
