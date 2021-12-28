import {
    MessageEmbed,
} from 'discord.js';

const servers = (message, client) => {
    if (message.author.id !== process.env.ADMIN_ID){
        return false;
    }

    if(message.channel.type !== 'DM') {
        return false;
    }
    const embed = new MessageEmbed();
    embed.setTitle("Servers");

    client.guilds.cache.each(server => {
        embed.addField(server.name, server.id);
    });

    if (embed.length == 0) {
        message.react('❌');

        return true;
    }

    message.channel.send({embeds: [embed]})
        .then(console.log)
        .catch(console.error);
};

export default servers;