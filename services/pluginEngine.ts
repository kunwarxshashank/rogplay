import * as cheerio from 'cheerio-without-node-native';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

export const initPluginEngine = async () => {
    // No-op for Hermes native sandbox
    console.log('Plugin Engine Initialized (Hermes Sandbox)');
};

export const executeNuvioPlugin = async (
    pluginCode: string,
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    season: number | null = null,
    episode: number | null = null
): Promise<any[]> => {
    try {
        // 1. Mock 'require' inside the sandbox
        const customRequire = (moduleName: string) => {
            if (moduleName.includes('cheerio')) {
                return cheerio;
            }
            if (moduleName.includes('crypto-js')) {
                return CryptoJS;
            }
            return {};
        };


        // 2. Mock console to distinguish logs
        const customConsole = {
            log: (...args: any[]) => console.log('[Plugin Log]', ...args),
            error: (...args: any[]) => console.warn('[Plugin Error]', ...args),
            warn: (...args: any[]) => console.warn('[Plugin Warn]', ...args)
        };

        // 3. Polyfill Base64 encoding if needed
        const customBtoa = global.btoa || ((str: string) => Buffer.from(str, 'binary').toString('base64'));
        const customAtob = global.atob || ((b64: string) => Buffer.from(b64, 'base64').toString('binary'));

        // 4. Construct the execution environment
        // Nuvio plugins declare `async function getStreams(...)` in their code.
        const executor = new Function(
            'require',
            'console',
            'fetch',
            'btoa',
            'atob',
            'module',
            'exports',
            'global',
            `
                // 1. Evaluate the plugin code (this will define getStreams in this scope)
                ${pluginCode};
                
                // 2. Ensure getStreams was defined
                let streamFunc = null;
                if (typeof getStreams === 'function') {
                    streamFunc = getStreams;
                } else if (module && module.exports && typeof module.exports.getStreams === 'function') {
                    streamFunc = module.exports.getStreams;
                } else if (typeof exports.getStreams === 'function') {
                    streamFunc = exports.getStreams;
                }
                
                if (!streamFunc) {
                    throw new Error("getStreams function not found in plugin code.");
                }
                
                // 3. Execute and return the promise
                return streamFunc("${tmdbId}", "${mediaType}", ${season}, ${episode});
            `
        );

        // 5. Execute
        const customExports = {};
        const customModule = { exports: customExports };

        // Proxy TMDB requests & Add User-Agent for Android TV
        const customFetch = (url: RequestInfo | URL | any, options?: RequestInit) => {
            let fetchUrl = typeof url === 'string' ? url : String(url);
            if (fetchUrl.includes('api.themoviedb.org/3/')) {
                fetchUrl = fetchUrl.replace('https://api.themoviedb.org/3/', 'https://web.rogplay.app/api/tmdb/');
            }
            
            const newOptions = { ...options };
            const defaultUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
            
            if (newOptions.headers) {
                const plainHeaders: Record<string, string> = {};
                let hasUA = false;
                
                // Handle different headers formats (Headers object, arrays, or plain object)
                if (newOptions.headers instanceof Headers) {
                    newOptions.headers.forEach((value, key) => {
                        plainHeaders[key] = value;
                        if (key.toLowerCase() === 'user-agent') hasUA = true;
                    });
                } else if (Array.isArray(newOptions.headers)) {
                    newOptions.headers.forEach(([key, value]) => {
                        plainHeaders[key] = value;
                        if (key.toLowerCase() === 'user-agent') hasUA = true;
                    });
                } else {
                    Object.entries(newOptions.headers).forEach(([key, value]) => {
                        plainHeaders[key] = String(value);
                        if (key.toLowerCase() === 'user-agent') hasUA = true;
                    });
                }
                
                if (!hasUA) {
                    plainHeaders['User-Agent'] = defaultUA;
                }
                newOptions.headers = plainHeaders;
            } else {
                newOptions.headers = {
                    'User-Agent': defaultUA
                };
            }
            
            return fetch(fetchUrl, newOptions);
        };

        const customGlobal = { btoa: customBtoa, atob: customAtob, fetch: customFetch, console: customConsole };

        const result = await executor(
            customRequire,
            customConsole,
            customFetch,
            customBtoa,
            customAtob,
            customModule,
            customExports,
            customGlobal
        );

        if (Array.isArray(result)) {
            return result;
        }
        if (result && Array.isArray(result.streams)) {
            return result.streams;
        }
        
        return [];
        
    } catch (e: any) {
        console.error(`Plugin execution error for TMDB ${tmdbId}:`, e.message || e);
        return [];
    }
};
