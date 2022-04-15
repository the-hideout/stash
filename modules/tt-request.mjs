import got from 'got';

const ttRequest = async (options) => {
    if (!options.hasOwnProperty('graphql')) {
        throw new Error("You must provide graphql");
    }

    if (options.hasOwnProperty('channel') && options.channel.sendTyping) {
        options.channel.sendTyping();
    }

    try {
        const requestBody = JSON.stringify({
            query: options.graphql,
        });

        const response = await got.post('https://api.tarkov.dev/graphql', {
            responseType: 'json',
            body: requestBody,
            headers: { "user-agent": "stash-tarkov-dev" }
        });

        return response.body;
    } catch (requestError) {
        console.error(requestError);

        throw requestError;
    }
};

export default ttRequest;
