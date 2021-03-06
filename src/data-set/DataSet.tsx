import { ReactNode } from 'react';
import {action, computed, get, IReactionDisposer, isArrayLike, observable, ObservableMap, runInAction, set, toJS} from 'mobx';
import axiosStatic, { AxiosInstance, AxiosPromise, AxiosRequestConfig } from 'axios';
import omit from 'lodash/omit';
import unionBy from 'lodash/unionBy';
import flatMap from 'lodash/flatMap';
import isNumber from 'lodash/isNumber';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isNil from 'lodash/isNil';
import defer from 'lodash/defer';
import isString from 'lodash/isString';
import isPlainObject from 'lodash/isPlainObject';
import debounce from 'lodash/debounce';
import warning from '../warning';
import { getConfig } from '../configure';
import localeContext, {$l} from '../locale-context';
import axios from '../axios';
import Record from './Record';
import Field, {FieldProps, Fields} from './Field';
import {
  adapterDataToJSON,
  arrayMove,
  axiosConfigAdapter,
  checkParentByInsert,
  doExport,
  exportExcel,
  findBindFieldBy,
  findRootParent,
  generateData,
  generateJSONData,
  generateResponseData,
  getFieldSorter,
  getOrderFields,
  getSpliceRecord,
  getSplitValue,
  isDirtyRecord,
  normalizeGroups,
  prepareForSubmit,
  prepareSubmitData,
  processExportValue,
  processIntlField,
  sliceTree,
  sortTree,
  useCascade,
  useSelected,
} from './utils';
import EventManager from '../event-manager';
import DataSetSnapshot from './DataSetSnapshot';
import {DataSetEvents, DataSetSelection, DataSetStatus, DataToJSON, ExportMode, FieldType, RecordStatus, SortOrder} from './enum';
import {
  DataSetExportStatus,
} from './enum';
import {Lang} from '../locale-context/enum';
import isEmpty from '../is-empty';
import * as ObjectChainValue from '../object-chain-value';
import Transport, {TransportProps} from './Transport';
import PromiseQueue from '../promise-queue';
import DataSetRequestError from './DataSetRequestError';
import defaultFeedback, {FeedBack} from './FeedBack';

function fixAxiosConfig(config: AxiosRequestConfig): AxiosRequestConfig {
  const { method } = config;
  if (method && method.toLowerCase() === 'get') {
    delete config.data;
  }
  return config;
}

const ALL_PAGE_SELECTION = '__ALL_PAGE_SELECTION__';  // TODO:Symbol

const QUERY_PARAMETER = '__QUERY_PARAMETER__';  // TODO:Symbol

export type DataSetChildren = { [key: string]: DataSet };

export type Events = { [key: string]: Function; };

export type Group = { name: string, value: any, records: Record[], subGroups: Group[]; };

export interface ValidationMessages {
  badInput?: ReactNode;
  patternMismatch?: ReactNode;
  rangeOverflow?: ReactNode;
  rangeUnderflow?: ReactNode;
  stepMismatch?: ReactNode;
  stepMismatchBetween?: ReactNode;
  tooLong?: ReactNode;
  tooShort?: ReactNode;
  typeMismatch?: ReactNode;
  valueMissing?: ReactNode;
  valueMissingNoLabel?: ReactNode;
  customError?: ReactNode;
  uniqueError?: ReactNode;
  unknown?: ReactNode;
}

export class ValidationResult {
  validationMessage?: ReactNode;

  injectionOptions?: object;

  value?: any;

  ruleName: keyof ValidationMessages;

  constructor(props: ValidationResult) {
    Object.assign(this, props);
  }
}


export interface RecordValidationErrors {
  field: Field;
  errors: ValidationResult[];
}

export interface ValidationErrors {
  record: Record;
  errors: RecordValidationErrors[];
}


export interface DataSetProps {
  /**
   * ????????????
   * @see children
   */
  id?: string;
  /**
   * ????????????ds???name??????????????????????????????submitUrl, queryUrl, tlsUrl?????????????????????
   * @see children
   */
  name?: string;
  /**
   * ?????????????????????????????????????????????????????????
   */
  primaryKey?: string;
  /**
   * ??????
   */
  lang?: Lang;
  /**
   * ?????????
   */
  fields?: FieldProps[];
  /**
   * ???????????????
   */
  queryFields?: FieldProps[];
  /**
   * ??????
   */
  events?: Events;
  /**
   * ???????????????
   */
  data?: object[];
  /**
   * ????????????????????????
   * @default false
   */
  autoQuery?: boolean;
  /**
   * ??????????????????????????????????????????????????????????????????
   * @default true
   */
  autoQueryAfterSubmit?: boolean;
  /**
   * ????????????????????????????????????autoQuery???false????????????????????????
   * @default false;
   */
  autoCreate?: boolean;
  /**
   * ????????????????????????
   * @default true;
   */
  autoLocateFirst?: boolean;
  /**
   * ???????????????????????????
   * @default true;
   */
  autoLocateAfterCreate?: boolean;
  /**
   * ????????????????????????????????????????????????
   * @default true;
   */
  autoLocateAfterRemove?: boolean;
  /**
   * ???????????????????????????????????????????????????
   * @default false;
   */
  validateBeforeQuery?: boolean;
  /**
   * ???????????????
   * @default "multiple"
   */
  selection?: DataSetSelection | false;
  /**
   * ?????????????????????????????????????????????????????????
   * @default true
   */
  modifiedCheck?: boolean;
  /**
   * ??????????????????????????????????????? ?????????????????????????????? modifiedCheckMessage
   * @default
   */
  modifiedCheckMessage?: ReactNode | any,
  /**
   * ????????????
   * @default 10
   */
  pageSize?: number;
  /**
   * ??????????????????????????????????????????
   */
  paging?: boolean | 'server';
  /**
   * ???????????????json?????????????????????key
   * @default "rows"
   */
  dataKey?: string;
  /**
   * ???????????????json?????????????????????key
   * @default "total"
   */
  totalKey?: string;
  /**
   * ?????????????????????
   */
  queryDataSet?: DataSet;
  /**
   * ????????????
   */
  queryParameter?: object;
  /**
   * ???????????????url
   */
  queryUrl?: string;
  /**
   * ?????????????????????url
   */
  submitUrl?: string;
  /**
   * ????????????????????????url
   */
  tlsUrl?: string;
  /**
   * ???????????????????????????url????????????????????????
   */
  validateUrl?: string;
  /**
   * ???????????????url
   */
  exportUrl?: string;
  /**
   * ????????????
   */
  exportMode?: ExportMode;
  /**
   * ?????????CRUD???????????????
   */
  transport?: TransportProps;
  /**
   * ????????????????????????????????????
   */
  feedback?: TransportProps;
  /**
   * ??????????????????, ??????????????????????????????????????????name?????????DataSet
   * @example
   * { name_1: 'ds-id-1', name_2: 'ds-id-2' }
   * { name_1: ds1, name_2: ds2 }
   * [ds1, ds2]
   */
  children?: { [key: string]: string | DataSet } | DataSet[];
  /**
   * ????????????????????????id?????????
   */
  idField?: string;
  /**
   * ???????????????????????????id?????????
   */
  parentField?: string;
  /**
   * ????????????????????????????????????????????????
   */
  expandField?: string;
  /**
   * ????????????????????????????????????????????????????????????????????????????????????checkbox
   */
  checkField?: string;
  /**
   * ???????????????????????????????????????????????????????????????
   * ????????????primaryKey?????????????????????unique???????????????
   * @default true
   */
  cacheSelection?: boolean;
  /**
   * ????????????axios
   */
  axios?: AxiosInstance;
  /**
   * ????????????json?????????
   * dirty - ???????????????????????????????????????????????????????????????????????????
   * selected - ??????????????????????????????????????????????????????
   * all - ??????????????????
   * normal - ????????????????????????????????????__status, __id???????????????
   * dirty-self - ???dirty??? ????????????????????????
   * selected-self - ???selected??? ????????????????????????
   * all-self - ???all??? ????????????????????????
   * normal-self - ???normal??? ????????????????????????
   * @default dirty
   */
  dataToJSON?: DataToJSON;
  /**
   * ??????????????????
   */
  cascadeParams?: (parent: Record, primaryKey?: string) => object;
}

export default class DataSet extends EventManager {
  static defaultProps: DataSetProps = {
    autoCreate: false,
    autoQuery: false,
    autoQueryAfterSubmit: true,
    autoLocateFirst: true,
    autoLocateAfterCreate: true,
    autoLocateAfterRemove: true,
    validateBeforeQuery: true,
    selection: DataSetSelection.multiple,
    modifiedCheck: true,
    pageSize: 10,
    paging: true,
    dataToJSON: DataToJSON.dirty,
    cascadeParams(parent, primaryKey) {
      if (primaryKey) {
        return { [primaryKey]: parent.get(primaryKey) };
      }
      return omit(parent.toData(), ['__dirty']);
    },
  };

  static defaultFeedback = defaultFeedback;

  id?: string;

  children: DataSetChildren = {};

  prepareForReport: { result?: boolean, timeout?: number } = {};

  @computed
  get queryParameter(): object {
    const queryParameterMap: ObservableMap<string, any> = this.getState(QUERY_PARAMETER);
    if (queryParameterMap) {
      return queryParameterMap.toPOJO();
    }
    return {};
  }

  set queryParameter(queryParameter: object) {
    this.setState(QUERY_PARAMETER, observable.map(queryParameter));
  }

  pending: PromiseQueue = new PromiseQueue();

  reaction: IReactionDisposer;

  originalData: Record[] = [];

  resetInBatch: boolean = false;

  validating: boolean = false;

  @observable parent?: DataSet;

  @observable name?: string;

  @observable parentName?: string;

  @observable records: Record[];

  @observable fields: Fields;

  @observable props: DataSetProps;

  @observable pageSize: number;

  @observable totalCount: number;

  @observable status: DataSetStatus;

  @observable exportStatus: DataSetExportStatus | undefined;

  @observable currentPage: number;

  @observable selection: DataSetSelection | false;

  @observable cachedSelected: Record[];

  @observable dataToJSON: DataToJSON;

  @observable state: ObservableMap<string, any>;

  @computed
  get isAllPageSelection(): boolean {
    return this.getState(ALL_PAGE_SELECTION) === true;
  }

  @computed
  get cascadeRecords(): Record[] {
    const { parent, parentName } = this;
    if (parent && parentName) {
      return parent.cascadeRecords.reduce<Record[]>((array, record) => array.concat(...(record.getCascadeRecordsIncludeDelete(parentName) || [])), []);
    }
    return this.records;
  }

  @computed
  get axios(): AxiosInstance {
    return this.props.axios || getConfig('axios') || axios;
  }

  @computed
  get dataKey(): string {
    const { dataKey = getConfig('dataKey') } = this.props;
    return dataKey;
  }

  @computed
  get totalKey(): string {
    return this.props.totalKey || getConfig('totalKey');
  }

  @computed
  get lang(): Lang {
    return get(this.props, 'lang') || localeContext.locale.lang;
  }

  set lang(lang: Lang) {
    runInAction(() => {
      set(this.props, 'lang', lang);
    });
  }

  get queryDataSet(): DataSet | undefined {
    return get(this.props, 'queryDataSet');
  }

  /**
   * ???????????????DataSet.
   * @param {DataSet} ds DataSet.
   */
  set queryDataSet(ds: DataSet | undefined) {
    runInAction(() => {
      set(this.props, 'queryDataSet', ds);
      if (ds) {
        // ??????????????????????????????create???mobx???????????????????????????defer
        ds.pending.add(
          new Promise<void>(reslove => {
            defer(() => {
              if (ds.records.length === 0) {
                ds.create();
              } else if (!ds.current) {
                ds.first();
              }
              reslove();
            });
          }),
        );
      }
    });
  }

  @computed
  get queryUrl(): string | undefined {
    return get(this.props, 'queryUrl') || (this.name && `/dataset/${this.name}/queries`);
  }

  /**
   * ???????????????Url.
   * @param {String} url ?????????Url.
   */
  set queryUrl(url: string | undefined) {
    runInAction(() => {
      set(this.props, 'queryUrl', url);
    });
  }

  @computed
  get submitUrl(): string | undefined {
    return get(this.props, 'submitUrl') || (this.name && `/dataset/${this.name}/mutations`);
  }

  /**
   * ???????????????Url.
   * @param {String} url ?????????Url.
   */
  set submitUrl(url: string | undefined) {
    runInAction(() => {
      set(this.props, 'submitUrl', url);
    });
  }

  @computed
  get tlsUrl(): string | undefined {
    return get(this.props, 'tlsUrl') || (this.name && `/dataset/${this.name}/languages`);
  }

  /**
   * ??????????????????Url.
   * @param {String} url ????????????Url.
   */
  set tlsUrl(url: string | undefined) {
    runInAction(() => {
      set(this.props, 'tlsUrl', url);
    });
  }

  @computed
  get validateUrl(): string | undefined {
    return get(this.props, 'validateUrl') || (this.name && `/dataset/${this.name}/validate`);
  }

  /**
   * ?????????????????????????????????url.
   * @param {String} url ???????????????????????????url.
   */
  set validateUrl(url: string | undefined) {
    runInAction(() => {
      set(this.props, 'validateUrl', url);
    });
  }

  @computed
  get exportUrl(): string | undefined {
    return get(this.props, 'exportUrl') || (this.name && `/dataset/${this.name}/export`);
  }

  /**
   * ?????????????????????url.
   * @param {String} url ???????????????????????????url.
   */
  set exportUrl(url: string | undefined) {
    runInAction(() => {
      set(this.props, 'exportUrl', url);
    });
  }

  /**
   * ????????????????????????????????????
   */
  get exportMode(): ExportMode {
    return this.props.exportMode || getConfig('exportMode') || ExportMode.server;
  }

  set transport(transport: Transport) {
    runInAction(() => {
      this.props.transport = transport instanceof Transport ? transport.props : transport;
    });
  }

  @computed
  get transport(): Transport {
    return new Transport(this.props.transport, this);
  }

  @computed
  get feedback(): FeedBack {
    return {
      ...getConfig('feedback'),
      ...this.props.feedback,
    };
  }

  @computed
  get data(): Record[] {
    return this.records.filter(record => !record.isRemoved);
  }

  set data(records: Record[]) {
    this.loadData(records);
  }

  @computed
  get dirtyRecords(): [Record[], Record[], Record[]] {
    const created: Record[] = [];
    const updated: Record[] = [];
    const destroyed: Record[] = [];
    this.all.forEach(record => {
      switch (record.status) {
        case RecordStatus.add:
          created.push(record);
          break;
        case RecordStatus.update:
          updated.push(record);
          break;
        case RecordStatus.delete:
          destroyed.push(record);
          break;
        default: {
          if (record.dirty) {
            updated.push(record);
          }
        }
      }
    });
    return [created, updated, destroyed];
  }

  /**
   * ????????????????????????
   * @return ?????????
   */
  @computed
  get created(): Record[] {
    return this.dirtyRecords[0];
  }

  /**
   * ????????????????????????
   * @return ?????????
   */
  @computed
  get updated(): Record[] {
    return this.dirtyRecords[1];
  }

  /**
   * ????????????????????????
   * @return ?????????
   */
  @computed
  get destroyed(): Record[] {
    return this.dirtyRecords[2];
  }

  /**
   * ????????????????????????
   * @return ?????????
   */
  @computed
  get selected(): Record[] {
    return this.currentSelected.concat(this.cachedSelected.filter(record => record.isSelected));
  }

  /**
   * ?????????????????????????????? ??? isAllPageSelection ??? true ?????????
   * @return ?????????
   */
  @computed
  get unSelected(): Record[] {
    return this.currentUnSelected.concat(this.cachedSelected.filter(record => !record.isSelected));
  }

  @computed
  get currentSelected(): Record[] {
    return this.records.filter(record => record.isSelected);
  }

  @computed
  get currentUnSelected(): Record[] {
    return this.records.filter(record => !record.isSelected);
  }


  @computed
  get totalPage(): number {
    return this.paging ? Math.ceil(this.totalCount / this.pageSize) : 1;
  }

  @computed
  get currentIndex(): number {
    const { current, pageSize, currentPage } = this;
    if (current) {
      const index = this.indexOf(current);
      if (index !== -1) {
        if (this.paging === 'server') {
          const currentParent = findRootParent(current);
          return this.treeData.findIndex((item) => item.index === currentParent.index);
        }
        return index + (currentPage - 1) * pageSize;
      }
    }
    return -1;
  }

  set currentIndex(index: number) {
    this.locate(index);
  }

  /**
   * ?????????
   */
  @computed
  get length(): number {
    return this.data.length;
  }

  get hasChildren(): boolean {
    return Object.keys(this.children).length > 0;
  }

  @computed
  get treeRecords(): Record[] {
    return sortTree(this.records.filter(record => !record.parent), getOrderFields(this.fields)[0]);
  }

  @computed
  get treeData(): Record[] {
    return sortTree(this.filter(record => !record.parent), getOrderFields(this.fields)[0]);
  }

  @computed
  get paging(): boolean | 'server' {
    const { idField, parentField, paging } = this.props;
    return (paging === `server`) && parentField && idField ? paging : (parentField === undefined || idField === undefined) && !!paging!;
  }

  set paging(paging) {
    runInAction(() => {
      this.props.paging = paging;
    });
  }

  @computed
  get groups() {
    return [...this.fields.entries()]
      .reduce<string[]>((arr, [name, field]) => {
        const group = field.get('group');
        if (isNumber(group)) {
          arr[group as number] = name;
        } else if (group === true && !arr[0]) {
          arr[0] = name;
        }
        return arr;
      }, [])
      .filter(group => group !== undefined);
  }

  @computed
  get groupedRecords(): Group[] {
    const { groups, records } = this;
    return normalizeGroups(groups, records);
  }

  @computed
  get groupedTreeRecords(): Group[] {
    const { groups, treeRecords } = this;
    return normalizeGroups(groups, treeRecords);
  }

  /**
   * ???????????????????????????
   * @return record ??????
   */
  @computed
  get current(): Record | undefined {
    return (
      this.data.find(record => record.isCurrent) ||
      this.cachedSelected.find(record => record.isCurrent)
    );
  }

  /**
   * ??????????????????????????????
   * @param record ??????
   */
  set current(record: Record | undefined) {
    const currentRecord = this.current;
    if (currentRecord !== record && (!record || !record.isCached)) {
      runInAction(() => {
        if (currentRecord) {
          currentRecord.isCurrent = false;
        }
        if (record && record.dataSet === this) {
          record.isCurrent = true;
        }
        this.fireEvent(DataSetEvents.indexChange, {
          dataSet: this,
          record,
          previous: currentRecord,
        });
      });
    }
  }

  @computed
  get uniqueKeys(): string[] | undefined {
    const { primaryKey } = this.props;
    if (primaryKey) {
      return [primaryKey];
    }
    const keys: string[] = [];
    [...this.fields.entries()].forEach(([key, field]) => {
      if (field.get('unique')) {
        keys.push(key);
      }
    });
    if (keys.length) {
      return keys;
    }
    return undefined;
  }

  @computed
  get cacheSelectionKeys(): string[] | undefined {
    const { cacheSelection, selection } = this.props;
    if (cacheSelection && selection === DataSetSelection.multiple) {
      return this.uniqueKeys;
    }
    return undefined;
  }

  /**
   * ?????????????????????????????????????????????
   * @param index ??????
   * @returns {Record}
   */
  @computed
  get all(): Record[] {
    if (this.isAllPageSelection) {
      return this.records;
    }
    return this.records.concat(this.cachedSelected.slice());
  }

  @computed
  get dirty(): boolean {
    return this.records.some(isDirtyRecord);
  }

  private inBatchSelection: boolean = false;

  private syncChildrenRemote = debounce((remoteKeys: string[], current: Record) => {
    const { children } = this;
    remoteKeys.forEach(childName => this.syncChild(children[childName], current, childName));
  }, 300);

  constructor(props?: DataSetProps) {
    super();
    runInAction(() => {
      props = { ...DataSet.defaultProps, ...props } as DataSetProps;
      this.props = props;
      const {
        data,
        fields,
        queryFields,
        queryDataSet,
        autoQuery,
        autoCreate,
        pageSize,
        selection,
        events,
        id,
        name,
        children,
        queryParameter = {},
        dataToJSON,
      } = props;
      this.name = name;
      this.dataToJSON = dataToJSON!;
      this.records = [];
      this.state = observable.map<string, any>();
      this.fields = observable.map<string, Field>();
      this.totalCount = 0;
      this.status = DataSetStatus.ready;
      this.currentPage = 1;
      this.cachedSelected = [];
      this.queryParameter = queryParameter;
      this.pageSize = pageSize!;
      this.selection = selection!;
      this.processListener();
      if (id) {
        this.id = id;
      }
      if (children) {
        this.initChildren(children);
      }
      if (events) {
        this.initEvents(events);
      }
      if (fields) {
        this.initFields(fields);
      }
      this.initQueryDataSet(queryDataSet, queryFields);
      if (data) {
        const { length } = data;
        if (length) {
          this.loadData(data, length);
        }
      }
      // ssr do not auto query
      if (autoQuery && typeof window !== 'undefined') {
        this.query();
      } else if (autoCreate && this.records.length === 0) {
        this.create();
      }
    });
  }

  processListener() {
    this.addEventListener(DataSetEvents.indexChange, this.handleCascade);
  }

  destroy() {
    this.clear();
  }

  @action
  setState(item: string | object, value?: any) {
    if (isString(item)) {
      this.state.set(item, value);
    } else if (isPlainObject(item)) {
      this.state.merge(item);
    }
    return this;
  }

  getState(key: string) {
    return this.state.get(key);
  }

  snapshot(): DataSetSnapshot {
    return new DataSetSnapshot(this);
  }

  @action
  restore(snapshot: DataSetSnapshot): DataSet {
    if (snapshot.dataSet !== this) {
      this.events = {};
    } else if (snapshot.events) {
      this.events = snapshot.events;
    }
    this.records = snapshot.records;
    this.originalData = snapshot.originalData;
    this.totalCount = snapshot.totalCount;
    this.currentPage = snapshot.currentPage;
    this.pageSize = snapshot.pageSize;
    this.cachedSelected = snapshot.cachedSelected;
    this.dataToJSON = snapshot.dataToJSON;
    this.children = snapshot.children;
    this.current = snapshot.current;
    return this;
  }

  @action
  setAllPageSelection(enable: boolean) {
    if (this.selection === DataSetSelection.multiple) {
      if (enable) {
        this.currentSelected.forEach(record => record.isSelected = false);
      } else {
        this.currentUnSelected.forEach(record => record.isSelected = true);
      }
      this.clearCachedSelected();
      this.setState(ALL_PAGE_SELECTION, enable);
      if (enable) {
        this.records.forEach((record) => {
          if (!record.selectable) {
            record.isSelected = false;
          }
        });
      }
    }
  }

  toData(): object[] {
    return generateData(this.records).data;
  }

  /**
   * ???????????????????????????
   * @param isSelected
   * @param noCascade
   */
  toJSONData(isSelected?: boolean, noCascade?: boolean): object[] {
    const dataToJSON = adapterDataToJSON(isSelected, noCascade) || this.dataToJSON;
    const records = useSelected(dataToJSON) ? this.selected : this.records;
    return generateJSONData(this, records).data;
  }

  /**
   * ??????????????????????????????????????????
   * @returns Promise
   */
  ready(isSelect?: boolean): Promise<any> {
    return Promise.all([
      this.pending.ready(),
      ...(isSelect || useSelected(this.dataToJSON) ? this.selected : this.data).map(record =>
        record.ready(),
      ),
      ...[...this.fields.values()].map(field => field.ready()),
    ]);
  }

  /**
   * ????????????
   * @param page ??????
   * @param params ????????????
   * @return Promise
   */
  query(page?: number, params?: object, append?: boolean): Promise<any> {
    return this.pending.add(this.doQuery(page, params, append));
  }

  /**
   * ?????????????????????????????????????????????????????????????????????
   * @param page ??????
   * @param params ????????????
   * @return Promise
   */
  queryMore(page?: number, params?: object): Promise<any> {
    return this.pending.add(this.doQueryMore(page, params));
  }

  async doQuery(page?: number, params?: object, append?: boolean): Promise<any> {
    const data = await this.read(page, params);
    this.loadDataFromResponse(data, append);
    return data;
  }

  async doQueryMore(page, params?: object): Promise<any> {
    const data = await this.read(page, params);
    this.appendDataFromResponse(data);
    return data;
  }

  /**
   * TODO ????????????
   * ??????????????????????????????????????????????????????
   * @param isSelect ?????????true???????????????????????????
   * @param noCascade ?????????true???????????????????????????
   * @return Promise
   */
  async submit(isSelect?: boolean, noCascade?: boolean): Promise<any> {
    const dataToJSON = adapterDataToJSON(isSelect, noCascade) || this.dataToJSON;
    await this.ready();
    if (await this.validate()) {
      return this.pending.add(
        this.write(useSelected(dataToJSON) ? this.selected : this.records),
      );
    }
    return false;
  }

  /**
   * ????????????
   * @param object columns ????????????
   * @param number exportQuantity ????????????
   */
  async export(columns: any = {}, exportQuantity: number = 0): Promise<void | any[]> {
    if (this.checkReadable(this.parent) && (await this.ready())) {
      const data = await this.generateQueryParameter();
      data._HAP_EXCEL_EXPORT_COLUMNS = columns;
      const { totalCount, totalKey } = this;
      const params = { _r: Date.now(), ...this.generateOrderQueryString() };
      ObjectChainValue.set(params, totalKey, totalCount);
      const newConfig = axiosConfigAdapter('exports', this, data, params);
      if (newConfig.url) {
        if (
          (await this.fireEvent(DataSetEvents.export, {
            dataSet: this,
            params: newConfig.params,
            data: newConfig.data,
          })) !== false
        ) {
          const ExportQuantity = exportQuantity > 1000 ? 1000 : exportQuantity;
          if (this.exportMode !== ExportMode.client) {
            doExport(this.axios.getUri(newConfig), newConfig.data, newConfig.method);
          } else {
            return this.doClientExport(data, ExportQuantity, false);
          }
        }
      } else {
        warning(false, 'Unable to execute the export method of dataset, please check the ');
      }
    }
  }

  /**
   * ?????????json????????????ds????????????????????????????????????????????????
   * @param result ??????????????????
   * @param columnsExport ????????????
   */
  displayDataTransform(result: any[], columnsExport) {
    const newResult: any[] = [];
    if (result && result.length > 0) {
      // check: ???????????????????????????????????????record ???demo??????????????????
      // toJS(this.processData(result)).map((item) => item.data);
      const processData = result;
      processData.forEach((itemValue) => {
        const dataItem = {};
        const columnsExportkeys = Object.keys(columnsExport);
        for (let i = 0; i < columnsExportkeys.length; i += 1) {
          const firstRecord = this.records[0] || this;
          const exportField = firstRecord.getField(columnsExportkeys[i]);
          let processItemValue = getSplitValue(toJS(itemValue), columnsExportkeys[i]);
          // ??????bind ??????
          if (exportField && isNil(processItemValue) && exportField.get('bind')) {
            processItemValue = getSplitValue(
              getSplitValue(toJS(itemValue), exportField.get('bind')),
              columnsExportkeys[i],
              true,
            );
          }
          dataItem[columnsExportkeys[i]] = processExportValue(processItemValue, exportField);
        }
        newResult.push(dataItem);
      });
    }
    return newResult;
  }

  /**
   * ?????????????????????
   * @param data ????????????
   * @param quantity ????????????????????????
   * @param isFile ?????????????????????
   */
  @action
  private async doClientExport(data: any, quantity: number, isFile: boolean = true): Promise<any[] | void> {
    const columnsExport = data._HAP_EXCEL_EXPORT_COLUMNS;
    delete data._HAP_EXCEL_EXPORT_COLUMNS;
    const { totalCount } = this;
    runInAction(() => {
      this.exportStatus = DataSetExportStatus.start;
    });
    let newResult: any[] = [];
    if (totalCount > 0) {
      const queryTime = Math.ceil(totalCount / quantity);
      const queryExportList: AxiosPromise<any>[] = [];
      for (let i = 0; i < queryTime; i++) {
        const params = { ...this.generateQueryString(1 + i, quantity) };
        const newConfig = axiosConfigAdapter('read', this, data, params);
        queryExportList.push(this.axios(newConfig));
        runInAction(() => {
          this.exportStatus = DataSetExportStatus.exporting;
        });
      }
      return Promise.all(queryExportList).then((resultValue) => {
        const reducer = (accumulator: any[], currentValue: any[]) => [...accumulator, ...currentValue];
        const todataList = (item) => item ? item[this.dataKey] : [];
        runInAction(() => {
          this.exportStatus = DataSetExportStatus.progressing;
        });
        const exportAlldate = resultValue.map(todataList).reduce(reducer);
        newResult = this.displayDataTransform(exportAlldate, columnsExport);
        newResult.unshift(columnsExport);
        runInAction(() => {
          this.exportStatus = DataSetExportStatus.success;
        });
        if (isFile) {
          exportExcel(newResult, this.name);
        } else {
          return newResult;
        }
      }).catch(() => {
        runInAction(() => {
          this.exportStatus = DataSetExportStatus.failed;
        });
      });
    }
  }

  /**
   * ????????????
   */
  @action
  reset(): DataSet {
    this.resetInBatch = true;
    this.records = this.originalData.map(record => record.reset());
    this.resetInBatch = false;
    if (this.props.autoCreate && this.records.length === 0) {
      this.create();
    }
    this.fireEvent(DataSetEvents.reset, { dataSet: this, records: this.records });
    return this;
  }

  /**
   * ??????????????????????????????paging???true???`server`????????????????????????????????????Tree ?????????server?????? ???????????????????????????index????????????index??????1
   * @param page ??????
   * @return Promise
   */
  page(page: number): Promise<any> {
    if (page > 0 && this.paging) {
      return this.locate((page - 1) * this.pageSize + this.created.length - this.destroyed.length);
    }
    warning(page > 0, 'Page number is incorrect.');
    warning(!!this.paging, 'Can not paging query util the property<paging> of DataSet is true or `server`.');
    return Promise.resolve();
  }

  /**
   * ?????????????????????????????????????????????
   * @param message ?????????????????????confirm?????????
   * @return Promise
   */
  modifiedCheck(message?: ReactNode | any): Promise<boolean> {
    const { modifiedCheck, modifiedCheckMessage } = this.props;
    if (!modifiedCheck || !this.dirty) {
      return Promise.resolve(true);
    }
    return getConfig('confirm')(message || modifiedCheckMessage || $l('DataSet', 'unsaved_data_confirm'))
      .then(result => result !== false);
  }

  /**
   * ????????????
   * @param index ??????
   * @return Promise
   */
  async locate(index: number): Promise<Record | undefined> {
    const { paging, pageSize, totalCount } = this;
    const { autoLocateFirst } = this.props;
    let currentRecord = this.findInAllPage(index);
    if (currentRecord) {
      this.current = currentRecord;
      return currentRecord;
    }
    if (paging === true || paging === 'server') {
      if (index >= 0 && index < totalCount + this.created.length - this.destroyed.length) {
        if (await this.modifiedCheck()) {
          await this.query(Math.floor(index / pageSize) + 1);
          currentRecord = this.findInAllPage(index);
          if (currentRecord) {
            this.current = autoLocateFirst ? currentRecord : undefined;
            return currentRecord;
          }
        }
      }
    }
    warning(false, 'Located index of Record is out of boundary.');
    return Promise.resolve(undefined);
  }

  /**
   * ????????????????????????
   * @return Promise
   */
  first(): Promise<Record | undefined> {
    return this.locate(0);
  }

  /**
   * ???????????????????????????
   * @return Promise
   */
  last(): Promise<Record | undefined> {
    return this.locate((this.paging ? this.totalCount : this.length) - 1);
  }

  /**
   * ???????????????????????????????????????
   * ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   * @return Promise
   */
  pre(): Promise<Record | undefined> {
    return this.locate(this.currentIndex - 1);
  }

  /**
   * ???????????????????????????????????????
   * ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   * @return Promise
   */
  next(): Promise<Record | undefined> {
    return this.locate(this.currentIndex + 1);
  }

  /**
   * ???????????????
   * @return Promise
   */
  firstPage(): Promise<any> {
    return this.page(1);
  }

  /**
   * ??????????????????
   * @return Promise
   */
  prePage(): Promise<any> {
    return this.page(this.currentPage - 1);
  }

  /**
   * ??????????????????
   * @return Promise
   */
  nextPage(): Promise<any> {
    return this.page(this.currentPage + 1);
  }

  /**
   * ???????????????
   * @return Promise
   */
  lastPage(): Promise<any> {
    return this.page(this.totalPage);
  }

  /**
   * ??????????????????
   * @param data ????????????
   * @param dataIndex ?????????????????????
   * @return ???????????????
   */
  @action
  create(data: object = {}, dataIndex?: number): Record {
    if (data === null) {
      data = {};
    }
    const record = new Record(data, this);
    const objectFieldsList: [string, any][][] = [];
    const normalFields: [string, any][] = [];
    [...record.fields.entries()].forEach(([name, field]) => {
      const fieldDefaultValue = field.get('defaultValue');
      const multiple = field.get('multiple');
      const defaultValue = multiple && isNil(fieldDefaultValue) ? [] : fieldDefaultValue;
      if (!isNil(defaultValue) && isNil(record.get(name))) {
        const type = field.get('type');
        if (type === FieldType.object) {
          const level = name.split('.').length - 1;
          objectFieldsList[level] = (objectFieldsList[level] || []).concat([[name, defaultValue]]);
        } else {
          normalFields.push([name, defaultValue]);
        }
      }
    });
    [...objectFieldsList, normalFields].forEach((items) => {
      if (items) {
        items.forEach(([name, defaultValue]) => record.init(name, toJS(defaultValue)));
      }
    });
    if (isNumber(dataIndex)) {
      this.splice(dataIndex, 0, record);
    } else {
      this.push(record);
    }
    if (this.props.autoLocateAfterCreate) {
      this.current = record;
    }
    this.fireEvent(DataSetEvents.create, { dataSet: this, record });
    return record;
  }

  /**
   * ??????????????????
   * @param records ?????????????????????????????????????????????
   * @param confirmMessage ??????????????????????????????
   * @return Promise
   */
  async delete(
    records?: Record | Record[],
    confirmMessage?: ReactNode | any,
  ): Promise<any> {
    if (records) {
      records = ([] as Record[]).concat(records);
      if (
        records.length > 0 &&
        (await this.fireEvent(DataSetEvents.beforeDelete, { dataSet: this, records })) !== false &&
        (confirmMessage === false || (await getConfig('confirm')(confirmMessage && confirmMessage !== true ? confirmMessage : $l('DataSet', 'delete_selected_row_confirm'))) !== false)
      ) {
        this.remove(records, false);
        const res = await this.pending.add(this.write(this.destroyed, true));
        // ??????????????????
        const { current } = this;
        if (current) {
          let record;
          if (this.props.autoLocateAfterRemove) {
            record = this.get(0);
            if (record) {
              runInAction(() => {
                record.isCurrent = true;
              });
            }
          }
          if (current !== record) {
            this.fireEvent(DataSetEvents.indexChange, { dataSet: this, record, previous: current });
          }
        }
        return res;
      }
    }
  }


  /**
   * ??????????????????
   * @param records ????????????????????????
   * @param locate ??????????????????????????????
   */
  @action
  remove(records?: Record | Record[], locate?: Boolean): void {
    if (records) {
      const data = isArrayLike(records) ? records.slice() : [records];
      if (data.length && this.fireEventSync(DataSetEvents.beforeRemove, { dataSet: this, records: data }) !== false) {
        const { current } = this;
        data.forEach(this.deleteRecord, this);
        this.fireEvent(DataSetEvents.remove, { dataSet: this, records: data });
        if (!this.current) {
          let record;
          if (locate !== false && this.props.autoLocateAfterRemove) {
            record = this.get(0);
            if (record) {
              record.isCurrent = true;
            }
          }
          if (locate !== false && current !== record) {
            this.fireEvent(DataSetEvents.indexChange, { dataSet: this, record, previous: current });
          }
        }
      }
    }
  }

  /**
   * ????????????????????????
   */
  @action
  removeAll() {
    const { current, data } = this;
    if (data.length) {
      data.forEach(this.deleteRecord, this);
      this.fireEvent(DataSetEvents.remove, { dataSet: this, records: data });
      if (current) {
        this.fireEvent(DataSetEvents.indexChange, { dataSet: this, previous: current });
      }
    }
  }

  /**
   * ??????????????????
   * @param confirmMessage ??????????????????????????????
   */
  @action
  async deleteAll(confirmMessage?: ReactNode | any) {
    if (
      this.records.length > 0 &&
      (confirmMessage === false || (await getConfig('confirm')(confirmMessage && confirmMessage !== true ? confirmMessage : $l('DataSet', 'delete_all_row_confirm'))) !== false)
    ) {
      this.removeAll();
      return this.pending.add(this.write(this.destroyed, true));
    }
  }

  /**
   * ?????????????????????????????????????????????
   * @param records ?????????
   * @return ????????????
   */
  @action
  push(...records: Record[]): number {
    checkParentByInsert(this);
    return this.records.push(...this.transferRecords(records));
  }

  /**
   * ?????????????????????????????????????????????
   * @param records ?????????
   * @return ????????????
   */
  @action
  unshift(...records: Record[]): number {
    checkParentByInsert(this);
    return this.records.unshift(...this.transferRecords(records));
  }

  /**
   * ?????????????????????????????????
   * @return ??????
   */
  @action
  pop(): Record | undefined {
    return this.deleteRecord(this.data.pop());
  }

  /**
   * ?????????????????????????????????
   * @return ??????
   */
  @action
  shift(): Record | undefined {
    return this.deleteRecord(this.data.shift());
  }

  /**
   * ???????????????????????????????????????????????????????????????
   * @param from ?????????????????????
   * @default 0
   * @param deleteCount ???????????????
   * @default 0
   * @param records ????????????????????????
   * @return ?????????????????????
   */
  @action
  splice(from: number, deleteCount: number, ...items: Record[]): (Record | undefined)[] {
    const fromRecord = this.get(from);
    const deleted = this.slice(from, from + deleteCount).map(this.deleteRecord, this);
    if (items.length) {
      checkParentByInsert(this);
      const { records } = this;
      const spliceRecord = getSpliceRecord(records, items, fromRecord);
      const transformedRecords = this.transferRecords(items);
      if (spliceRecord) {
        records.splice(records.indexOf(spliceRecord), 0, ...transformedRecords);
      } else {
        records.push(...transformedRecords);
      }
    }
    return deleted;
  }
  /**
   * ?????????????????????
   */
  move(from: number, to: number) {
    arrayMove(this.records, from, to);
  }

  /**
   * ???????????????????????????????????????????????????????????????
   * @param start ????????????
   * @default 0
   * @param end ????????????
   * @default ??????????????????
   * @return ?????????????????????
   */
  slice(start: number = 0, end: number = this.length): Record[] {
    return this.data.slice(start, end);
  }

  /**
   * ???????????????????????????
   * @param record ??????
   * @param fromIndex ?????????????????????
   * @return ??????
   */
  indexOf(record: Record, fromIndex?: number): number {
    return this.data.indexOf(record, fromIndex);
  }

  /**
   * ????????????????????????
   * @param fn ????????????
   * @returns ??????
   */
  find(fn: (record: Record, index: number, array: Record[]) => boolean): Record | undefined {
    return this.data.find(fn);
  }

  /**
   * ???????????????????????????????????????
   * @param fn ????????????
   * @returns ??????
   */
  findIndex(fn: (record: Record, index: number, array: Record[]) => boolean): number {
    return this.data.findIndex(fn);
  }

  /**
   * ??????????????????
   * @param fn ????????????
   * @param thisArg this??????
   */
  forEach(fn: (record: Record, index: number, array: Record[]) => void, thisArg?: any): void {
    this.data.forEach(fn, thisArg);
  }

  /**
   * ????????????????????????????????????
   * @param fn ????????????
   * @param thisArg this??????
   * @returns ???????????????
   */
  map<U>(fn: (record: Record, index: number, array: Record[]) => U, thisArg?: any): U[] {
    return this.data.map(fn, thisArg);
  }

  /**
   * ???????????????????????????????????????true????????????true
   * @param fn ????????????
   * @param thisArg this??????
   * @returns boolean
   */
  some(fn: (record: Record, index: number, array: Record[]) => boolean, thisArg?: any): boolean {
    return this.data.some(fn, thisArg);
  }

  /**
   * ???????????????????????????????????????false????????????false
   * @param fn ????????????
   * @param thisArg this??????
   * @returns boolean
   */
  every(fn: (record: Record, index: number, array: Record[]) => boolean, thisArg?: any): boolean {
    return this.data.every(fn, thisArg);
  }

  /**
   * ????????????????????????????????????
   * @param fn ????????????
   * @param thisArg this??????
   * @returns {Record[]}
   */
  filter(fn: (record: Record, index: number, array: Record[]) => boolean, thisArg?: any): Record[] {
    return this.data.filter(fn, thisArg);
  }

  /**
   * ????????????????????????????????????????????????????????? ????????????????????????????????????????????????????????????????????????????????????????????????
   * @param fn ????????????
   * @param initialValue ?????????
   * @returns {U}
   */
  reduce<U>(
    fn: (previousValue: U, record: Record, index: number, array: Record[]) => U,
    initialValue: U,
  ): U {
    return this.data.reduce<U>(fn, initialValue);
  }

  /**
   * ???????????????????????????????????????????????????????????? ????????????????????????????????????????????????????????????????????????????????????????????????
   * @param fn ????????????
   * @param initialValue ?????????
   * @returns {U}
   */
  reduceRight<U>(
    fn: (previousValue: U, record: Record, index: number, array: Record[]) => U,
    initialValue: U,
  ): U {
    return this.data.reduceRight<U>(fn, initialValue);
  }

  /**
   * ????????????????????????
   */
  @action
  reverse(): Record[] {
    return (this.records = this.records.reverse());
  }

  /**
   * ???????????????
   * ????????????????????????
   * @param fieldName
   */
  @action
  sort(fieldName: string): void {
    const field = this.getField(fieldName);
    if (field) {
      const currents = getOrderFields(this.fields);
      currents.forEach(current => {
        if (current !== field) {
          current.order = undefined;
        }
      });
      switch (field.order) {
        case SortOrder.asc:
          field.order = SortOrder.desc;
          break;
        case SortOrder.desc:
          field.order = undefined;
          break;
        default:
          field.order = SortOrder.asc;
      }
      if (this.paging || !field.order) {
        this.query();
      } else {
        this.records = this.records.sort(getFieldSorter(field));
      }
    }
  }

  /**
   * ????????????
   * @param recordOrIndex ?????????????????????
   */
  @action
  select(recordOrIndex: Record | number): void {
    const { selection } = this;
    if (selection) {
      let record: Record | undefined = recordOrIndex as Record;
      if (isNumber(recordOrIndex)) {
        record = this.get(recordOrIndex as number);
      }
      if (record && record.selectable && !record.isSelected) {
        let previous: Record | undefined;
        if (selection === DataSetSelection.single) {
          this.selected.forEach((selected: Record) => {
            selected.isSelected = false;
            previous = selected;
          });
        }
        record.isSelected = true;
        if (!this.inBatchSelection) {
          if (this.isAllPageSelection) {
            const cachedIndex = this.cachedSelected.indexOf(record);
            if (cachedIndex !== -1) {
              this.cachedSelected.splice(cachedIndex, 1);
            }
          }
          this.fireEvent(DataSetEvents.select, { dataSet: this, record, previous });
        }
      }
    }
  }

  /**
   * ??????????????????
   * @param recordOrIndex ?????????????????????
   */
  @action
  unSelect(recordOrIndex: Record | number): void {
    if (this.selection) {
      let record: Record | undefined = recordOrIndex as Record;
      if (isNumber(recordOrIndex)) {
        record = this.get(recordOrIndex as number);
      }
      if (record && record.selectable && record.isSelected) {
        record.isSelected = false;
        if (!this.inBatchSelection) {
          if (!this.isAllPageSelection) {
            const cachedIndex = this.cachedSelected.indexOf(record);
            if (cachedIndex !== -1) {
              this.cachedSelected.splice(cachedIndex, 1);
            }
          }
          this.fireEvent(DataSetEvents.unSelect, { dataSet: this, record });
        }
      }
    }
  }

  /**
   * ??????
   */
  @action
  selectAll(filter?: (record: Record) => boolean): void {
    const { selection } = this;
    if (selection) {
      this.inBatchSelection = true;
      if (selection === DataSetSelection.single) {
        if (!this.currentSelected.length) {
          this.select(filter ? this.filter(filter)[0] : 0);
        }
      } else {
        this.records.forEach(record => {
          if (!filter || filter(record) !== false) {
            this.select(record);
          }
        });
      }

      this.fireEvent(DataSetEvents.selectAll, { dataSet: this });
      this.inBatchSelection = false;
    }
  }

  /**
   * ????????????
   */
  @action
  unSelectAll(): void {
    if (this.selection) {
      this.inBatchSelection = true;
      this.currentSelected.forEach(record => {
        this.unSelect(record);
      });
      this.fireEvent(DataSetEvents.unSelectAll, { dataSet: this });
      this.inBatchSelection = false;
    }
  }

  clearCachedSelected(): void {
    this.setCachedSelected([]);
  }

  @action
  setCachedSelected(cachedSelected: Record[]): void {
    this.cachedSelected = cachedSelected;
  }

  /**
   * ???????????????????????????
   * @param index ??????
   * @returns {Record}
   */
  get(index: number): Record | undefined {
    const { data } = this;
    return data.length ? data[index] : undefined;
  }

  /**
   * ??????????????????????????????????????????????????????
   * @param index ??????
   * @returns {Record}
   */
  getFromTree(index: number): Record | undefined {
    const { treeData } = this;
    return treeData.length ? treeData[index] : undefined;
  }

  /**
   * ???????????????????????????????????????????????????
   * @deprecated
   * @return true | false
   */
  isModified(): boolean {
    return this.dirty;
  }

  /**
   * ??????????????????????????????
   * @param page ??????page????????????paging???server????????????????????????????????????
   * @return ?????????
   */

  /**
   * ????????????ID????????????
   * @param id ??????ID
   * @return ??????
   */
  findRecordById(id: number | string): Record | undefined {
    if (id !== undefined) {
      return this.records.find(record => String(record.id) === String(id));
    }
  }

  /**
   * ?????????????????????????????? ???????????????????????????
   * @param isSelected ???????????????????????????
   * @param noCascade ??????????????????
   * @return true | false
   */
  async validate(isSelected?: boolean, noCascade?: boolean): Promise<boolean> {
    this.validating = true;
    try {
      const dataToJSON = adapterDataToJSON(isSelected, noCascade) || this.dataToJSON;
      const cascade =
        noCascade === undefined && dataToJSON ? useCascade(dataToJSON) : !noCascade;
      const validateResult = Promise.all(
        (useSelected(dataToJSON) ? this.selected : this.data).map(record =>
          record.validate(false, !cascade),
        ),
      ).then(results => results.every(result => result));
      this.reportValidityImmediately(validateResult);
      return await validateResult;
    } finally {
      this.validating = false;
    }
  }

  reportValidityImmediately(result: Promise<boolean>) {
    this.fireEvent(DataSetEvents.validate, { dataSet: this, result });
  }

  reportValidity(result: boolean) {
    const { prepareForReport } = this;
    if (!result) {
      prepareForReport.result = result;
    }
    if (prepareForReport.timeout) {
      window.clearTimeout(prepareForReport.timeout);
    }
    prepareForReport.timeout = window.setTimeout(() => {
      this.reportValidityImmediately(Promise.resolve(prepareForReport.result || true));
      this.prepareForReport = {};
    }, 200);
  }

  getValidationErrors(): ValidationErrors[] {
    const { dataToJSON } = this;
    return (useSelected(dataToJSON) ? this.selected : this.data).reduce<ValidationErrors[]>((results, record) => {
      const validationResults = record.getValidationErrors();
      if (validationResults.length) {
        results.push({
          record,
          errors: validationResults,
        });
      }
      return results;
    }, []);
  }

  /**
   * ???????????????????????????
   * @param fieldName ?????????
   * @returns ??????
   */
  getField(fieldName?: string): Field | undefined {
    if (fieldName) {
      return this.fields.get(fieldName);
    }
  }

  /**
   * ?????????????????????
   * @returns ???????????????
   */
  getGroups(): string[] {
    return this.groups;
  }

  initFields(fields: FieldProps[]): void {
    fields.forEach(field => {
      const { name } = field;
      if (name) {
        this.addField(name, field);
      } else {
        warning(
          false,
          'DataSet create field failed. Please check if property name is exists on field.',
        );
      }
    });
  }

  /*
   * ???????????????
   * @param name ?????????
   * @param field ????????????
   * @return ????????????
   */
  @action
  addField(name: string, fieldProps: FieldProps = {}): Field {
    return processIntlField(
      name,
      fieldProps,
      (langName, langProps) => {
        const field = new Field(langProps, this);
        this.fields.set(langName, field);
        return field;
      },
      this,
    );
  }

  @action
  commitData(allData: any[], total?: number, onlyDelete?: boolean): DataSet {
    const { autoQueryAfterSubmit, primaryKey } = this.props;
    if (this.dataToJSON === DataToJSON.normal) {
      flatMap(this.dirtyRecords).forEach(record =>
        record.commit(omit(record.toData(), ['__dirty']), this),
      );
      // ???????????????????????????????????????
    } else if (allData.length) {
      const statusKey = getConfig('statusKey');
      const status = getConfig('status');
      const restCreatedData: any[] = [];
      const restUpdatedData: any[] = [];
      allData.forEach(data => {
        const dataStatus = data[statusKey];
        // ?????????????????????__id?????????__id?????????????????????????????????????????????????????????
        const record = data.__id
          ? this.findRecordById(data.__id)
          : primaryKey &&
          dataStatus !== status[RecordStatus.add] &&
          this.records.find(r => r.get(primaryKey) === data[primaryKey]);
        if (record) {
          record.commit(data, this);
        } else if (dataStatus === status[RecordStatus.add]) {
          restCreatedData.push(data);
        } else if (dataStatus === status[RecordStatus.update]) {
          restUpdatedData.push(data);
        }
      });
      const { created, updated, destroyed } = this;
      // ????????????????????????????????????????????????
      if (restCreatedData.length === created.length) {
        created.forEach((r, index) => r.commit(restCreatedData[index], this));
      } else if (autoQueryAfterSubmit) {
        // ??????????????????????????????????????? ?????????????????????????????????
        this.query();
        return this;
      }
      // ????????????????????????????????????????????????????????????
      if (restUpdatedData.length === updated.length) {
        updated.forEach((r, index) => r.commit(restUpdatedData[index], this));
      } else if (onlyDelete) {
        // onlyDelete???????????????????????? ?????????else???????????????
        // updated.forEach(r => r.commit(r.toData(), this));
      } else {
        updated
          .filter(r => restUpdatedData.some(data => {
            const dataStatus = data[statusKey];
            return data.__id
              ? r.id === data.__id
              : primaryKey &&
              dataStatus !== status[RecordStatus.add] &&
              r.get(primaryKey) === data[primaryKey];
          }))
          .forEach(r => r.commit(omit(r.toData(), ['__dirty']), this));
      }
      destroyed.forEach(r => r.commit(undefined, this));
      if (isNumber(total)) {
        this.totalCount = total;
      }
    } else if (autoQueryAfterSubmit) {
      // ????????????????????????????????????
      warning(
        false,
        `The primary key which generated by database is not exists in each created records,
because of no data \`${this.dataKey}\` from the response by \`submit\` or \`delete\` method.
Then the query method will be auto invoke.`,
      );
      this.query();
    }
    return this;
  }

  /**
   * ???????????????????????????
   * @param ds ????????????
   * @param name ?????????????????????
   */
  @action
  bind(ds: DataSet, name: string) {
    if (!name) {
      warning(false, 'DataSet: cascade binding need a name');
      return;
    }
    if (ds.children[name]) {
      warning(false, `DataSet: duplicate cascade binding of name<${name}>`);
      return;
    }
    ds.children[name] = this;
    this.parent = ds;
    this.parentName = name;
    const { current } = ds;
    if (current) {
      ds.syncChild(this, current, name);
    } else if (this.length) {
      this.loadData([]);
    }
  }

  /**
   * ?????????????????????.
   * @param {string} para ?????????.
   * @param {any} value ?????????.
   */
  @action
  setQueryParameter(para: string, value: any) {
    const queryParameter = this.getState(QUERY_PARAMETER);
    if (queryParameter) {
      if (isNil(value)) {
        queryParameter.delete(para);
      } else {
        queryParameter.set(para, value);
      }
    }
  }

  /**
   * ?????????????????????.
   * @param {string} para ?????????.
   * @return {any} ?????????.
   */
  getQueryParameter(para: string): any {
    const queryParameter = this.getState(QUERY_PARAMETER);
    if (queryParameter) {
      return queryParameter.get(para);
    }
  }

  @action
  appendData(allData: (object | Record)[] = []): DataSet {
    const {
      paging,
      pageSize,
    } = this;
    allData = paging ? allData.slice(0, pageSize) : allData;
    this.fireEvent(DataSetEvents.beforeAppend, { dataSet: this, data: allData });
    const appendData = this.processData(allData);
    this.originalData = unionBy(this.originalData, appendData, 'key');
    this.records = unionBy(this.records, appendData, 'key');
    this.fireEvent(DataSetEvents.append, { dataSet: this });
    return this;
  }

  @action
  loadData(allData: (object | Record)[] = [], total?: number): DataSet {
    this.storeSelected();
    const {
      paging,
      pageSize,
      props: { autoLocateFirst, idField, parentField },
    } = this;
    switch (paging) {
      case true:
        allData = allData.slice(0, pageSize);
        break;
      case 'server':
        allData = idField && parentField ? sliceTree(idField, parentField, allData, pageSize) : allData.slice(0, pageSize);
        break;
      default:
        break;
    }
    this.fireEvent(DataSetEvents.beforeLoad, { dataSet: this, data: allData });
    this.originalData = this.processData(allData);
    this.records = this.originalData;
    if (total !== undefined && (paging === true || paging === 'server')) {
      this.totalCount = total;
    } else if (idField && parentField && paging === 'server') {
      // ???????????????????????????total
      if (!this.totalCount) {
        this.totalCount = this.treeData.length;
      }
    } else {
      this.totalCount = allData.length;
    }
    this.releaseCachedSelected();
    const nextRecord =
      autoLocateFirst && (idField && parentField ? this.getFromTree(0) : this.get(0));
    if (nextRecord) {
      nextRecord.isCurrent = true;
    }
    this.fireEvent(DataSetEvents.indexChange, { dataSet: this, record: nextRecord });
    this.fireEvent(DataSetEvents.load, { dataSet: this });
    return this;
  }

  @action
  processData(allData: any[]): Record[] {
    return allData.map(data => {
      if (data instanceof Record) {
        if (data.dataSet !== this) {
          data.dataSet = this;
          data.status = RecordStatus.sync;
        }
        return data;
      }
      return new Record(data, this, RecordStatus.sync);
    });
  }

  private deleteRecord(record?: Record): Record | undefined {
    if (record) {
      record.isSelected = false;
      record.isCurrent = false;
      const { selected, records } = this;
      const selectedIndex = selected.indexOf(record);
      if (selectedIndex !== -1) {
        selected.splice(selectedIndex, 1);
      }
      if (record.isNew) {
        const index = records.indexOf(record);
        if (index !== -1) {
          records.splice(index, 1);
        }
      } else if (!record.isRemoved) {
        record.status = RecordStatus.delete;
      }
    }
    return record;
  }

  // ????????????????????????????????????
  private findInAllPage(index: number): Record | undefined {
    const { paging } = this;
    let indexRecord;
    if (paging === true) {
      indexRecord = this.data[this.getIndexInCurrentPage(index)];
    } else if (paging === 'server') {
      indexRecord = this.treeData[this.getIndexInCurrentPage(index)];
    } else {
      indexRecord = this.data[index];
    }
    return indexRecord;
  }

  private getIndexInCurrentPage(index: number = this.currentIndex): number {
    const { currentPage, pageSize } = this;
    return index - (currentPage - 1) * pageSize;
  }

  private transferRecords(data: Record[]): Record[] {
    return data.map(record => {
      const { dataSet } = record;
      if (dataSet === this) {
        const { records } = this;
        const index = records.indexOf(record);
        if (index !== -1) {
          records.splice(index, 1);
        }
        return record;
      }
      if (dataSet) {
        dataSet.remove(record);
        record = new Record(record.data, this);
      }
      record.dataSet = this;
      record.status = RecordStatus.add;
      return record;
    });
  }

  private initChildren(children: { [key: string]: string | DataSet; } | DataSet[]): void {
    if (isArray(children)) {
      children.forEach(childDs => {
        if (childDs instanceof DataSet) {
          const { name } = childDs;
          if (name) {
            childDs.bind(this, name);
          } else {
            warning(false, 'cascade DataSet need a name');
          }
        }
      });
    } else {
      Object.keys(children as DataSetChildren).forEach(childName => {
        const child = children[childName];
        if (child instanceof DataSet) {
          child.bind(this, childName);
        } else {
          warning(false, `cascade child<${childName}> must be instance of DataSet.`);
        }
      });
    }
  }

  private initQueryDataSet(queryDataSet?: DataSet, queryFields?: FieldProps[]) {
    if (queryFields) {
      queryDataSet = new DataSet({
        fields: queryFields,
        children: {
          __condition: new DataSet({
            paging: false,
            fields: [{
              name: 'field',
              type: FieldType.string,
              options: new DataSet({
                paging: false,
                data: queryFields.map(queryField => ({
                  value: queryField.name,
                  meaning: queryField.label || queryField.name
                }))
              }),
            }],
            // data: [
            //   { type: 'or', field: queryFields[0].name, operator: 'equal', value: '' },
            // ]
          })
        }
      });
    }
    if (queryDataSet) {
      this.queryDataSet = queryDataSet;
    }
  }

  private initEvents(events: Events): void {
    Object.keys(events).forEach(event => this.addEventListener(event, events[event]));
  }

  private loadDataFromResponse(resp: any, append?: boolean): DataSet {
    if (resp) {
      const { dataKey, totalKey } = this;
      const data: object[] = generateResponseData(resp, dataKey);
      const total: number | undefined = ObjectChainValue.get(resp, totalKey);
      if (append) {
        this.appendData(data);
      } else {
        this.loadData(data, total);
      }
    }
    return this;
  }

  private appendDataFromResponse(resp: any): DataSet {
    if (resp) {
      const { dataKey } = this;
      const data: object[] = generateResponseData(resp, dataKey);
      this.appendData(data);
    }
    return this;

  }

  // private groupData(allData: object[]): object[] {
  //   return this.getGroups().reverse()
  //     .reduce((arr, name) => arr.sort(
  //       (item1, item2) => String(item1[name]).localeCompare(String(item2[name])),
  //     ), allData);
  // }

  private async write(records: Record[], onlyDelete?: boolean): Promise<any> {
    if (records.length) {
      const [created, updated, destroyed] = prepareSubmitData(records, this.dataToJSON);
      const axiosConfigs: AxiosRequestConfig[] = [];
      const submitData: object[] = [
        ...prepareForSubmit('create', created, axiosConfigs, this),
        ...prepareForSubmit('update', updated, axiosConfigs, this),
        ...prepareForSubmit('destroy', destroyed, axiosConfigs, this),
      ];
      prepareForSubmit('submit', submitData, axiosConfigs, this);
      if (axiosConfigs.length) {
        try {
          this.changeSubmitStatus(DataSetStatus.submitting);
          const submitEventResult = await this.fireEvent(DataSetEvents.submit, {
            dataSet: this,
            data: [...created, ...updated, ...destroyed],
          });
          if (submitEventResult) {
            const result: any[] = await axiosStatic.all(
              axiosConfigs.map(config => this.axios(config)),
            );
            return this.handleSubmitSuccess(result, onlyDelete);
          }
        } catch (e) {
          this.handleSubmitFail(e);
          throw new DataSetRequestError(e);
        } finally {
          this.changeSubmitStatus(DataSetStatus.ready);
        }
      }
    }
  }

  private async read(page: number = 1, params?: object): Promise<any> {
    if (this.checkReadable(this.parent)) {
      try {
        this.changeStatus(DataSetStatus.loading);
        const data = await this.generateQueryParameter(params);
        const newConfig = axiosConfigAdapter('read', this, data, this.generateQueryString(page));
        if (newConfig.url) {
          const queryEventResult = await this.fireEvent(DataSetEvents.query, {
            dataSet: this,
            params: newConfig.params,
            data: newConfig.data,
          });
          if (queryEventResult) {
            const result = await this.axios(fixAxiosConfig(newConfig));
            runInAction(() => {
              if (page >= 0) {
                this.currentPage = page;
              }
            });
            return this.handleLoadSuccess(result);
          }
        }
      } catch (e) {
        this.handleLoadFail(e);
        throw new DataSetRequestError(e);
      } finally {
        this.changeStatus(DataSetStatus.ready);
      }
    }
  }

  @action
  private storeSelected() {
    if (this.cacheSelectionKeys) {
      const { isAllPageSelection } = this;
      this.setCachedSelected([
        ...this.cachedSelected.filter(record => isAllPageSelection ? !record.isSelected : record.isSelected),
        ...(isAllPageSelection ? this.currentUnSelected : this.currentSelected).map(record => {
          record.isCurrent = false;
          record.isCached = true;
          return record;
        }),
      ]);
    }
  }

  @action
  releaseCachedSelected() {
    const { cacheSelectionKeys, cachedSelected, isAllPageSelection } = this;
    if (cacheSelectionKeys) {
      this.data.forEach(record => {
        const index = cachedSelected.findIndex(cached =>
          cacheSelectionKeys.every(key => record.get(key) === cached.get(key)),
        );
        if (index !== -1) {
          record.isSelected = !isAllPageSelection;
          cachedSelected.splice(index, 1);
        }
      });
    }
  }

  @action
  private changeStatus(status: DataSetStatus) {
    this.status = status;
  }

  @action
  private changeSubmitStatus(status: DataSetStatus) {
    this.status = status;
    Object.values(this.children).forEach(ds => {
      if (ds instanceof DataSet) {
        ds.changeSubmitStatus(status);
      }
    });
  }

  private handleCascade({
    dataSet,
    record,
    previous,
  }: {
    dataSet: DataSet;
    record?: Record;
    previous?: Record;
  }) {
    if (dataSet.hasChildren) {
      dataSet.syncChildren(record, previous);
    }
  }

  private handleLoadSuccess(resp: any) {
    const { loadSuccess = defaultFeedback.loadSuccess } = this.feedback;
    loadSuccess!(resp, $l('DataSet', ''));
    return resp;
  }

  private handleLoadFail(e) {
    const { loadFailed = defaultFeedback.loadFailed } = this.feedback;
    this.fireEvent(DataSetEvents.loadFailed, { dataSet: this });
    loadFailed!(e, $l('DataSet', 'query_failure'));
  }

  private handleSubmitSuccess(resp: any[], onlyDelete?: boolean) {
    const { dataKey, totalKey } = this;
    const { submitSuccess = defaultFeedback.submitSuccess } = this.feedback;
    const data: {
      [props: string]: any;
    }[] = [];
    let total;
    resp.forEach(item => {
      data.push(...generateResponseData(item, dataKey));
      if (totalKey && isObject(item)) {
        const myTotal = ObjectChainValue.get(item, totalKey);
        if (!isNil(myTotal)) {
          total = myTotal;
        }
      }
    });
    const result = dataKey ? { success: true } : data;
    if (dataKey) {
      ObjectChainValue.set(result, dataKey, data);
      if (totalKey) {
        ObjectChainValue.set(result, totalKey, total);
      }
    }
    this.fireEvent(DataSetEvents.submitSuccess, { dataSet: this, data: result });
    // ?????? 204 ???????????????????????????
    // ?????????????????? primaryKey ????????? ???,???????????????????????????delete?????????????????????204???????????????????????????record???
    if (!(data[0] && data[0].status === 204 && data[0].statusText === 'No Content')) {
      this.commitData(data, total, onlyDelete);
    } else {
      this.commitData([], total);
    }
    if (submitSuccess) {
      submitSuccess(result);
    }
    return result;
  }

  @action
  private handleSubmitFail(e) {
    const { current } = this;
    const { submitFailed = defaultFeedback.submitFailed } = this.feedback;
    this.fireEvent(DataSetEvents.submitFailed, { dataSet: this });
    if (submitFailed) {
      submitFailed(e);
    }
    if (this.props.autoLocateAfterRemove && current && this.destroyed.length) {
      current.isCurrent = false;
    }
    this.destroyed.forEach((record, index) => {
      record.reset();
      record.isSelected = true;
      if (this.props.autoLocateAfterRemove && index === 0) {
        record.isCurrent = true;
      }
    });
  }

  private syncChildren(current?: Record, previous?: Record) {
    const { children } = this;
    const keys: string[] = Object.keys(children);
    const remoteKeys: string[] = [];
    keys.forEach(childName => {
      const ds = children[childName];
      if (previous && ds.status === DataSetStatus.ready && previous.dataSetSnapshot[childName]) {
        previous.dataSetSnapshot[childName] = ds.snapshot();
        ds.current = undefined;
      }
      if (current) {
        const snapshot = current.dataSetSnapshot[childName];
        if (snapshot instanceof DataSetSnapshot) {
          ds.restore(snapshot);
        } else if (!this.syncChild(ds, current, childName, true)) {
          ds.loadData([]);
          remoteKeys.push(childName);
        }
      } else {
        ds.loadData([]);
      }
    });
    if (current && remoteKeys.length) {
      this.syncChildrenRemote(remoteKeys, current);
    }
  }

  @action
  private syncChild(
    ds: DataSet,
    currentRecord: Record,
    childName: string,
    onlyClient?: boolean,
  ): boolean {
    const cascadeRecords = currentRecord.cascadeRecordsMap[childName];
    const childRecords = cascadeRecords || currentRecord.get(childName);
    if (currentRecord.isNew || isArrayLike(childRecords)) {
      if (cascadeRecords) {
        delete currentRecord.cascadeRecordsMap[childName];
      }
      ds.clearCachedSelected();
      ds.loadData(childRecords ? childRecords.slice() : []);
      if (currentRecord.isNew) {
        if (ds.length) {
          ds.forEach(record => (record.status = RecordStatus.add));
        } else if (ds.props.autoCreate) {
          ds.create();
        }
      }
      currentRecord.dataSetSnapshot[childName] = ds.snapshot();
      return true;
    }
    if (!onlyClient) {
      const oldSnapshot = ds.snapshot();
      ds.read(1).then(resp => {
        const { current } = this;
        if (current !== currentRecord) {
          ds = new DataSet().restore(oldSnapshot);
        }
        ds.clearCachedSelected();
        currentRecord.dataSetSnapshot[childName] = ds.loadDataFromResponse(resp).snapshot();
      });
    }
    return false;
  }

  private checkReadable(parent) {
    if (parent) {
      const { current } = parent;
      if (!current || current.isNew) {
        return false;
      }
    }
    return true;
  }

  /**
   * page??????????????????
   * @param page ???????????????, ??????0????????????
   * @param pageSizeInner ????????????
   */
  private generatePageQueryString(page: number, pageSizeInner?: number): { page?: number, pagesize?: number | undefined; } {
    if (page >= 0) {
      const { paging, pageSize } = this;
      if (isNumber(pageSizeInner)) {
        return { page, pagesize: pageSizeInner };
      }
      if (paging === true || paging === 'server') {
        return { page, pagesize: pageSize };
      }
    }
    return {};
  }

  private generateOrderQueryString(): { sortname?: string; sortorder?: string; } {
    const { fields } = this;
    const orderField = getOrderFields(fields)[0];
    if (orderField) {
      const param = { sortname: orderField.name, sortorder: orderField.order };
      if (orderField.type === FieldType.object) {
        const bindField = findBindFieldBy(orderField, this.fields, 'valueField');
        if (bindField) {
          param.sortname = bindField.name;
        }
      }
      return param;
    }
    return {};
  }

  /**
   * ??????configure ????????????
   * @param page ???????????????, ??????0????????????
   * @param pageSizeInner ????????????
   */
  private generateQueryString(page: number, pageSizeInner?: number) {
    const order = this.generateOrderQueryString();
    const pageQuery = this.generatePageQueryString(page, pageSizeInner);
    const generatePageQuery = getConfig('generatePageQuery');
    if (typeof generatePageQuery === 'function') {
      return generatePageQuery({
        sortName: order.sortname,
        sortOrder: order.sortorder,
        pageSize: pageQuery.pagesize,
        page: pageQuery.page,
      });
    }
    return { ...pageQuery, ...order };
  }

  private getParentParams(): object {
    const {
      parent,
      props: { cascadeParams },
    } = this;
    if (parent) {
      const {
        props: { primaryKey },
        current,
      } = parent;
      if (current) {
        return cascadeParams!(current, primaryKey);
      }
    }
    return {};
  }

  private async generateQueryParameter(params?: object): Promise<any> {
    const { queryDataSet, props: { validateBeforeQuery } } = this;
    const parentParams = this.getParentParams();
    if (queryDataSet) {
      await queryDataSet.ready();
      if (validateBeforeQuery && !(await queryDataSet.validate())) {
        throw new Error($l('DataSet', 'invalid_query_dataset'));
      }
    }
    let data: any = {};
    if (queryDataSet) {
      const { current } = queryDataSet;
      if (current) {
        data = omit(current.toData(true), ['__dirty']);
      }
    }
    data = {
      ...data,
      ...this.queryParameter,
      ...parentParams,
      ...params,
    };
    return Object.keys(data).reduce((p, key) => {
      const value = data[key];
      if (!isEmpty(value)) {
        p[key] = value;
      }
      return p;
    }, {});
  }
}
