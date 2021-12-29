const leaveServer = (message, client) => {
    const serverid = message.content.toLowerCase().replace('!leaveserver ', '');
    let response = {};

    if (!client.guilds.cache.has(serverid)) {
        message.react('❌');
        console.log("Could not find server with id " + serverid);

        return false;
    }
    const server = client.guilds.cache.get(serverid);
    server.leave();
    response.content = "Left server " + server.name + " (" + server.id + ")";

    message.channel.send(response)
        .catch(console.error);
        // .then(console.log)
};

export default leaveServer;