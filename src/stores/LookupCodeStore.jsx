import { __decorate } from "tslib";
import { action } from 'mobx';
import isString from 'lodash/isString';
import { getConfig } from 'choerodon-ui/lib/configure';
import axios from '../axios';
import lovCodeStore from './LovCodeStore';
import { generateResponseData } from '../data-set/utils';
import { getLovPara, processAxiosConfig } from './utils';
import cacheAdapterEnhancer from '../axios/cacheAdapterEnhancer';
import throttleAdapterEnhancer from '../axios/throttleAdapterEnhancer';
import PromiseMerger from '../_util/PromiseMerger';
const adapter = throttleAdapterEnhancer(cacheAdapterEnhancer(axios.defaults.adapter));
export class LookupCodeStore {
    constructor() {
        this.batchCallback = (codes) => {
            const lookupBatchAxiosConfig = getConfig('lookupBatchAxiosConfig');
            if (lookupBatchAxiosConfig) {
                return this.axios(lookupBatchAxiosConfig(codes));
            }
            return Promise.resolve({});
        };
        this.merger = new PromiseMerger(this.batchCallback, getConfig('lookupCache'));
    }
    get axios() {
        return getConfig('axios') || axios;
    }
    async fetchLookupData(key, axiosConfig = {}) {
        let config = {};
        if (isString(key)) {
            config = {
                ...axiosConfig,
                url: key,
                method: axiosConfig.method || getConfig('lookupAxiosMethod') || 'post',
            };
        }
        else {
            config = key;
        }
        if (config.url) {
            let data;
            // SSR do not fetch the lookup
            if (typeof window !== 'undefined') {
                const result = await this.axios(config);
                if (result) {
                    data = generateResponseData(result, getConfig('dataKey'));
                }
            }
            return data;
        }
    }
    async fetchLookupDataInBatch(code) {
        return this.merger.add(code);
    }
    getAxiosConfig(field) {
        const lookupAxiosConfig = field.get('lookupAxiosConfig') || getConfig('lookupAxiosConfig');
        const { record } = field;
        const params = getLovPara(field, record);
        const config = processAxiosConfig(lookupAxiosConfig, {
            dataSet: field.dataSet,
            record,
            params,
            lookupCode: field.get('lookupCode'),
        });
        return {
            adapter,
            ...config,
            url: config.url || this.getUrl(field),
            method: config.method || getConfig('lookupAxiosMethod') || 'post',
            params: config.params || params,
        };
    }
    getUrl(field) {
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
        if (lovCode && type !== "object" /* object */) {
            return lovCodeStore.getQueryAxiosConfig(lovCode, field)({ dataSet: field.dataSet }).url;
        }
    }
    // @deprecate
    clearCache() { }
}
__decorate([
    action
], LookupCodeStore.prototype, "clearCache", null);
export default new LookupCodeStore();
