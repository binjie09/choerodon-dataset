import { __decorate } from "tslib";
import { action, get, observable, runInAction } from 'mobx';
import moment from 'moment';
import defaultLocale from './locale';
import defaultSupports from './supports';
import normalizeLanguage from '../_util/normalizeLanguage';
function setMomentLocale(locale) {
    moment.locale(normalizeLanguage(locale ? locale.lang : defaultLocale.lang));
}
export class LocaleContext {
    constructor() {
        runInAction(() => {
            this.locale = defaultLocale;
            this.supports = defaultSupports;
        });
    }
    setLocale(locale) {
        setMomentLocale(locale);
        this.locale = locale;
    }
    setSupports(supports) {
        this.supports = supports;
    }
    get(component, key) {
        const cmp = get(this.locale, component);
        return (cmp && get(cmp, key)) || `${component}.${key}`;
    }
}
__decorate([
    observable
], LocaleContext.prototype, "locale", void 0);
__decorate([
    observable
], LocaleContext.prototype, "supports", void 0);
__decorate([
    action
], LocaleContext.prototype, "setLocale", null);
export default new LocaleContext();
