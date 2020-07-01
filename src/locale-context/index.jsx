import localeContext from './LocaleContext';
import formatReactTemplate from '../formatter/formatReactTemplate';
export function $l(component, key, injectionOptions) {
    const locale = localeContext.get(component, key);
    if (injectionOptions) {
        return formatReactTemplate(locale, injectionOptions);
    }
    return locale;
}
export default localeContext;
