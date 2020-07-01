import { action, computed, isArrayLike, observable, runInAction } from 'mobx';
import isString from 'lodash/isString';
import omitBy from 'lodash/omitBy';
import isUndefined from 'lodash/isUndefined';
import { getConfig } from '../configure';
import Validity from './Validity';
import ValidationResult from './ValidationResult';
import Record from '../data-set/Record';
import getValidationRules, { methodReturn, validationRule, ValidatorProps } from './rules';
import valueMissing from './rules/valueMissing';
import Field from '../data-set/Field';
import { Form, FormField } from '../interfaces';

export type CustomValidator = (
  value: any,
  name?: string,
  record?: Record | Form,
) => Promise<boolean | string | undefined>;

export interface ValidationMessages {
  badInput?: string;
  patternMismatch?: string;
  rangeOverflow?: string;
  rangeUnderflow?: string;
  stepMismatch?: string;
  stepMismatchBetween?: string;
  tooLong?: string;
  tooShort?: string;
  typeMismatch?: string;
  valueMissing?: string;
  valueMissingNoLabel?: string;
  customError?: string;
  uniqueError?: string;
  unknown?: string;
}

export default class Validator {
  @observable private field?: Field;

  @observable private control?: FormField;

  @observable private innerValidationResults: ValidationResult[];

  @computed
  get props(): ValidatorProps {
    const { control, field } = this;
    const controlProps = control && omitBy(control.getValidatorProps(), isUndefined);
    const fieldProps = field && field.getValidatorProps();
    return {
      ...fieldProps,
      ...controlProps,
      defaultValidationMessages: {
        ...(controlProps && controlProps.defaultValidationMessages),
        ...getConfig('defaultValidationMessages'),
        ...(fieldProps && fieldProps.defaultValidationMessages),
      },
    };
  }

  @computed
  private get uniqueRefFields(): Field[] {
    const { name, unique, record } = this.props;
    if (record && isString(unique)) {
      return [...record.fields.values()].filter(
        field =>
          field.name !== name &&
          field.get('unique') === unique &&
          !field.get('multiple') &&
          !field.get('range'),
      );
    }
    return [];
  }

  // @computed
  // private get bindingFieldWithValidationResult(): Field | undefined {
  //   const { name, record, type } = this.props;
  //   if (record && name && type === FieldType.object) {
  //     return findBindField(name, record.fields, field => !field.isValid());
  //   }
  //   return undefined;
  // }

  @computed
  private get uniqueRefValidationResult(): ValidationResult | undefined {
    const { uniqueRefFields } = this;
    let validationResult: ValidationResult | undefined;
    if (
      uniqueRefFields.length &&
      this.innerValidationResults.every(result => result.ruleName !== 'uniqueError')
    ) {
      uniqueRefFields.some(uniqueRefField => {
        validationResult = uniqueRefField.validator.innerValidationResults.find(
          result => result.ruleName === 'uniqueError',
        );
        return !!validationResult;
      });
    }
    return validationResult;
  }

  @computed
  get validationResults(): ValidationResult[] {
    const { uniqueRefValidationResult } = this;
    if (uniqueRefValidationResult) {
      return [uniqueRefValidationResult];
    }
    const { innerValidationResults } = this;
    if (innerValidationResults.length) {
      return innerValidationResults;
    }
    // const { bindingFieldWithValidationResult } = this;
    // if (bindingFieldWithValidationResult) {
    //   return bindingFieldWithValidationResult.getValidationErrorValues();
    // }
    return [];
  }

  @computed
  get currentValidationResult(): ValidationResult | undefined {
    const { validationResults } = this;
    return validationResults.length ? validationResults[0] : undefined;
  }

  @computed
  get validity(): Validity {
    const { currentValidationResult } = this;
    return new Validity(
      currentValidationResult ? { [currentValidationResult.ruleName]: true } : undefined,
    );
  }

  @computed
  get injectionOptions(): object {
    const { currentValidationResult } = this;
    return (currentValidationResult && currentValidationResult.injectionOptions) || {};
  }

  @computed
  get validationMessage(): string | undefined {
    const { currentValidationResult } = this;
    return currentValidationResult && currentValidationResult.validationMessage;
  }

  constructor(field?: Field, control?: FormField) {
    runInAction(() => {
      this.field = field;
      this.control = control;
      this.innerValidationResults = [];
    });
  }

  @action
  reset() {
    this.clearErrors();
    const { uniqueRefFields } = this;
    if (uniqueRefFields.length) {
      uniqueRefFields.forEach(uniqueRefField => uniqueRefField.validator.clearErrors());
    }
  }

  @action
  async report(ret: ValidationResult) {
    const { name, dataSet, record } = this.props;
    if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
      const { validationMessage, value } = ret;
      const reportMessage: any[] = [
        'validation:',
        isString(validationMessage)
          ? validationMessage
          : await getConfig('validationMessageReportFormatter')(validationMessage),
      ];
      if (dataSet) {
        const { name: dsName, id } = dataSet;
        if (dsName || id) {
          reportMessage.push(
            `
[dataSet<${dsName || id}>]:`,
            dataSet,
          );
        } else {
          reportMessage.push('\n[dataSet]:', dataSet);
        }
      }
      if (record) {
        if (dataSet) {
          reportMessage.push(
            `
[record<${dataSet.indexOf(record)}>]:`,
            record,
          );
        } else {
          reportMessage.push(`\n[record]:`, record);
        }
        reportMessage.push(
          `
[field<${name}>]:`,
          record.getField(name),
        );
      } else {
        reportMessage.push('[field]:', name);
      }
      reportMessage.push('\n[value]:', value);
      console.warn(...reportMessage);
    }
  }

  @action
  clearErrors() {
    this.innerValidationResults = [];
  }

  @action
  addError(result: ValidationResult) {
    this.innerValidationResults.push(result);
    this.report(result);
  }

  async execute(rules: validationRule[], value: any[]): Promise<any> {
    const { props } = this;
    const method = rules.shift();
    if (method) {
      const results: methodReturn[] = await Promise.all<methodReturn>(
        value.map(item => method(item, props)),
      );
      results.forEach(result => {
        if (result instanceof ValidationResult) {
          this.addError(result);
          const index = value.indexOf(result.value);
          if (index !== -1) {
            value.splice(index, 1);
          }
        }
      });
      if (value.length) {
        await this.execute(rules, value);
      }
    }
  }

  async checkValidity(value: any = null): Promise<boolean> {
    const valueMiss: methodReturn = valueMissing(value, this.props);
    this.clearErrors();
    if (valueMiss !== true) {
      this.addError(valueMiss);
    } else {
      const { multiple } = this.props;
      await this.execute(
        getValidationRules(),
        multiple && isArrayLike(value) ? value.slice() : [value],
      );
    }
    return this.validity.valid;
  }
}
