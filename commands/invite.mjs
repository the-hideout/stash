import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from 'discord.js';
// import generalError from '../modules/general-error.mjs';

const BOT_INVITE_LINK = "https://discord.com/api/oauth2/authorize?client_id=955521336904667227&permissions=309237664832&scope=bot%20applications.commands";

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Get an invite link to invite the bot to another Discord server"),

    async execute(interaction) {
        const embed = new MessageEmbed();
        embed.setTitle("Stash Invite Link 🔗");
        embed.setAuthor({
            name: 'Stash',
            iconURL: 'https://assets.tarkov.dev/tarkov-dev-icon.png',
        });
        embed.setDescription("Click the link above to invite the Stash bot to your Discord server!");
        embed.setURL(BOT_INVITE_LINK);
        embed.setFooter({ text: 'Enjoy ❤️' });
        await interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;
