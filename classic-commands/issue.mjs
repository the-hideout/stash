import {
    MessageEmbed,
} from 'discord.js';

const issue = (message, client) => {
	const details = message.content.toLowerCase().replace('!issue ', '');
    const embed = new MessageEmbed();
	embed.setTitle("New Issue Reported 🐞");
	embed.setDescription(`**Issue Description:**\n${details}`);
	embed.setFooter(`This issue was reported by @${message.author.username} | Server: ${message.guild.name}`);

	message.channel.send({embeds: [embed]});
};

export default issue;