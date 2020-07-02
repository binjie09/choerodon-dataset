import isEmpty from '../../_util/isEmpty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import formatReactTemplate from '../../formatter/formatReactTemplate';
export default function tooLong(value, props) {
    const { maxLength, defaultValidationMessages } = props;
    if (!isEmpty(value)) {
        const { length } = value.toString();
        if (!!maxLength && maxLength > 0 && length > maxLength) {
            const injectionOptions = { maxLength, length };
            const ruleName = 'tooLong';
            const { [ruleName]: validationMessage = $l('Validator', 'too_long'), } = defaultValidationMessages;
            return new ValidationResult({
                validationMessageRaw: formatReactTemplate(validationMessage, injectionOptions),
                injectionOptions,
                value,
                ruleName,
            });
        }
    }
    return true;
}
