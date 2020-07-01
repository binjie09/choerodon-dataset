export default class Locales {
    constructor(locales) {
        Object.assign(this, locales);
    }
    get(lang) {
        return this[lang];
    }
    set(lang, value) {
        this[lang] = value;
    }
}
