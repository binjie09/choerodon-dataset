import localeContext from './LocaleContext';
import { Locale } from './locale';

export function $l(
  component: string,
  key?: string,
  defaults?: Locale,
) {
  return localeContext.get(component, key, defaults);
}

export default localeContext;
