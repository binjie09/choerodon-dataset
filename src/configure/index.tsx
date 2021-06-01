import { observable, ObservableMap, runInAction, toJS } from 'mobx';
import { AxiosInstance, AxiosPromise, AxiosRequestConfig } from 'axios';
import isObject from 'lodash/isObject';
import { LovConfig } from '../interfaces';
import { RecordStatus } from '../data-set/enum';
import { ValidationMessages } from '../validator/Validator';
import { TransportHookProps, TransportProps } from '../data-set/Transport';
import DataSet from '../data-set/DataSet';
import defaultFeedback, { FeedBack } from '../data-set/FeedBack';
import {
  defaultValidationMessageFormatter,
  defaultValidationMessageReportFormatter,
  ValidationMessageFormatter,
  ValidationMessageReportFormatter,
} from '../validator/ValidationMessageReportFormatter';
import Record from '../data-set/Record';
import { CacheOptions } from '../cache';

export type Status = {
  [RecordStatus.add]: string;
  [RecordStatus.update]: string;
  [RecordStatus.delete]: string;
};

export type Formatter = {
  jsonDate?: string | null;
  date?: string;
  dateTime?: string;
  time?: string;
  year?: string;
  month?: string;
  week?: string;
};

export interface Config {
  prefixCls?: string;
  proPrefixCls?: string;
  iconfontPrefix?: string;
  ripple?: boolean;
  collapseExpandIconPosition?: string;
  collapseExpandIcon?: (panelProps: any) => any | 'text';
  collapseTrigger?: string;
  lookupCache?: CacheOptions<string, AxiosPromise>;
  lookupUrl?: string | ((code: string) => string);
  lookupAxiosMethod?: string;
  lookupAxiosConfig?:
    | AxiosRequestConfig
    | ((props: {
    params?: any;
    dataSet?: DataSet;
    record?: Record;
    lookupCode?: string;
  }) => AxiosRequestConfig);
  lookupBatchAxiosConfig?: (codes: string[]) => AxiosRequestConfig;
  lovDefineUrl?: string | ((code: string) => string);
  lovDefineAxiosConfig?: AxiosRequestConfig | ((code: string) => AxiosRequestConfig);
  lovQueryUrl?:
    | string
    | ((code: string, lovConfig: LovConfig | undefined, props: TransportHookProps) => string);
  lovQueryAxiosConfig?:
    | AxiosRequestConfig
    | ((
    code: string,
    lovConfig: LovConfig | undefined,
    props: TransportHookProps,
  ) => AxiosRequestConfig);
  lovTableProps?: any;
  lovModalProps?: any;
  lovTableCustomizable?: boolean;
  lovAutoSelectSingle?: boolean;
  axios?: AxiosInstance;
  feedback?: FeedBack;
  dataKey?: string;
  totalKey?: string;
  statusKey?: string;
  tlsKey?: string;
  status?: Status;
  exportMode?: any;
  labelLayout?: any;
  queryBar?: any | any;
  tableBorder?: boolean;
  tableHighLightRow?: boolean;
  tableParityRow?: boolean;
  tableSelectedHighLightRow?: boolean;
  tableRowHeight?: 'auto' | number;
  tableColumnTooltip?: any;
  tableColumnResizable?: boolean;
  tableColumnHideable?: boolean;
  tableColumnTitleEditable?: boolean;
  tableDragColumnAlign?: any;
  tableColumnDraggable?: boolean;
  tableRowDraggable?: boolean;
  tableExpandIcon?: (props: any) => any;
  tableSpinProps?: any;
  tableButtonProps?: any;
  tableCommandProps?: any;
  tableDefaultRenderer?: any;
  tableColumnOnCell?: (props: any) => object;
  tableShowSelectionTips?: boolean;
  tableAlwaysShowRowBox?: boolean;
  tableUseMouseBatchChoose?: boolean;
  tableEditorNextKeyEnterDown?: boolean;
  tableAutoFocus?: boolean;
  tableKeyboard?: boolean;
  tableFilterAdapter?: TransportProps;
  tableFilterSuffix?: any[];
  tableFilterSearchText?: string;
  tableAutoHeightDiff?: number;
  tableCustomizable?: boolean;
  tableCustomizedSave?: (code: string, customized: any) => void;
  tableCustomizedLoad?: (code: string) => Promise<any | null>;
  pagination?: any | false;
  modalSectionBorder?: boolean;
  drawerSectionBorder?: boolean;
  drawerTransitionName?: string;
  modalAutoCenter?: boolean;
  modalOkFirst?: boolean;
  drawerOkFirst?: boolean;
  modalButtonProps?: any;
  modalKeyboard?: boolean;
  modalMaskClosable?: string | boolean;
  buttonFuncType?: any;
  buttonColor?: any;
  buttonTooltip?: any;
  renderEmpty?: any;
  highlightRenderer?: any;
  defaultValidationMessages?: ValidationMessages;
  transport?: TransportProps;
  icons?: { [key: string]: string[]; } | string[];
  generatePageQuery?: (pageParams: {
    page?: number;
    pageSize?: number;
    sortName?: string;
    sortOrder?: string;
  }) => object;
  formatter?: Formatter;
  dropdownMatchSelectWidth?: boolean;
  selectOptionTooltip?: any;
  selectReverse?: boolean;
  selectPagingOptionContent?: string | any;
  selectSearchable?: boolean;
  useColon?: boolean;
  excludeUseColonTagList?: string[];
  textFieldAutoComplete?: 'on' | 'off';
  resultStatusRenderer?: object;
  numberFieldNonStrictStep?: boolean;
  numberFieldFormatter?: any;
  numberFieldFormatterOptions?: any;
  labelTooltip?: any;
  /**
   * @deprecated
   * 同 tableColumnDraggable
   */
  tableDragColumn?: boolean;
  /**
   * @deprecated
   * 同 tableRowDraggable
   */
  tableDragRow?: boolean;
  /**
   * 是否显示长度信息
   */
  showLengthInfo?: boolean;
  /**
   * moment非法时显示Invalid date
   */
  showInvalidDate?: boolean;
  /**
   * 只有在空值时显示必填背景色和边框色
   */
  showRequiredColorsOnlyEmpty?: boolean;

  validationMessageFormatter?: ValidationMessageFormatter;
  validationMessageReportFormatter?: ValidationMessageReportFormatter;
  confirm: (message) => Promise<boolean>;
}

export type ConfigKeys = keyof Config;

const globalConfig: ObservableMap<ConfigKeys, Config[ConfigKeys]> = observable.map<ConfigKeys,
  Config[ConfigKeys]>([
  ['lookupCache', { maxAge: 1000 * 60 * 10, max: 100 }],
  ['lookupUrl', code => `/common/code/${code}/`],
  ['lookupAxiosMethod', 'post'],
  ['lovDefineUrl', code => `/sys/lov/lov_define?code=${code}`],
  ['lovQueryUrl', code => `/common/lov/dataset/${code}`],
  ['dataKey', 'rows'],
  ['totalKey', 'total'],
  ['tlsKey', '__tls'],
  ['statusKey', '__status'],
  [
    'status',
    { [RecordStatus.add]: 'add', [RecordStatus.update]: 'update', [RecordStatus.delete]: 'delete' },
  ],
  ['feedback', defaultFeedback],
  ['confirm', () => Promise.resolve(true)],
  ['validationMessageFormatter', defaultValidationMessageFormatter],
  ['validationMessageReportFormatter', defaultValidationMessageReportFormatter],
  [
    'formatter',
    {
      jsonDate: 'YYYY-MM-DD HH:mm:ss',
      date: 'YYYY-MM-DD',
      dateTime: 'YYYY-MM-DD HH:mm:ss',
      time: 'HH:mm:ss',
      year: 'YYYY',
      month: 'YYYY-MM',
      week: 'GGGG-Wo',
    },
  ],
]);

export function getConfig<C extends Config>(key: keyof C): any {
  // FIXME: observable.map把构建map时传入的key类型和value类型分别做了union，
  // 丢失了一一对应的映射关系，导致函数调用者无法使用union后的返回值类型，因此需要指定本函数返回值为any
  return (globalConfig as ObservableMap<keyof C, C[keyof C]>).get(key);
}

const mergeProps = ['transport', 'feedback', 'formatter'];

export default function configure<C extends Config>(config: C) {
  runInAction(() => {
    Object.keys(config).forEach((key: ConfigKeys) => {
      const value = config[key];
      if (mergeProps.includes(key) && isObject(value)) {
        globalConfig.set(key, {
          ...toJS<any>(globalConfig.get(key)),
          ...value,
        });
      } else {
        globalConfig.set(key, config[key]);
      }
    });
  });
}
