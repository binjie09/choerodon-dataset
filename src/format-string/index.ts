import isString from 'lodash/isString';
import capitalize from 'lodash/capitalize';
import { FieldFormat, FieldTrim } from '../data-set/enum';

export interface FormatOptions {
  trim?: FieldTrim;
  format?: FieldFormat | string;
}

export function trimString(value: string, fieldTrim?: FieldTrim): string {
  if (fieldTrim) {
    switch (fieldTrim) {
      case FieldTrim.both:
        return value.trim();
      case FieldTrim.left:
        return value.trimLeft();
      case FieldTrim.right:
        return value.trimRight();
      default:
    }
  }
  return value;
}

export function transformString(value: string, format?: FieldFormat | string): string {
  if (format) {
    switch (format) {
      case FieldFormat.uppercase:
        return value.toUpperCase();
      case FieldFormat.lowercase:
        return value.toLowerCase();
      case FieldFormat.capitalize:
        return capitalize(value);
      default:
    }
  }
  return value;
}

export default function formatString(value: any, { trim, format }: FormatOptions) {
  if (isString(value)) {
    return transformString(trimString(value, trim), format);
  }
  return value;
}
