import isString from 'lodash/isString';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import isEmpty from '../../is-empty';
import { methodReturn, ValidatorProps } from '.';
import { axiosConfigAdapter } from '../../data-set/utils';
import { FieldType } from '../../data-set/enum';

export default async function uniqueError(
  value: any,
  props: ValidatorProps,
): Promise<methodReturn> {
  const { dataSet, record, unique, name, multiple, range, defaultValidationMessages } = props;
  if (!isEmpty(value) && dataSet && record && unique && name && !multiple && !range) {
    const myField = record.getField(name);
    if (myField && myField.get('type') === FieldType.object) {
      value = value[myField.get('valueField')];
      if (isEmpty(value)) {
        return true;
      }
    }
    if (myField) {
      let { dirty } = myField;
      const fields = { [name]: value };
      if (
        isString(unique) &&
        [...record.fields.entries()].some(([fieldName, field]) => {
          if (
            fieldName !== name &&
            field &&
            field.get('unique') === unique &&
            !field.get('multiple') &&
            !field.get('range')
          ) {
            const otherValue = record.get(fieldName);
            if (isEmpty(otherValue)) {
              return true;
            }
            if (!dirty && field.dirty) {
              dirty = true;
            }
            if (field && field.get('type') === FieldType.object) {
              const otherObjectValue = otherValue[field.get('valueField')];
              if (isEmpty(otherObjectValue)) {
                return true;
              }
              fields[fieldName] = otherObjectValue;
            } else {
              fields[fieldName] = otherValue;
            }
          }
          return false;
        })
      ) {
        return true;
      }
      if (!dirty) {
        return true;
      }
      let invalid = dataSet.data.some(
        item =>
          item !== record &&
          Object.keys(fields).every(field => {
            const dataSetField = record.getField(name);
            if (dataSetField && dataSetField.get('type') === FieldType.object) {
              const valueField = dataSetField.get('valueField');
              return fields[field] === item.get(field)[valueField];
            }
            return fields[field] === item.get(field);
          }),
      );
      if (!invalid) {
        const newConfig = axiosConfigAdapter('validate', dataSet, { unique: [fields] });
        if (newConfig.url) {
          const results: any = await dataSet.axios(newConfig);
          invalid = [].concat(results).some(result => !result);
        }
      }
      if (invalid) {
        const ruleName = 'uniqueError';
        const {
          [ruleName]: validationMessageRaw = $l('Validator', 'unique'),
        } = defaultValidationMessages;
        return new ValidationResult({
          validationMessageRaw,
          value,
          ruleName,
        });
      }
    }
  }
  return true;
}
