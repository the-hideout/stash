import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';
import got from 'got';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

let lastCheck = new Date(0);
let patchNotes = false;

const getPatchNotes = async () => {
    if (patchNotes && new Date() - lastCheck < 1000 * 60 * 10) return patchNotes;
    const url = 'https://www.escapefromtarkov.com/news?page=1&filter=2';
    const response = await got(url);
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
        const embed = new MessageEmbed();
        embed.setURL(notes.link);
        embed.setTitle(`${notes.title}`);
        embed.setFooter({text: notes.date});
        //embed.setThumbnail(url);
        embed.setDescription(notes.notes);
        await interaction.editReply({ embeds: [embed] });
    }
};

export default defaultFunction;
