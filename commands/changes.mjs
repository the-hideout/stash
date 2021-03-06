import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';
import got from 'got';

const URL = 'https://tarkov-changes.com';
const MAX_EMBED_LENGTH = 4096;
let changes = false;
let lastCheck = new Date(0);

const getChanges = async () => {
    if (changes && new Date() - lastCheck < 1000 * 60 * 10) return changes;
    const data = await got(`${URL}/changelogs/data.txt`);
    lastCheck = new Date();
    changes = data.body;
    return changes;
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('changes')
        .setDescription('Get the latest changes for EFT'),
    async execute(interaction) {
        await interaction.deferReply();
        
        const data = await getChanges();

        var message = `**Changes provided by https://tarkov-changes.com**\n\n${data}`;

        if (message.length >= MAX_EMBED_LENGTH) {
            message = `Sorry, the current change list is too long to be displayed in Discord\n\nPlease visit ${URL} for more information`;
        }

        const embed = new MessageEmbed();
        embed.setURL(URL);
        embed.setTitle('Latest EFT Changes 🗒️');
        embed.setDescription(message);
        embed.setFooter({text: `Get the full data from ${URL}`});
        await interaction.editReply({ embeds: [embed] });
    }
};

export default defaultFunction;
