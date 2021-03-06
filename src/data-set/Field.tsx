import { action, computed, get, observable, ObservableMap, runInAction, set, toJS } from 'mobx';
import { MomentInput } from 'moment';
import isFunction from 'lodash/isFunction';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import merge from 'lodash/merge';
import unionBy from 'lodash/unionBy';
import { AxiosRequestConfig } from 'axios';
import moment from 'moment';
import { getConfig } from '../configure';
import warning from '../warning';
import DataSet from './DataSet';
import Record from './Record';
import Validator, { CustomValidator, ValidationMessages } from '../validator/Validator';
import { DataSetEvents, DataSetSelection, FieldFormat, FieldIgnore, FieldTrim, FieldType, SortOrder } from './enum';
import lookupStore from '../stores/LookupCodeStore';
import lovCodeStore from '../stores/LovCodeStore';
import localeContext from '../locale-context';
import { getLimit, processValue } from './utils';
import Validity from '../validator/Validity';
import ValidationResult from '../validator/ValidationResult';
import { ValidatorProps } from '../validator/rules';
import isSame from '../is-same';
import PromiseQueue from '../promise-queue';
import { TransportHookProps } from './Transport';
import isSameLike from '../is-same-like';
import { buildURLWithAxiosConfig } from '../axios/utils';
// import { getDateFormatByField } from '../data-set/utils';
import { getLovPara } from '../stores/utils';
import { LovConfig, TimeStep } from '../interfaces';

import { CSSProperties, ReactNode } from 'react';
import { IComputedValue, isObservableObject, remove } from 'mobx';
import raf from 'raf';
import { DataSetProps } from './DataSet';
import { getBaseType } from './utils';
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 2 ** 53 - 1;
export const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER || -(2 ** 53 - 1);
export function getDateFormatByFieldType(type: FieldType) {
  const formatter = getConfig('formatter');
  switch (type) {
    case FieldType.date:
      return formatter.date;
    case FieldType.dateTime:
      return formatter.dateTime;
    case FieldType.week:
      return formatter.week;
    case FieldType.month:
      return formatter.month;
    case FieldType.year:
      return formatter.year;
    case FieldType.time:
      return formatter.time;
    default:
      return formatter.date;
  }
}
export function getDateFormatByField(field?: Field, type?: FieldType): string {
  if (field) {
    return field.get('format') || getDateFormatByFieldType(type || field.type);
  }
  if (type) {
    return getDateFormatByFieldType(type);
  }
  return getConfig('formatter').jsonDate || moment.defaultFormat;
}

function isEqualDynamicProps(oldProps, newProps) {
  if (newProps === oldProps) {
    return true;
  }
  if (isObject(newProps) && isObject(oldProps) && Object.keys(newProps).length) {
    if (Object.keys(newProps).length !== Object.keys(toJS(oldProps)).length) {
      return false;
    }
    return Object.keys(newProps).every(key => {
      const value = newProps[key];
      const oldValue = oldProps[key];
      if (oldValue === value) {
        return true;
      }
      if (isFunction(value) && isFunction(oldValue)) {
        return value.toString() === oldValue.toString();
      }
      return isEqual(oldValue, value);
    });
  }
  return isEqual(newProps, oldProps);
}

function getPropsFromLovConfig(lovCode, propsName) {
  if (lovCode) {
    const config = lovCodeStore.getConfig(lovCode);
    if (config) {
      if (config[propsName]) {
        return { [propsName]: config[propsName] };
      }
    }
  }
  return {};
}

export type Fields = ObservableMap<string, Field>;
export type DynamicPropsArguments = { dataSet: DataSet; record: Record; name: string; };
export type HighlightProps = {
  title?: ReactNode;
  content?: ReactNode;
  dataSet?: DataSet | undefined;
  record?: Record | undefined;
  name?: string | undefined;
  className?: string;
  style?: CSSProperties
};

export type FieldProps = {
  /**
   * ?????????
   */
  name?: string;
  /**
   * ????????????
   */
  type?: FieldType;
  /**
   * ????????????
   * ???????????? asc | desc
   */
  order?: SortOrder;
  /**
   * ????????????
   */
  label?: string | ReactNode;
  /**
   * ??????????????????
   */
  labelWidth?: string;
  /**
   * ????????????????????????????????????????????????
   */
  format?: string | FieldFormat;
  /**
   * ??????
   */
  pattern?: string | RegExp;
  /**
   * ????????????
   */
  minLength?: number;
  /**
   * ????????????
   */
  maxLength?: number;
  /**
   * ??????
   */
  step?: number | TimeStep;
  /**
   * ???????????????
   */
  nonStrictStep?: boolean;
  /**
   * ?????????
   */
  max?: MomentInput | null;
  /**
   * ?????????
   */
  min?: MomentInput | null;
  /**
   * ???????????????
   */
  precision?: number;
  /**
   * ?????????????????????
   */
  numberGrouping?: boolean;
  /**
   * ?????????
   */
  validator?: CustomValidator;
  /**
   * ????????????
   * @default false
   */
  required?: boolean;
  /**
   * ????????????
   * @default false
   */
  readOnly?: boolean;
  /**
   * ????????????
   * @default false
   */
  disabled?: boolean;
  /**
   * 1.???type???object???????????????????????????
   * 2.???????????????????????????????????????`meaning`
   */
  textField?: string;
  /**
   * ????????????????????????????????????`value`
   */
  valueField?: string;
  /**
   * ??????????????????????????????????????????`value`
   */
  idField?: string;
  /**
   * ??????????????????????????????
   */
  parentField?: string;
  /**
   *  ?????????boolean??????true????????????
   */
  trueValue?: string | number | boolean;
  /**
   *  ?????????boolean??????false????????????
   */
  falseValue?: string | number | boolean;
  /**
   * ?????????????????????????????????
   */
  options?: DataSet | string;
  /**
   * ??????????????????????????????
   */
  optionsProps?: DataSetProps;
  /**
   * ????????????
   * ?????????number????????????????????????
   */
  group?: number | boolean;
  /**
   * ?????????
   */
  defaultValue?: any;
  /**
   * ??????????????????
   * ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   * @default false
   */
  multiple?: boolean | string;
  /**
   * ?????????????????????
   * @default false
   */
  multiLine?: boolean;
  /**
   * ??????????????????
   * ??????true???????????????[startValue, endValue]
   * ????????????????????????['start', 'end']???????????????{ start: startValue, end: endValue }
   * @default false
   */
  range?: boolean | [string, string];
  /**
   * ???????????????????????????????????????
   */
  unique?: boolean | string;
  /**
   * LOV??????
   */
  lovCode?: string;
  /**
   * LOV????????????
   */
  lovPara?: object;
  /**
   * ???????????????
   */
  lookupCode?: string;
  /**
   * ??????????????????Url
   */
  lookupUrl?: string | ((code: string) => string);
  /**
   * LOV??????????????????
   */
  lovDefineUrl?: string | ((code: string) => string);
  /**
   * LOV??????????????????
   */
  lovQueryUrl?:
    | string
    | ((code: string, config: LovConfig | undefined, props: TransportHookProps) => string);
  /**
   * ??????????????????axiosConfig
   */
  lookupAxiosConfig?:
    | AxiosRequestConfig
    | ((props: {
    params?: any;
    dataSet?: DataSet;
    record?: Record;
    lookupCode?: string;
  }) => AxiosRequestConfig);
  /**
   * LOV?????????????????????
   */
  lovDefineAxiosConfig?: AxiosRequestConfig | ((code: string) => AxiosRequestConfig);
  /**
   * LOV?????????????????????
   */
  lovQueryAxiosConfig?:
    | AxiosRequestConfig
    | ((code: string, lovConfig?: LovConfig) => AxiosRequestConfig);
  /**
   * ????????????????????????axiosConfig
   */
  lookupBatchAxiosConfig?: (codes: string[]) => AxiosRequestConfig;
  /**
   * ????????????????????????
   */
  bind?: string;
  /**
   * @deprecated
   * ????????????
   */
  dynamicProps?:
    | ((props: DynamicPropsArguments) => FieldProps | undefined)
    | { [key: string]: (DynamicPropsArguments) => any; };
  /**
   * ????????????????????? mobx-computed ???????????????
   */
  computedProps?: { [key: string]: (DynamicPropsArguments) => any; }
  /**
   * ?????????LOV??????????????????????????????
   * @example
   * cascadeMap: { parentCodeValue: 'city' }
   * ??????'city'?????????????????????????????????????????????parentCodeValue??????????????????????????????
   */
  cascadeMap?: object;
  /**
   * ????????????
   */
  currency?: string;
  /**
   * ????????????
   * ?????????: always - ???????????? clean - ????????????????????? never - ????????????
   * @default never
   */
  ignore?: FieldIgnore;
  /**
   * ??????????????????????????????????????????
   */
  transformRequest?: (value: any, record: Record) => any;
  /**
   * ??????????????????????????????????????????
   */
  transformResponse?: (value: any, object: any) => any;
  /**
   * ????????????????????????????????????
   * ?????????: both left right none
   */
  trim?: FieldTrim;
  /**
   * ??????????????????
   */
  defaultValidationMessages?: ValidationMessages;
  /**
   * ??????????????????????????????
   */
  help?: string;
  /**
   * ??????
   */
  highlight?: boolean | ReactNode | HighlightProps;
};

export default class Field {
  static defaultProps: FieldProps = {
    type: FieldType.auto,
    required: false,
    readOnly: false,
    disabled: false,
    group: false,
    textField: 'meaning',
    valueField: 'value',
    trueValue: true,
    falseValue: false,
    trim: FieldTrim.both,
  };

  dataSet?: DataSet;

  record?: Record;

  validator: Validator;

  pending: PromiseQueue;

  lastDynamicProps: any = {};

  validatorPropKeys: string[] = [];

  dynamicPropsComputingChains: string[] = [];

  computedProps: Map<string, IComputedValue<any>> = new Map();

  @observable props: FieldProps & { [key: string]: any; };

  @observable dirtyProps: Partial<FieldProps>;

  @computed
  get pristineProps(): FieldProps {
    return {
      ...this.props,
      ...this.dirtyProps,
    };
  }

  set pristineProps(props: FieldProps) {
    runInAction(() => {
      const { dirtyProps } = this;
      const dirtyKeys = Object.keys(dirtyProps);
      if (dirtyKeys.length) {
        const newProps = {};
        dirtyKeys.forEach((key) => {
          const item = this.props[key];
          newProps[key] = item;
          if (isSame(item, props[key])) {
            delete dirtyProps[key];
          } else {
            dirtyProps[key] = props[key];
          }
        });
        this.props = {
          ...props,
          ...newProps,
        };
      } else {
        this.props = props;
      }
    });
  }

  @computed
  get lookup(): object[] | undefined {
    const lookup = this.get('lookup');
    const valueField = this.get('valueField');
    if (lookup) {
      const lookupData = this.get('lookupData') || [];
      return unionBy(lookup.concat(lookupData), valueField);
    }
    return undefined;
  }

  @computed
  get options(): DataSet | undefined {
    const options = this.get('options');
    if (options) {
      return options;
    }
    // ?????? lookup ????????????????????????
    lookupStore.getAxiosConfig(this);
    const optionsProps = this.get('optionsProps');
    const { lookup, type } = this;
    if (lookup) {
      const parentField = this.get('parentField');
      const idField = this.get('idField') || this.get('valueField');
      const selection = this.get('multiple') ? DataSetSelection.multiple : DataSetSelection.single;
      return new DataSet({
        data: lookup,
        paging: false,
        selection,
        idField,
        parentField,
        ...optionsProps,
      });
    }
    const lovCode = this.get('lovCode');
    if (lovCode) {
      if (type === FieldType.object || type === FieldType.auto) {
        return lovCodeStore.getLovDataSet(lovCode, this, optionsProps);
      }
    }
    return undefined;
  }

  @computed
  get intlFields(): Field[] {
    const { record, type, name } = this;
    const tlsKey = getConfig('tlsKey');
    if (type === FieldType.intl && record && record.get(tlsKey)) {
      return Object.keys(localeContext.supports).reduce<Field[]>((arr, lang) => {
        const field = record.getField(`${tlsKey}.${name}.${lang}`);
        if (field) {
          arr.push(field);
        }
        return arr;
      }, []);
    }
    return [];
  }

  @computed
  get dirty(): boolean {
    const { record, name, intlFields } = this;
    if (intlFields.length) {
      return intlFields.some(langField => langField.dirty);
    }
    if (record) {
      const { dirtyData } = record;
      const dirtyNames = [...dirtyData.keys()];
      if (dirtyNames.includes(name)) {
        return true;
      }
      const bind = this.get('bind');
      if (bind) {
        return [...dirtyData.keys()].some(key => bind === key || bind.startsWith(`${key}.`));
      }
    }
    return false;
  }

  get name(): string {
    return this.props.name!;
  }

  get order(): string | undefined {
    return this.get('order');
  }

  set order(order: string | undefined) {
    this.set('order', order);
  }

  @computed
  get valid(): boolean {
    const {
      intlFields,
      validator: {
        validity: { valid },
      },
    } = this;
    if (valid && intlFields.length) {
      return intlFields.every(field => field.valid);
    }
    return valid;
  }

  @computed
  get validationMessage() {
    return this.validator.validationMessage;
  }

  constructor(props: FieldProps = {}, dataSet?: DataSet, record?: Record) {
    runInAction(() => {
      this.validator = new Validator(this);
      this.pending = new PromiseQueue();
      this.dataSet = dataSet;
      this.record = record;
      this.dirtyProps = {};
      this.props = props;
      // ??????????????????????????????????????????????????? ????????????dsField??? ???options??????????????????
      raf(() => {
        this.fetchLookup();
        this.fetchLovConfig();
      });
    });
  }

  /**
   * ??????????????????
   * @return ????????????
   */
  getProps(): FieldProps & { [key: string]: any; } {
    const dsField = this.findDataSetField();
    const lovCode = this.get('lovCode');
    return merge(
      { lookupUrl: getConfig('lookupUrl') },
      Field.defaultProps,
      getPropsFromLovConfig(lovCode, 'textField'),
      getPropsFromLovConfig(lovCode, 'valueField'),
      dsField && dsField.props,
      this.props,
    );
  }


  /**
   * ??????????????????????????????
   * @param propsName ?????????
   * @return {any}
   */
  get(propsName: string): any {
    const prop = this.getProp(propsName);
    if (prop !== undefined) {
      return prop;
    }
    return Field.defaultProps[propsName];
  }

  private getProp(propsName: string): any {
    if (!['computedProps', 'dynamicProps'].includes(propsName)) {
      const computedProp = this.computedProps.get(propsName);
      if (computedProp) {
        const computedValue = computedProp.get();
        if (computedValue !== undefined) {
          return computedValue;
        }
      } else {
        const computedProps = this.get('computedProps');
        if (computedProps) {
          const newComputedProp = computed(() => {
            const computProp = computedProps[propsName];
            if (typeof computProp === 'function') {
              const prop = this.executeDynamicProps(computProp, propsName);
              if (prop !== undefined) {
                this.checkDynamicProp(propsName, prop);
                return prop;
              }
            }
          }, { name: propsName, context: this });
          this.computedProps.set(propsName, newComputedProp);
          const computedValue = newComputedProp.get();
          if (computedValue !== undefined) {
            return computedValue;
          }
        }
      }
      const dynamicProps = this.get('dynamicProps');
      if (dynamicProps) {
        if (typeof dynamicProps === 'function') {
          warning(
            false,
            ` The dynamicProps hook will be deprecated. Please use dynamicProps map.
              For e.g,
              Bad case:
              dynamicProps({ record }) {
                return {
                  bind: record.get('xx'),
                  label: record.get('yy'),
                }
              }
              Good case:
              dynamicProps = {
                bind({ record }) {
                  return record.get('xx')
                },
                label({ record }) {
                  return record.get('yy'),
                }
              }`,
          );
          const props = this.executeDynamicProps(dynamicProps, propsName);
          if (props && propsName in props) {
            const prop = props[propsName];
            this.checkDynamicProp(propsName, prop);
            return prop;
          }
        } else {
          const dynamicProp = dynamicProps[propsName];
          if (typeof dynamicProp === 'function') {
            const prop = this.executeDynamicProps(dynamicProp, propsName);
            if (prop !== undefined) {
              this.checkDynamicProp(propsName, prop);
              return prop;
            }
          }
        }
        this.checkDynamicProp(propsName, undefined);
      }
    }
    const value = get(this.props, propsName);
    if (value !== undefined) {
      return value;
    }
    const dsField = this.findDataSetField();
    if (dsField) {
      const dsValue = dsField.getProp(propsName);
      if (dsValue !== undefined) {
        return dsValue;
      }
    }
    if (propsName === 'textField' || propsName === 'valueField') {
      const lovCode = this.get('lovCode');
      const lovProps = getPropsFromLovConfig(lovCode, propsName);
      if (propsName in lovProps) {
        return lovProps[propsName];
      }
    }
    if (propsName === 'lookupUrl') {
      return getConfig(propsName);
    }
    if (['min', 'max'].includes(propsName)) {
      if (this.get('type') === FieldType.number) {
        if (propsName === 'max') {
          return MAX_SAFE_INTEGER;
        }
        return MIN_SAFE_INTEGER;
      }
    }
    return undefined;
  }

  /**
   * ???????????????
   * @param propsName ?????????
   * @param value ?????????
   * @return {any}
   */
  @action
  set(propsName: string, value: any): void {
    const oldValue = this.get(propsName);
    if (!isEqualDynamicProps(oldValue, value)) {
      if (!(propsName in this.dirtyProps)) {
        set(this.dirtyProps, propsName, oldValue);
      } else if (isSame(toJS(this.dirtyProps[propsName]), value)) {
        remove(this.dirtyProps, propsName);
      }
      set(this.props, propsName, value);
      const { record, dataSet, name } = this;
      if (record && propsName === 'type') {
        record.set(name, processValue(record.get(name), this));
      }
      if (dataSet) {
        dataSet.fireEvent(DataSetEvents.fieldChange, {
          dataSet,
          record,
          name,
          field: this,
          propsName,
          value,
          oldValue,
        });
      }
      this.handlePropChange(propsName, value, oldValue);
    }
  }

  /**
   * ??????lookup?????????lookup??????
   * @param value lookup???
   * @return {object}
   */
  getLookupData(value: any = this.getValue()): object {
    const valueField = this.get('valueField');
    const data = {};
    if (this.lookup) {
      return this.lookup.find(obj => isSameLike(get(obj, valueField), value)) || data;
    }
    return data;
  }

  getValue(): any {
    const { dataSet, name } = this;
    const record = this.record || (dataSet && dataSet.current);
    if (record) {
      return record.get(name);
    }
  }

  /**
   * ????????????lookup???????????????
   * @param value lookup???
   * @param boolean showValueIfNotFound
   * @return {string}
   */
  getLookupText(value: any = this.getValue(), showValueIfNotFound?: boolean): string | undefined {
    const textField = this.get('textField');
    const valueField = this.get('valueField');
    const { lookup } = this;
    if (lookup) {
      const found = lookup.find(obj => isSameLike(get(obj, valueField), value));
      if (found) {
        return get(found, textField);
      }
      if (showValueIfNotFound) {
        return value;
      }
      return undefined;
    }
  }

  /**
   * ????????????options???????????????
   * @param value opions???
   * @param boolean showValueIfNotFound
   * @return {string}
   */
  getOptionsText(value: any = this.getValue(), showValueIfNotFound?: boolean): string | undefined {
    const textField = this.get('textField');
    const valueField = this.get('valueField');
    const { options } = this;
    if (options) {
      const found = options.find(record => isSameLike(record.get(valueField), value));
      if (found) {
        return found.get(textField);
      }
      if (showValueIfNotFound) {
        return value;
      }
      return undefined;
    }
  }

  /**
   * ??????lookup?????????lookup??????
   * @param value lookup???
   * @param boolean showValueIfNotFound
   * @return {string}
   */
  getText(value: any = this.getValue(), showValueIfNotFound?: boolean): string | undefined {
    const { lookup } = this;
    if (lookup && !isObject(value)) {
      return this.getLookupText(value, showValueIfNotFound);
    }
    const options = this.get('options');
    const textField = this.get('textField');
    if (options) {
      const valueField = this.get('valueField');
      const found = options.find(record => isSameLike(record.get(valueField), value));
      if (found) {
        return found.get(textField);
      }
    }
    if (textField && isObject(value)) {
      if (isObservableObject(value)) {
        return get(value, textField);
      }
      return value[textField];
    }
    return value;
  }

  setOptions(options: DataSet): void {
    this.set('options', options);
  }

  getOptions(): DataSet | undefined {
    return this.options;
  }

  /**
   * ?????????????????????
   */
  @action
  reset(): void {
    Object.assign(this.props, this.dirtyProps);
    this.dirtyProps = {};
  }

  @action
  commit(): void {
    this.validator.reset();
  }

  /**
   * ????????????
   * @return true | false
   */
  get required(): boolean {
    return this.get('required');
  }

  /**
   * ??????????????????
   * @param required ????????????
   */
  set required(required: boolean) {
    this.set('required', required);
  }

  /**
   * ????????????
   * @return true | false
   */
  get readOnly(): boolean {
    return this.get('readOnly');
  }

  /**
   * ????????????
   * @return true | false
   */
  get disabled(): boolean {
    return this.get('disabled');
  }

  /**
   * ??????????????????
   * @param readOnly ????????????
   */
  set readOnly(readOnly: boolean) {
    this.set('readOnly', readOnly);
  }

  /**
   * ??????????????????
   * @param disabled ????????????
   */
  set disabled(disabled: boolean) {
    this.set('disabled', disabled);
  }

  /**
   * ??????????????????
   * @return ??????????????????
   */
  get type(): FieldType {
    return this.get('type');
  }

  /**
   * ??????????????????
   * @param type ????????????
   */
  set type(type: FieldType) {
    this.set('type', type);
  }

  /**
   * ??????Lov???????????????
   * @param {String} name
   * @param {Object} value
   */
  @action
  setLovPara(name, value) {
    const p = toJS(this.get('lovPara')) || {};
    if (value === null) {
      delete p[name];
    } else {
      p[name] = value;
    }
    this.set('lovPara', p);
  }

  getValidatorProps(): ValidatorProps | undefined {
    const { record, dataSet, name, type, required } = this;
    if (record) {
      const baseType = getBaseType(type);
      const customValidator = this.get('validator');
      const max = this.get('max');
      const min = this.get('min');
      const format = this.get('format') || getDateFormatByField(this, this.type);
      const pattern = this.get('pattern');
      const step = this.get('step');
      const nonStrictStep = this.get('nonStrictStep') === undefined ? getConfig('numberFieldNonStrictStep') : this.get('nonStrictStep');
      const minLength = baseType !== FieldType.string ? undefined : this.get('minLength');
      const maxLength = baseType !== FieldType.string ? undefined : this.get('maxLength');
      const label = this.get('label');
      const range = this.get('range');
      const multiple = this.get('multiple');
      const unique = this.get('unique');
      const defaultValidationMessages = this.get('defaultValidationMessages');
      const validatorProps = {
        type,
        required,
        record,
        dataSet,
        name,
        unique,
        customValidator,
        pattern,
        max: getLimit(max, record),
        min: getLimit(min, record),
        step,
        nonStrictStep,
        minLength,
        maxLength,
        label,
        range,
        multiple,
        format,
        defaultValidationMessages,
      };
      if (!this.validatorPropKeys.length) {
        this.validatorPropKeys = Object.keys(validatorProps);
      }
      return validatorProps;
    }
  }

  /**
   * ???????????????
   * ????????????record.getField()?????????field????????????
   * @return true | false
   */
  @action
  async checkValidity(report: boolean = true): Promise<boolean> {
    let valid = true;
    const { record, validator, name } = this;
    if (record) {
      validator.reset();
      const value = record.get(name);
      valid = await validator.checkValidity(value);
      if (report && !record.validating) {
        record.reportValidity(valid);
      }
    }
    return valid;
  }

  /**
   * ??????lookup???, ??????????????????????????????
   * @param noCache default: undefined
   * @return Promise<object[]>
   */
  async fetchLookup(noCache = undefined): Promise<object[] | undefined> {
    const batch = this.get('lookupBatchAxiosConfig') || getConfig('lookupBatchAxiosConfig');
    const lookupCode = this.get('lookupCode');
    const lovPara = getLovPara(this, this.record);
    const dsField = this.findDataSetField();
    let result;
    if (batch && lookupCode && Object.keys(lovPara).length === 0) {
      if (dsField && dsField.get('lookupCode') === lookupCode) {
        this.set('lookup', undefined);
        return dsField.get('lookup');
      }

      result = await this.pending.add<object[] | undefined>(
        lookupStore.fetchLookupDataInBatch(lookupCode, batch),
      );
    } else {
      const axiosConfig = lookupStore.getAxiosConfig(this, noCache);
      if (dsField && noCache === false) {
        const dsConfig = lookupStore.getAxiosConfig(dsField);
        if (
          dsConfig.url &&
          buildURLWithAxiosConfig(dsConfig) === buildURLWithAxiosConfig(axiosConfig)
        ) {
          this.set('lookup', undefined);
          return dsField.get('lookup');
        }
      }
      if (axiosConfig.url) {
        result = await this.pending.add<object[] | undefined>(
          lookupStore.fetchLookupData(axiosConfig),
        );
      }
    }
    if (result) {
      runInAction(() => {
        const { lookup } = this;
        this.set('lookup', result);
        const value = this.getValue();
        const valueField = this.get('valueField');
        if (value && valueField && lookup) {
          this.set(
            'lookupData',
            [].concat(value).reduce<object[]>((lookupData, v) => {
              const found = lookup.find(item => isSameLike(item[valueField], v));
              if (found) {
                lookupData.push(found);
              }
              return lookupData;
            }, []),
          );
        }
      });
    }
    return result;
  }

  async fetchLovConfig() {
    const lovCode = this.get('lovCode');
    if (lovCode) {
      await this.pending.add(lovCodeStore.fetchConfig(lovCode, this));
      if (this.type === FieldType.object || this.type === FieldType.auto) {
        const options = lovCodeStore.getLovDataSet(lovCode, this);
        if (options) {
          this.set('options', options);
        }
      }
    }
  }


  isValid() {
    return this.valid;
  }

  getValidationMessage() {
    return this.validator.validationMessage;
  }

  getValidityState(): Validity {
    return this.validator.validity;
  }

  getValidationErrorValues(): ValidationResult[] {
    return this.validator.validationResults;
  }

  ready(): Promise<any> {
    // const { options } = this;
    // return Promise.all([this.pending.ready(), options && options.ready()]);
    return this.pending.ready();
  }

  private findDataSetField(): Field | undefined {
    const { dataSet, name, record } = this;
    if (record && dataSet && name) {
      return dataSet.getField(name);
    }
  }

  private checkDynamicProp(propsName, newProp) {
    const oldProp = this.lastDynamicProps[propsName];
    if (!isEqualDynamicProps(oldProp, newProp)) {
      raf(action(() => {
        if (this.validatorPropKeys.includes(propsName) || propsName === 'validator') {
          this.validator.reset();
        }
        this.handlePropChange(propsName, newProp, oldProp);
      }));
    }
    this.lastDynamicProps[propsName] = newProp;
  }

  private handlePropChange(propsName, newProp, oldProp) {
    if (propsName === 'bind' && this.type !== FieldType.intl) {
      const { record } = this;
      if (record && !this.dirty) {
        if (newProp && oldProp) {
          record.init(newProp, record.get(oldProp));
        }
        if (oldProp) {
          record.init(oldProp, undefined);
        }
      }
      return;
    }
    if (
      [
        'type',
        'lookupUrl',
        'lookupCode',
        'lookupAxiosConfig',
        'lovCode',
        'lovQueryAxiosConfig',
        'lovPara',
        'cascadeMap',
        'lovQueryUrl',
        'optionsProps',
      ].includes(propsName)
    ) {
      this.set('lookupData', undefined);
      this.fetchLookup();
    }
    if (['lovCode', 'lovDefineAxiosConfig', 'lovDefineUrl', 'optionsProps'].includes(propsName)) {
      this.fetchLovConfig();
    }
  }

  private executeDynamicProps(dynamicProps: (DynamicPropsArguments) => any, propsName: string) {
    const { dataSet, name, record, dynamicPropsComputingChains } = this;
    if (dynamicPropsComputingChains.includes(propsName)) {
      warning(false, `Cycle dynamicProps execution of field<${name}>. [${dynamicPropsComputingChains.join(' -> ')} -> ${propsName}]`);
    } else if (dataSet) {
      dynamicPropsComputingChains.push(propsName);
      try {
        return dynamicProps({ dataSet, record, name });
      } catch (e) {
        warning(false, e.message);
      } finally {
        dynamicPropsComputingChains.pop();
      }
    }
  }
}
