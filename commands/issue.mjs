import { SlashCommandBuilder } from "@discordjs/builders";
import {
    MessageEmbed,
} from "discord.js";

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName("issue")
        .setDescription("Send issues to the developers")
        .addStringOption(option => option
            .setRequired(true)
            .setDescription("Enter your message")
            .setName("message")
        ),
    async execute(interaction) {
        const { client, member } = interaction;
        const details = interaction.options.getString("message");

        const embed = new MessageEmbed();

        let reportTo = await client.users.fetch(process.env.ADMIN_ID, false);


        if (client.guilds.cache.has(process.env.ISSUE_SERVER_ID)) {
            const server = client.guilds.cache.get(process.env.ISSUE_SERVER_ID);
            const reportingChannel = server.channels.cache.get(process.env.ISSUE_CHANNEL_ID);

            if (reportingChannel) {
                reportTo = reportingChannel;
            }
        }

        embed.setTitle("New Issue Reported 🐞");
        embed.setDescription(`**Issue Description:**\n${details}`);


        let footerText = `This issue was reported by @${member.user.username}`;

        if (member.guild) {
            footerText = `${footerText} | Server: ${member.guild.name}`;
        } else {
            footerText = `${footerText} | Reported in a DM`;
        }

        embed.setFooter({
            text: footerText,
        });

        reportTo.send({
            embeds: [embed],
        });

        interaction.reply(`Thanks for reporting, we're on it!`);
    },
};

export default defaultFunction;