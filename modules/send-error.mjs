import {
    MessageEmbed,
} from 'discord.js';

const sendError = async(client, member, details) => {
    let reportTo = await client.users.fetch(process.env.ADMIN_ID, false);
    const embed = new MessageEmbed();

    if (client.guilds.cache.has(process.env.ISSUE_SERVER_ID)) {
        const server = client.guilds.cache.get(process.env.ISSUE_SERVER_ID);
        const reportingChannel = server.channels.cache.get(process.env.ISSUE_CHANNEL_ID);

        if (reportingChannel) {
            reportTo = reportingChannel;
        }
    }

    embed.setTitle('New Issue Reported 🐞');
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
}

export default sendError;

