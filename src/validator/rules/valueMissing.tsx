import { isArrayLike } from 'mobx';
import isEmpty from '../../is-empty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import { methodReturn, ValidatorProps } from '.';

function isEmptyArray(value: any): boolean {
  return isEmpty(value) || (isArrayLike(value) && value.length === 0);
}

export default function valueMissing(value: any, props: ValidatorProps): methodReturn {
  const { required, label, multiple, range, defaultValidationMessages } = props;
  if (
    required &&
    (isEmptyArray(value) || (multiple && range && value.every(item => isEmptyArray(item))))
  ) {
    const injectionOptions = { label };
    const key = label ? 'value_missing' : 'value_missing_no_label';
    const ruleName = label ? 'valueMissing' : 'valueMissingNoLabel';
    const { [ruleName]: validationMessageRaw = $l('Validator', key) } = defaultValidationMessages;
    return new ValidationResult({
      validationMessageRaw,
      injectionOptions,
      value,
      ruleName,
    });
  }
  return true;
}
