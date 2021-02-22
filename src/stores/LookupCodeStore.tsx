import { action } from 'mobx';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import isString from 'lodash/isString';
import { getConfig } from '../configure';
import axios from '../axios';
import Field from '../data-set/Field';
import lovCodeStore from './LovCodeStore';
import { FieldType } from '../data-set/enum';
import { generateResponseData } from '../data-set/utils';
import { getLovPara, processAxiosConfig } from './utils';
import cacheAdapterEnhancer from '../axios/cacheAdapterEnhancer';
import throttleAdapterEnhancer from '../axios/throttleAdapterEnhancer';
import PromiseMerger from '../promise-merger';

const adapter = throttleAdapterEnhancer(cacheAdapterEnhancer(axios.defaults.adapter!));

export type responseData = object[];
export type responseType = responseData | undefined;

export class LookupCodeStore {
  get axios(): AxiosInstance {
    return getConfig('axios') || axios;
  }

  batchCallback = (codes: string[], lookupBatchAxiosConfig: (codes: string[]) => AxiosRequestConfig): Promise<{ [key: string]: responseData }> => {
    if (lookupBatchAxiosConfig) {
      return this.axios(lookupBatchAxiosConfig(codes)) as any;
    }
    return Promise.resolve({});
  };

  merger: PromiseMerger<responseData> = new PromiseMerger<responseData>(
    this.batchCallback,
    // @ts-ignore
    getConfig('lookupCache'),
  );

  async fetchLookupData(
    key: AxiosRequestConfig | string,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<responseType> {
    let config: AxiosRequestConfig = {};
    if (isString(key)) {
      config = {
        ...axiosConfig,
        url: key,
        method: axiosConfig.method || getConfig('lookupAxiosMethod') || 'post',
      };
    } else {
      config = key as AxiosRequestConfig;
    }
    if (config.url) {
      let data: responseData | undefined;
      // SSR do not fetch the lookup
      if (typeof window !== 'undefined') {
        const result: any = await this.axios(config);
        if (result) {
          data = generateResponseData(result, getConfig('dataKey'));
        }
      }
      return data;
    }
  }

  async fetchLookupDataInBatch(code: string, lookupBatchAxiosConfig: (codes: string[]) => AxiosRequestConfig): Promise<responseType> {
    return this.merger.add(code, lookupBatchAxiosConfig);
  }

  getAxiosConfig(field: Field, noCache?: boolean): AxiosRequestConfig {
    // @ts-ignore
    const lookupAxiosConfig = field.get('lookupAxiosConfig') || getConfig('lookupAxiosConfig');
    const { record } = field;
    const params = getLovPara(field, record);
    const config = processAxiosConfig(lookupAxiosConfig, {
      dataSet: field.dataSet,
      record,
      params,
      lookupCode: field.get('lookupCode'),
    });
    const noCacheAdapter = throttleAdapterEnhancer(cacheAdapterEnhancer(axios.defaults.adapter!, { enabledByDefault: !noCache }));
    return {
      adapter: noCache ? noCacheAdapter : adapter,
      ...config,
      url: config.url || this.getUrl(field),
      method: config.method || getConfig('lookupAxiosMethod') || 'post',
      params: config.params || params,
    };
  }

  getUrl(field: Field): string | undefined {
    const type = field.get('type');
    const lovCode = field.get('lovCode');
    const lookupUrl = field.get('lookupUrl');
    const lookupCode = field.get('lookupCode');
    if (typeof lookupUrl === 'function' && lookupCode) {
      return lookupUrl(lookupCode);
    }
    if (isString(lookupUrl)) {
      return lookupUrl;
    }
    if (lovCode && type !== FieldType.object) {
      return lovCodeStore.getQueryAxiosConfig(lovCode, field)({ dataSet: field.dataSet }).url;
    }
  }

  // @deprecate
  @action
  clearCache() {
  }
}

export default new LookupCodeStore();
