import { toJS } from 'mobx';
export function getLovPara(field, record) {
    const lovPara = toJS(field.get('lovPara')) || {};
    const cascadeMap = field.get('cascadeMap');
    if (record && cascadeMap) {
        Object.keys(cascadeMap).forEach(cascade => (lovPara[cascade] = record.get(cascadeMap[cascade])));
    }
    return lovPara;
}
export function processAxiosConfig(axiosConfig = {}, ...args) {
    if (typeof axiosConfig === 'function') {
        return axiosConfig(...args);
    }
    return axiosConfig;
}
