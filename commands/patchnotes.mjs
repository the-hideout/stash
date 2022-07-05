import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';
import got from 'got';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const MAX_EMBED_LENGTH = 4096;
const URL = 'https://www.escapefromtarkov.com/news?page=1&filter=2';
let lastCheck = new Date(0);
let patchNotes = false;

const getPatchNotes = async () => {
    if (patchNotes && new Date() - lastCheck < 1000 * 60 * 10) return patchNotes;
    const response = await got(URL);
    let $ = cheerio.load(response.body);
    const first = $('ul#news-list li div.info a').first();
    const link = $(first[0]).attr('href');
    const fullLink = `https://www.escapefromtarkov.com${link}`;
    const notesPage = await got(fullLink);
    $ = cheerio.load(notesPage.body);
    const title = $('.main_content .header h1').text();
    const date = $('.main_content .header span').text();
    const content = $('.main_content .container .article');
    const turndownService = new TurndownService();
    const notes = turndownService.turndown(content.html());
    lastCheck = new Date();
    patchNotes = {
        title: title,
        notes: notes,
        date: date,
        link: fullLink
    };
    return patchNotes;
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('patchnotes')
        .setDescription('get latest patch notes'),
    async execute(interaction) {
        await interaction.deferReply();
        
        const notes = await getPatchNotes();

        var message;
        if (notes.notes.length >= MAX_EMBED_LENGTH) {
            message = `Sorry, the current patch notes list is too long to be displayed in Discord\n\nPlease visit ${URL} for more information`;
        } else {
            message = notes.notes
        }

        const embed = new MessageEmbed();
        embed.setURL(notes.link);
        embed.setTitle(`${notes.title}`);
        embed.setFooter({text: notes.date});
        embed.setDescription(message);
        await interaction.editReply({ embeds: [embed] });
    }
};

export default defaultFunction;
