import isString from 'lodash/isString';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import isEmpty from '../../_util/isEmpty';
import { axiosConfigAdapter } from '../../data-set/utils';
export default async function uniqueError(value, props) {
    const { dataSet, record, unique, name, multiple, range, defaultValidationMessages } = props;
    if (!isEmpty(value) && dataSet && record && unique && name && !multiple && !range) {
        const myField = record.getField(name);
        if (myField && myField.get('type') === "object" /* object */) {
            value = value[myField.get('valueField')];
        }
        if (myField) {
            let { dirty } = myField;
            const fields = { [name]: value };
            if (isString(unique) &&
                [...record.fields.entries()].some(([fieldName, field]) => {
                    if (fieldName !== name &&
                        field &&
                        field.get('unique') === unique &&
                        !field.get('multiple') &&
                        !field.get('range')) {
                        const otherValue = record.get(fieldName);
                        if (isEmpty(otherValue)) {
                            return true;
                        }
                        if (!dirty && field.dirty) {
                            dirty = true;
                        }
                        fields[fieldName] = otherValue;
                    }
                    return false;
                })) {
                return true;
            }
            if (!dirty) {
                return true;
            }
            let invalid = dataSet.data.some(item => item !== record &&
                Object.keys(fields).every(field => {
                    const dataSetField = record.getField(name);
                    if (dataSetField && dataSetField.get('type') === "object" /* object */) {
                        const valueField = dataSetField.get('valueField');
                        return fields[field] === item.get(field)[valueField];
                    }
                    return fields[field] === item.get(field);
                }));
            if (!invalid) {
                const newConfig = axiosConfigAdapter('validate', dataSet, { unique: [fields] });
                if (newConfig.url) {
                    const results = await dataSet.axios(newConfig);
                    invalid = [].concat(results).some(result => !result);
                }
            }
            if (invalid) {
                const ruleName = 'uniqueError';
                const { [ruleName]: validationMessage = $l('Validator', 'unique'), } = defaultValidationMessages;
                return new ValidationResult({
                    validationMessageRaw: validationMessage,
                    value,
                    ruleName,
                });
            }
        }
    }
    return true;
}
