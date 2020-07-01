import { getConfig } from 'choerodon-ui/lib/configure';
import Cache, { refreshCacheOptions } from '../_util/Cache';
import { buildURLWithAxiosConfig, isCacheLike } from './utils';
function getDefaultCache() {
    const cache = new Cache(getConfig('lookupCache'));
    refreshCacheOptions(cache);
    return cache;
}
export default function cacheAdapterEnhancer(adapter, options = {}) {
    const { enabledByDefault = true, cacheFlag = 'cache', defaultCache = getDefaultCache(), } = options;
    return config => {
        const useCache = config[cacheFlag] !== undefined && config[cacheFlag] !== null
            ? config[cacheFlag]
            : enabledByDefault;
        if (useCache) {
            const cache = isCacheLike(useCache) ? useCache : defaultCache;
            const index = buildURLWithAxiosConfig(config);
            let responsePromise = cache.get(index);
            if (!responsePromise) {
                responsePromise = (async () => {
                    try {
                        return await adapter(config);
                    }
                    catch (reason) {
                        cache.del(index);
                        throw reason;
                    }
                })();
                if (process.env.LOGGER_LEVEL === 'info') {
                    // eslint-disable-next-line no-console
                    console.info(`request: ${index}`);
                }
                cache.set(index, responsePromise);
                return responsePromise;
            }
            if (process.env.LOGGER_LEVEL === 'info') {
                // eslint-disable-next-line no-console
                console.info(`request cached by cache adapter: ${index}`);
            }
            return responsePromise;
        }
        return adapter(config);
    };
}
