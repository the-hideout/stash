import zlib from 'zlib';

const BASE_URL = 'https://api.cloudflare.com/client/v4/';

const doRequest = async (method = 'GET', operation, key, value, extraHeaders) => {
    if (!process.env.CLOUDFLARE_TOKEN || !process.env.CLOUDFLARE_NAMESPACE) {
        return Promise.reject(new Error(`Cloudflare token and/or namespace not set; skipping ${method} ${key}`));
    }
    const requestOptions = {
        method: method,
        headers: {
            'authorization': `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
        },
        throwHttpErrors: false,
    };

    if(extraHeaders){
        requestOptions.headers = {
            ...requestOptions.headers,
            ...extraHeaders,
        };
    }

    const account = process.env.CLOUDFLARE_ACCOUNT;
    const namespace = process.env.CLOUDFLARE_NAMESPACE;

    let keyPath = '';
    if (key) keyPath = `/${key}`;

    const fullCloudflarePath = `accounts/${account}/storage/kv/namespaces/${namespace}/${operation}${keyPath}`;

    if(value){
        requestOptions.body = value;
    }

    const response = await fetch(`${BASE_URL}${fullCloudflarePath}`, requestOptions);
    if (!response.ok) {
        const json = await response.json();
        return Promise.reject(new Error(json.errors.map(error => `${error.message} (${error.code})`).join('; ')));
    }
    return response.text();
};

export async function putValue(key, value) {
    if (typeof value === 'object'){
        value = JSON.stringify(value);
    }
    value = zlib.gzipSync(value).toString('base64');
    return doRequest('PUT', 'values', key, value);
}

export async function getValue(key) {
    return doRequest('GET', 'values', key).then(response => {
        return zlib.gunzipSync(Buffer.from(response, 'base64')).toString();
    });
}

export default {
    putValue,
    getValue,
}
