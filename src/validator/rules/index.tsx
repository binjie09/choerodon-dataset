import { Moment } from 'moment';
import badInput from './badInput';
import patternMismatch from './patternMismatch';
import rangeOverflow from './rangeOverflow';
import rangeUnderflow from './rangeUnderflow';
import stepMismatch from './stepMismatch';
import tooLong from './tooLong';
import tooShort from './tooShort';
import typeMismatch from './typeMismatch';
import customError from './customError';
import uniqueError from './uniqueError';
import ValidationResult from '../ValidationResult';
import { FieldType } from '../../data-set/enum';
import DataSet from '../../data-set/DataSet';
import Record from '../../data-set/Record';
import { CustomValidator, ValidationMessages } from '../Validator';
import { Form, TimeStep } from '../../interfaces';

export type methodReturn = ValidationResult | true;

export type validationRule = (value, props) => methodReturn | PromiseLike<methodReturn>;

export default function getValidationRules(): validationRule[] {
  return [
    badInput,
    patternMismatch,
    rangeOverflow,
    rangeUnderflow,
    stepMismatch,
    tooLong,
    tooShort,
    typeMismatch,
    customError,
    uniqueError,
  ];
}

export interface ValidatorProps {
  type?: FieldType;
  required?: boolean;
  pattern?: string | RegExp;
  min?: number | Moment | null;
  max?: number | Moment | null;
  step?: number | TimeStep;
  minLength?: number;
  maxLength?: number;
  dataSet?: DataSet;
  record?: Record;
  name?: string;
  unique?: boolean | string;
  label?: any;
  customValidator?: CustomValidator;
  multiple?: boolean;
  range?: boolean | [string, string];
  form?: Form;
  format?: string;
  defaultValidationMessages: ValidationMessages;
}
