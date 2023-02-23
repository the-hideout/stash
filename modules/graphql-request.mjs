import got from 'got';

const url = 'https://api.tarkov.dev/graphql';

const graphqlRequest = async (options) => {
    if (!options.hasOwnProperty('graphql')) {
        return Promise.reject(new Error('You must provide a graphql query'));
    }

    return got.post(url, {
        responseType: 'json',
        body: JSON.stringify({
            query: options.graphql,
        }),
        headers: { 
            'user-agent': 'stash-tarkov-dev', 
            'Content-Type': 'application/json', 
            'Referer': 'http://stash.tarkov.dev'
        },
        resolveBodyOnly: true,
    });
};

export default graphqlRequest;
