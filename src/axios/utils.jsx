import buildURL from 'axios/lib/helpers/buildURL';
export function buildSortedURL(...args) {
    const builtURL = buildURL(...args);
    const [urlPath, queryString] = builtURL.split('?');
    if (queryString) {
        const paramsPair = queryString.split('&');
        return `${urlPath}?${paramsPair.sort().join('&')}`;
    }
    return builtURL;
}
export function buildURLWithAxiosConfig(config) {
    const { data, url, params, paramsSerializer } = config;
    const builtURL = buildSortedURL(url, params, paramsSerializer);
    if (data) {
        return `${builtURL}|${JSON.stringify(data)}`;
    }
    return builtURL;
}
export function isCacheLike(cache) {
    return !!(cache.set &&
        cache.get &&
        cache.del &&
        typeof cache.get === 'function' &&
        typeof cache.set === 'function' &&
        typeof cache.del === 'function');
}
