import isEmpty from '../../is-empty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import { methodReturn, ValidatorProps } from '.';

export default function tooLong(value: any, props: ValidatorProps): methodReturn {
  const { maxLength, defaultValidationMessages } = props;
  if (!isEmpty(value)) {
    const { length } = value.toString();
    if (!!maxLength && maxLength > 0 && length > maxLength) {
      const injectionOptions = { maxLength, length };
      const ruleName = 'tooLong';
      const {
        [ruleName]: validationMessageRaw = $l('Validator', 'too_long'),
      } = defaultValidationMessages;
      return new ValidationResult({
        validationMessageRaw,
        injectionOptions,
        value,
        ruleName,
      });
    }
  }
  return true;
}
