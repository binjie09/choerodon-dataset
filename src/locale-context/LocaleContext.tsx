import { action, get, observable, runInAction } from 'mobx';
import moment from 'moment';
import defaultLocale, { Locale } from './locale';
import defaultSupports, { Supports } from './supports';
import normalizeLanguage from '../normalize-language';
import { mobxGet } from '../object-chain-value/MobxUtils';

function setMomentLocale(locale: Locale) {
  moment.locale(normalizeLanguage(locale ? locale.lang : defaultLocale.lang));
}

export class LocaleContext {
  @observable locale: Locale;

  @observable supports: Supports;

  constructor() {
    runInAction(() => {
      this.locale = defaultLocale;
      this.supports = defaultSupports;
    });
  }

  @action
  setLocale(locale: Locale) {
    setMomentLocale(locale);
    this.locale = locale;
  }

  setSupports(supports: Supports) {
    this.supports = supports;
  }

  get(component: string, key?: string, defaults?: Locale) {
    const cmp = get(this.locale, component) || (defaults && mobxGet(defaults, component));
    if (key) {
      return (cmp && mobxGet(cmp, key)) || `${component}.${key}`;
    }
    return cmp;
  }
}

export default new LocaleContext();
