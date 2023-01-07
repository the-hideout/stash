import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import i18next from 'i18next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const translationResources = {};
const translationsPath = path.join(__dirname, '..', 'translations');
const translationFiles = fs.readdirSync(translationsPath).filter(file => file.endsWith('.json'));
for (const file of translationFiles) {
    const langCode = file.split('.')[0];
    translationResources[langCode] = JSON.parse(fs.readFileSync(path.join(translationsPath, file)));
}

// supported locales: https://discord.com/developers/docs/reference#locales
export function getDiscordLocale(langCode) {
    const subs = {
        cs: 'cs',
        de: 'de',
        en: 'en-US',
        'en-US': 'en-US',
        es: 'es-ES',
        'es-ES': 'es-ES',
        fr: 'fr',
        hu: 'hu',
        it: 'it',
        ja: 'ja',
        ko: 'ko',
        pl: 'pl',
        pt: 'pt-BR',
        'pt-BR': 'pt-BR',
        ru: 'ru',
        // sk: 'sk', // not currently supported
        tr: 'tr',
        zh: 'zh-CN',
        'zh-CN': 'zh-CN',
    };
    return subs[langCode];
}

i18next.init({
    lng: 'en-US',
    debug: process.env.NODE_ENV !== 'ci',
    resources: translationResources,
    fallbackLng: 'en-US',
});

export const comT = i18next.getFixedT(null, 'command');

export { getFixedT, t } from 'i18next';

export function getCommandLocalizations(key) {
    const localization = {};
    for (const langCode of Object.keys(translationResources)) {
        if (!translationResources[langCode].command) {
            continue;
        }
        const discordLocale = getDiscordLocale(langCode);
        if (!discordLocale) {
            continue;
        }
        localization[discordLocale] = comT(key, {lng: discordLocale});
    }
    return localization;
}

export function getTranslationChoices() {
    return Object.keys(translationResources).map(langCode => {
        return {
            name: langCode,
            value: langCode,
        };
    });
}

export default {
    t: i18next.t,
    getFixedT: i18next.getFixedT,
    getCommandLocalizations: getCommandLocalizations,
    getDiscordLocale: getDiscordLocale,
    getTranslationChoices: getTranslationChoices,
};
