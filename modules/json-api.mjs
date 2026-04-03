import { JSONPath } from "jsonpath-plus";

const url = 'https://json.tarkov.dev/';

const jsonApi = {
    request: async (path) => {
        const response = await fetch(`${url}${path}`, {
            headers: {
                'User-Agent': 'stash-tarkov-dev',
            },
        });
        if (!response.ok) {
            return Promise.reject(new Error(`${response.status} ${response.statusText}`));
        }
        return response.json();
    },
    requestTranslated: async (path, options = {}) => {
        options.languages ??= await jsonApi.request('lang').then(resp => resp.data);
        const locale = {};
        const results = await Promise.all([
            jsonApi.request(path),
            ...options.languages.map(lang => apiRequest(`${path}_${lang}`).then(langData => {
                locale[lang] = langData.data;
            })),
        ]);
        const translated = {};
        for (const lang of options.languages) {
            translated = jsonApi.translate(results[0], locale[lang], {fallbackLangData: locale.en});
        }
        return translated;
    },
    translate: (source, options = {}) => {
        options.lang ??= 'en';
        options.langFallback ??= 'en';
        const translatedData = structuredClone(source.data);
        for (const jPath of source.data.translations ?? []) {
            try {
                JSONPath({
                    path: jPath,
                    json: translatedData,
                    resultType: "all",
                    callback: (result) => {
                        const { path, value, parent, parentProperty } = result;
                        parent[parentProperty] = source.locale[options.lang][value] ?? source.locale[options.langFallback][value] ?? value;
                    },
                });
            } catch (error) {
                console.error(error);
            }
        }
        return translatedData.data;
    },
};

export default jsonApi;