import Cache from '../cache';
import { buildURLWithAxiosConfig } from './utils';
export default function throttleAdapterEnhancer(adapter, options = {}) {
    const { threshold = 1000, cache = new Cache({ max: 10 }) } = options;
    const recordCacheWithRequest = (index, config) => {
        const responsePromise = (async () => {
            try {
                const response = await adapter(config);
                cache.set(index, {
                    timestamp: Date.now(),
                    value: Promise.resolve(response),
                });
                return response;
            }
            catch (reason) {
                cache.del(index);
                throw reason;
            }
        })();
        cache.set(index, {
            timestamp: Date.now(),
            value: responsePromise,
        });
        return responsePromise;
    };
    return config => {
        const index = buildURLWithAxiosConfig(config);
        const now = Date.now();
        const cachedRecord = cache.get(index) || { timestamp: now };
        if (now - cachedRecord.timestamp <= threshold) {
            const responsePromise = cachedRecord.value;
            if (responsePromise) {
                if (process.env.LOGGER_LEVEL === 'info') {
                    // eslint-disable-next-line no-console
                    console.info(`request cached by throttle adapter: ${index}`);
                }
                return responsePromise;
            }
        }
        return recordCacheWithRequest(index, config);
    };
}
