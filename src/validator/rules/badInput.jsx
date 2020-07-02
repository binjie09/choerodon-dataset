import isEmpty from '../../_util/isEmpty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import { toRangeValue } from '../../field/utils';
const isBadInput = (value, range) => {
    if (range) {
        return toRangeValue(value, range).some(item => !isEmpty(item) && isNaN(item));
    }
    return !isEmpty(value) && isNaN(value);
};
export default function badInput(value, props) {
    const { type, defaultValidationMessages, range } = props;
    if (type === "number" /* number */ && isBadInput(value, range)) {
        const ruleName = 'badInput';
        const { [ruleName]: validationMessage = $l('Validator', 'bad_input'), } = defaultValidationMessages;
        return new ValidationResult({
            validationMessageRaw: validationMessage,
            value,
            ruleName,
        });
    }
    return true;
}
