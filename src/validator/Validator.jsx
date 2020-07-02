import { __decorate } from "tslib";
import React from 'react';
import { action, computed, isArrayLike, observable, runInAction } from 'mobx';
import isString from 'lodash/isString';
import omitBy from 'lodash/omitBy';
import isUndefined from 'lodash/isUndefined';
import { getConfig } from 'choerodon-ui/lib/configure';
import Validity from './Validity';
import ValidationResult from './ValidationResult';
import validationRules from './rules';
import valueMissing from './rules/valueMissing';
import getReactNodeText from '../_util/getReactNodeText';
export default class Validator {
    constructor(field, control) {
        runInAction(() => {
            this.field = field;
            this.control = control;
            this.innerValidationResults = [];
        });
    }
    get props() {
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
    get uniqueRefFields() {
        const { name, unique, record } = this.props;
        if (record && isString(unique)) {
            return [...record.fields.values()].filter(field => field.name !== name &&
                field.get('unique') === unique &&
                !field.get('multiple') &&
                !field.get('range'));
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
    get uniqueRefValidationResult() {
        const { uniqueRefFields } = this;
        let validationResult;
        if (uniqueRefFields.length &&
            this.innerValidationResults.every(result => result.ruleName !== 'uniqueError')) {
            uniqueRefFields.some(uniqueRefField => {
                validationResult = uniqueRefField.validator.innerValidationResults.find(result => result.ruleName === 'uniqueError');
                return !!validationResult;
            });
        }
        return validationResult;
    }
    get validationResults() {
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
    get currentValidationResult() {
        const { validationResults } = this;
        return validationResults.length ? validationResults[0] : undefined;
    }
    get validity() {
        const { currentValidationResult } = this;
        return new Validity(currentValidationResult ? { [currentValidationResult.ruleName]: true } : undefined);
    }
    get injectionOptions() {
        const { currentValidationResult } = this;
        return (currentValidationResult && currentValidationResult.injectionOptions) || {};
    }
    get validationMessage() {
        const { currentValidationResult } = this;
        return currentValidationResult && currentValidationResult.validationMessageRaw;
    }
    reset() {
        this.clearErrors();
        const { uniqueRefFields } = this;
        if (uniqueRefFields.length) {
            uniqueRefFields.forEach(uniqueRefField => uniqueRefField.validator.clearErrors());
        }
    }
    async report(ret) {
        const { name, dataSet, record } = this.props;
        if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
            const { validationMessage, value } = ret;
            const reportMessage = [
                'validation:',
                isString(validationMessage)
                    ? validationMessage
                    : await getReactNodeText(<span>{validationMessage}</span>),
            ];
            if (dataSet) {
                const { name: dsName, id } = dataSet;
                if (dsName || id) {
                    reportMessage.push(`
[dataSet<${dsName || id}>]:`, dataSet);
                }
                else {
                    reportMessage.push('\n[dataSet]:', dataSet);
                }
            }
            if (record) {
                if (dataSet) {
                    reportMessage.push(`
[record<${dataSet.indexOf(record)}>]:`, record);
                }
                else {
                    reportMessage.push(`\n[record]:`, record);
                }
                reportMessage.push(`
[field<${name}>]:`, record.getField(name));
            }
            else {
                reportMessage.push('[field]:', name);
            }
            reportMessage.push('\n[value]:', value);
            console.warn(...reportMessage);
        }
    }
    clearErrors() {
        this.innerValidationResults = [];
    }
    addError(result) {
        this.innerValidationResults.push(result);
        this.report(result);
    }
    async execute(rules, value) {
        const { props } = this;
        const method = rules.shift();
        if (method) {
            const results = await Promise.all(value.map(item => method(item, props)));
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
    async checkValidity(value = null) {
        const valueMiss = valueMissing(value, this.props);
        this.clearErrors();
        if (valueMiss !== true) {
            this.addError(valueMiss);
        }
        else {
            const { multiple } = this.props;
            await this.execute(validationRules.slice(), multiple && isArrayLike(value) ? value.slice() : [value]);
        }
        return this.validity.valid;
    }
}
__decorate([
    observable
], Validator.prototype, "field", void 0);
__decorate([
    observable
], Validator.prototype, "control", void 0);
__decorate([
    observable
], Validator.prototype, "innerValidationResults", void 0);
__decorate([
    computed
], Validator.prototype, "props", null);
__decorate([
    computed
], Validator.prototype, "uniqueRefFields", null);
__decorate([
    computed
], Validator.prototype, "uniqueRefValidationResult", null);
__decorate([
    computed
], Validator.prototype, "validationResults", null);
__decorate([
    computed
], Validator.prototype, "currentValidationResult", null);
__decorate([
    computed
], Validator.prototype, "validity", null);
__decorate([
    computed
], Validator.prototype, "injectionOptions", null);
__decorate([
    computed
], Validator.prototype, "validationMessage", null);
__decorate([
    action
], Validator.prototype, "reset", null);
__decorate([
    action
], Validator.prototype, "report", null);
__decorate([
    action
], Validator.prototype, "clearErrors", null);
__decorate([
    action
], Validator.prototype, "addError", null);
