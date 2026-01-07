const url = 'https://tarkovtracker.io/api/v2/';

export async function apiRequest(token, endpoint) {
    if (!token) {
        return Promise.reject(new Error('You must provide an authorization token'));
    }

    if (!endpoint) {
        return Promise.reject(new Error('You must provide an endpoint'));
    }

    try {
        const response = await fetch(url+endpoint, {
            headers: { 
                'Authorization': 'Bearer '+token
             }
        });
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }
        const body = await response.json();
        return body.data;
    } catch (requestError) {
        //console.error(requestError);

        return Promise.reject(requestError);
    }
};

export function getProgress(token) {
    return apiRequest(token, 'progress');
};

export default apiRequest;

