import { isMoment } from 'moment';
import isNil from 'lodash/isNil';
import isEmpty from '../../is-empty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import { methodReturn, ValidatorProps } from '.';
import toRangeValue from '../../to-range-value';

const isUnderflow = (value, min, range) => {
  if (range) {
    return toRangeValue(value, range).some(item => !isEmpty(item) && Number(item) < Number(min));
  }
  return !isEmpty(value) && Number(value) < Number(min);
};

export default function rangeUnderflow(value: any, props: ValidatorProps): methodReturn {
  const { min, label, format, defaultValidationMessages, range } = props;
  if (!isNil(min) && isUnderflow(value, min, range)) {
    const injectionOptions = { min: isMoment(min) ? min.format(format) : min, label };
    const ruleName = 'rangeUnderflow';
    const {
      [ruleName]: validationMessageRaw = $l('Validator', 'range_underflow'),
    } = defaultValidationMessages;
    return new ValidationResult({
      validationMessageRaw,
      injectionOptions,
      value,
      ruleName,
    });
  }
  return true;
}
