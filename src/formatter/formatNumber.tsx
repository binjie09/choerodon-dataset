import { FieldType } from '@choerodon/dataset/lib/data-set/enum';
import normalizeLanguage from '../normalize-language';
import {
  getNumberFormatOptions,
  toLocaleStringPolyfill,
  toLocaleStringSupportsLocales,
} from './utils';

export default function formatNumber(value, lang: string, options?: Intl.NumberFormatOptions) {
  const v = parseFloat(value);
  if (!isNaN(v)) {
    if (toLocaleStringSupportsLocales()) {
      return v.toLocaleString(normalizeLanguage(lang), {
        ...getNumberFormatOptions(FieldType.number, options),
        ...options,
      });
    }
    return toLocaleStringPolyfill(v, FieldType.number, options);
  }
  return value;
}
