const { withProjectBuildGradle, withAndroidManifest } = require('@expo/config-plugins');

const withNotifee = (config) => {
  config = withProjectBuildGradle(config, async (config) => {
    const buildGradle = config.modResults.contents;

    const notifeeRepo = `\n        maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`;

    if (!buildGradle.includes('notifee/react-native/android/libs')) {
      config.modResults.contents = buildGradle.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        `allprojects {\n  repositories {${notifeeRepo}`
      );
    }

    return config;
  });

  config = withAndroidManifest(config, async (config) => {
    const app = config.modResults.manifest.application[0];

    if (!app.service) {
      app.service = [];
    }

    const notifeeService = app.service.find(
      (s) => s.$['android:name'] === 'app.notifee.core.ForegroundService'
    );

    if (notifeeService) {
      notifeeService.$['android:foregroundServiceType'] = 'dataSync|shortService';
    } else {
      app.service.push({
        $: {
          'android:name': 'app.notifee.core.ForegroundService',
          'android:foregroundServiceType': 'dataSync|shortService'
        }
      });
    }

    return config;
  });

  return config;
};

module.exports = withNotifee;
