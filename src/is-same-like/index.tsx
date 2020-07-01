import isSame from '../is-same';

export default function isSameLike(newValue, oldValue) {
  /* eslint-disable-next-line */
  return isSame(newValue, oldValue) || newValue == oldValue;
}
