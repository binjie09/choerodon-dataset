import { __decorate } from "tslib";
import isNil from 'lodash/isNil';
import { action, observable, runInAction } from 'mobx';
import { getConfig } from 'choerodon-ui/lib/configure';
import warning from 'choerodon-ui/lib/_util/warning';
import DataSet from '../data-set/DataSet';
import axios from '../axios';
import { processAxiosConfig } from './utils';
function getFieldType(conditionFieldType) {
    switch (conditionFieldType) {
        case "INT" /* INT */:
            return "number" /* number */;
        case "TEXT" /* TEXT */:
            return "string" /* string */;
        case "DATE" /* DATE */:
            return "date" /* date */;
        case "DATETIME" /* DATETIME */:
            return "dateTime" /* dateTime */;
        case "POPUP" /* POPUP */:
            return "object" /* object */;
        default:
            return conditionFieldType || "string" /* string */;
    }
}
function generateConditionField(fields, { conditionField, conditionFieldType, conditionFieldName, gridFieldName, display, conditionFieldLovCode, conditionFieldSelectCode, conditionFieldSelectUrl, conditionFieldSelectTf, conditionFieldSelectVf, conditionFieldRequired, fieldProps, }) {
    if (conditionField === 'Y') {
        const name = conditionFieldName || gridFieldName;
        const field = {
            name,
            type: getFieldType(conditionFieldType),
            label: display,
            lovCode: conditionFieldLovCode || undefined,
            lookupCode: conditionFieldSelectCode || undefined,
            lookupUrl: conditionFieldSelectUrl || undefined,
            textField: conditionFieldSelectTf || undefined,
            valueField: conditionFieldSelectVf || undefined,
            required: conditionFieldRequired || undefined,
            ...fieldProps,
        };
        fields.push(field);
        if (conditionFieldType === "POPUP" /* POPUP */) {
            const aliasName = `__lov__${name}`;
            field.name = aliasName;
            fields.push({
                name,
                bind: `${aliasName}.${conditionFieldSelectVf}`,
            });
        }
    }
}
function generateGridField(fields, { gridField, gridFieldName, display, fieldProps }, valueField) {
    if (gridField === 'Y') {
        fields.push({
            name: gridFieldName,
            label: display,
            unique: valueField === gridFieldName,
            ...fieldProps,
        });
    }
}
export class LovCodeStore {
    constructor() {
        this.pendings = {};
        this.init();
    }
    get axios() {
        return getConfig('axios') || axios;
    }
    init() {
        this.lovCodes = observable.map();
    }
    getDefineAxiosConfig(code, field) {
        const lovDefineAxiosConfig = (field && field.get('lovDefineAxiosConfig')) || getConfig('lovDefineAxiosConfig');
        const config = processAxiosConfig(lovDefineAxiosConfig, code);
        return {
            ...config,
            url: config.url || this.getConfigUrl(code, field),
            method: config.method || 'post',
        };
    }
    getConfig(code) {
        return this.lovCodes.get(code);
    }
    async fetchConfig(code, field) {
        let config = this.getConfig(code);
        // SSR do not fetch the lookup
        if (!config && typeof window !== 'undefined') {
            const axiosConfig = this.getDefineAxiosConfig(code, field);
            if (axiosConfig) {
                try {
                    const pending = this.pendings[code] || this.axios(axiosConfig);
                    this.pendings[code] = pending;
                    config = await pending;
                    runInAction(() => {
                        if (config) {
                            this.lovCodes.set(code, config);
                        }
                    });
                }
                finally {
                    delete this.pendings[code];
                }
            }
        }
        return config;
    }
    // lovCode 作为key 缓存了 ds
    getLovDataSet(code, field) {
        const config = this.getConfig(code);
        if (config) {
            const { lovPageSize, lovItems, parentIdField, idField, valueField, treeFlag } = config;
            const dataSetProps = {
                transport: {
                    read: this.getQueryAxiosConfig(code, field, config),
                },
                primaryKey: valueField,
                cacheSelection: true,
            };
            if (!isNil(lovPageSize) && !isNaN(Number(lovPageSize))) {
                dataSetProps.pageSize = Number(lovPageSize);
            }
            else {
                dataSetProps.paging = false;
            }
            if (treeFlag === 'Y' && parentIdField && idField) {
                dataSetProps.parentField = parentIdField;
                dataSetProps.idField = idField;
            }
            if (lovItems && lovItems.length) {
                const { querys, fields } = lovItems
                    .sort(({ conditionFieldSequence }, { conditionFieldSequence: conditionFieldSequence2 }) => conditionFieldSequence - conditionFieldSequence2)
                    .reduce((obj, configItem) => {
                    generateConditionField(obj.querys, configItem);
                    generateGridField(obj.fields, configItem, valueField);
                    return obj;
                }, { querys: [], fields: [] });
                if (querys.length) {
                    dataSetProps.queryFields = querys;
                }
                if (fields.length) {
                    dataSetProps.fields = fields;
                }
            }
            return new DataSet(dataSetProps);
        }
        warning(false, `LOV: code<${code}> is not exists`);
        return undefined;
    }
    getConfigUrl(code, field) {
        const lovDefineUrl = (field && field.get('lovDefineUrl')) || getConfig('lovDefineUrl');
        if (typeof lovDefineUrl === 'function') {
            return lovDefineUrl(code);
        }
        return lovDefineUrl;
    }
    getQueryAxiosConfig(code, field, config) {
        return (props) => {
            const lovQueryAxiosConfig = (field && field.get('lovQueryAxiosConfig')) || getConfig('lovQueryAxiosConfig');
            const axiosConfig = processAxiosConfig(lovQueryAxiosConfig, code, config, props);
            return {
                ...axiosConfig,
                url: axiosConfig.url || this.getQueryUrl(code, field, props),
                method: axiosConfig.method || 'post',
            };
        };
    }
    getQueryUrl(code, field, props) {
        const config = this.getConfig(code);
        if (config) {
            const { customUrl } = config;
            if (customUrl) {
                return customUrl;
            }
        }
        const lovQueryUrl = (field && field.get('lovQueryUrl')) || getConfig('lovQueryUrl');
        if (typeof lovQueryUrl === 'function') {
            return lovQueryUrl(code, config, props);
        }
        return lovQueryUrl;
    }
    clearCache(codes) {
        if (codes) {
            codes.forEach(code => {
                this.lovCodes.delete(code);
            });
        }
        else {
            this.lovCodes.clear();
        }
    }
}
__decorate([
    observable
], LovCodeStore.prototype, "lovCodes", void 0);
__decorate([
    action
], LovCodeStore.prototype, "init", null);
__decorate([
    action
], LovCodeStore.prototype, "clearCache", null);
export default new LovCodeStore();
