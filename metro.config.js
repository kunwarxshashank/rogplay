const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore "node:" imports from quickjs-emscripten so Metro doesn't crash
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.startsWith('node:')) {
        return {
            type: 'empty',
        };
    }
    // Optionally, also mock non-prefixed built-ins if they appear
    const nodeCoreModules = ['fs', 'path', 'module', 'url'];
    if (nodeCoreModules.includes(moduleName)) {
        return {
            type: 'empty',
        };
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
