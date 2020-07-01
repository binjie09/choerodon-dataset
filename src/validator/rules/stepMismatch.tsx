import { isMoment } from 'moment';
import isEmpty from '../../is-empty';
import ValidationResult from '../ValidationResult';
import { $l } from '../../locale-context';
import { getNearStepValues } from '../../number-utils';
import { methodReturn, ValidatorProps } from '.';
import toRangeValue from '../../to-range-value';

function isStepMismatch(value, step, min, max, range) {
  if (range) {
    let nearStepValues;
    toRangeValue(value, range).every(item => {
      if (!isEmpty(item)) {
        nearStepValues = getNearStepValues(isMoment(item) ? item : Number(item), step, min, max);
      }
      return !nearStepValues;
    });
    return nearStepValues;
  }
  if (!isEmpty(value)) {
    return getNearStepValues(isMoment(value) ? value : Number(value), step, min, max);
  }
}

export default function stepMismatch(value: any, props: ValidatorProps): methodReturn {
  const { step, min, max, defaultValidationMessages, range, format } = props;
  if (step !== undefined) {
    const nearStepValues = isStepMismatch(value, step, min, max, range);
    if (nearStepValues !== undefined) {
      const [before, after] = nearStepValues;
      const injectionOptions = {
        0: isMoment(before) ? before.format(format) : before,
        1: isMoment(after) ? after.format(format) : after,
      };
      const ruleName = nearStepValues.length === 2 ? 'stepMismatchBetween' : 'stepMismatch';
      const key = nearStepValues.length === 2 ? 'step_mismatch_between' : 'step_mismatch';
      const { [ruleName]: validationMessage = $l('Validator', key) } = defaultValidationMessages;
      return new ValidationResult({
        validationMessage,
        injectionOptions,
        value: isMoment(value) ? value.format(format) : value,
        ruleName,
      });
    }
  }
  return true;
}
