import {
    MessageEmbed,
} from 'discord.js';

const issue = async (message, client) => {
	const details = message.content.toLowerCase().replace('!issue ', '');
    const sendTo = message.fallbackChannel || message.channel;

    const embed = new MessageEmbed();

    let reportTo = await client.users.fetch(process.env.ADMIN_ID, false);

    if (client.guilds.cache.has(process.env.ISSUE_SERVER_ID)) {
        const server = client.guilds.cache.get(process.env.ISSUE_SERVER_ID);
        const reportingChannel = server.channels.cache.get(process.env.ISSUE_CHANNEL_ID);

        if(reportingChannel){
            reportTo = reportingChannel;
        }
    }

	embed.setTitle("New Issue Reported 🐞");
	embed.setDescription(`**Issue Description:**\n${details}`);
    let footerText = `This issue was reported by @${message.author.username}`;

    if(message.guild){
        footerText = `${footerText} | Server: ${message.guild.name}`;
    } else {
        footerText = `${footerText} | Reported in a DM`;
    }

	embed.setFooter({
        text: footerText,
    });

	reportTo.send({
        embeds: [embed],
    });

    sendTo.send({
        content: `Thanks for reporting, we're on it!`,
    });
};

export default issue;