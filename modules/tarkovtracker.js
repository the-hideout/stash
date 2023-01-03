import got from 'got';

const url = 'https://tarkovtracker.io/api/v2/';

export async function apiRequest(token, endpoint) {
    if (!token) {
        return Promise.reject(new Error('You must provide an authorization token'));
    }

    if (!endpoint) {
        return Promise.reject(new Error('You must provide an endpoint'));
    }

    try {
        const response = await got(url+endpoint, {
            responseType: 'json',
            headers: { 
                'Authorization': 'Bearer '+token
             }
        });

        return response.body.data;
    } catch (requestError) {
        //console.error(requestError);

        return Promise.reject(requestError);
    }
};

export function getProgress(token) {
    return apiRequest(token, 'progress');
};

export default apiRequest;

