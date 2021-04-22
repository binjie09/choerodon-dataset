import { FieldType } from '@choerodon/dataset/lib/data-set/enum';
import {
  getNumberFormatOptions,
  toLocaleStringPolyfill,
  toLocaleStringSupportsLocales,
} from './utils';
import normalizeLanguage from '../normalize-language';

export default function formatCurrency(value, lang: string, options?: Intl.NumberFormatOptions) {
  const v = parseFloat(value);
  if (!isNaN(v)) {
    if (toLocaleStringSupportsLocales()) {
      return v.toLocaleString(normalizeLanguage(lang), {
        ...getNumberFormatOptions(FieldType.currency, options),
        ...options,
      });
    }
    return toLocaleStringPolyfill(v, FieldType.currency, options);
  }
  return value;
}
