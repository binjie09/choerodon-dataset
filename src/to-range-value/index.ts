import isObject from 'lodash/isObject';
import { isArrayLike } from 'mobx';

export default function toRangeValue(value: any, range?: boolean | [string, string]): [any, any] {
  if (isArrayLike(range)) {
    if (isObject(value)) {
      const [start, end] = range;
      return [value[start], value[end]];
    }
  } else if (isArrayLike(value)) {
    return value.slice(0, 2) as [any, any];
  }
  return [undefined, undefined];
}
