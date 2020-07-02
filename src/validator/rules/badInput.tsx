import isEmpty from '../../is-empty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import { FieldType } from '../../data-set/enum';
import toRangeValue from '../../to-range-value';
import { methodReturn, ValidatorProps } from '.';

const isBadInput = (value, range) => {
  if (range) {
    return toRangeValue(value, range).some(item => !isEmpty(item) && isNaN(item));
  }
  return !isEmpty(value) && isNaN(value);
};

export default function badInput(value: any, props: ValidatorProps): methodReturn {
  const { type, defaultValidationMessages, range } = props;
  if (type === FieldType.number && isBadInput(value, range)) {
    const ruleName = 'badInput';
    const {
      [ruleName]: validationMessageRaw = $l('Validator', 'bad_input'),
    } = defaultValidationMessages;
    return new ValidationResult({
      validationMessageRaw,
      value,
      ruleName,
    });
  }
  return true;
}
