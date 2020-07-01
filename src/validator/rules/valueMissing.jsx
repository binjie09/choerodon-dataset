import { isArrayLike } from 'mobx';
import isEmpty from '../../_util/isEmpty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import formatReactTemplate from '../../formatter/formatReactTemplate';
function isEmptyArray(value) {
    return isEmpty(value) || (isArrayLike(value) && value.length === 0);
}
export default function valueMissing(value, props) {
    const { required, label, multiple, range, defaultValidationMessages } = props;
    if (required &&
        (isEmptyArray(value) || (multiple && range && value.every(item => isEmptyArray(item))))) {
        const injectionOptions = { label };
        const key = label ? 'value_missing' : 'value_missing_no_label';
        const ruleName = label ? 'valueMissing' : 'valueMissingNoLabel';
        const { [ruleName]: validationMessage = $l('Validator', key) } = defaultValidationMessages;
        return new ValidationResult({
            validationMessage: formatReactTemplate(validationMessage, injectionOptions),
            injectionOptions,
            value,
            ruleName,
        });
    }
    return true;
}
