const { withAndroidManifest } = require('@expo/config-plugins');

const withUsesFeature = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = [];
    }

    const features = [
      'android.hardware.touchscreen',
      'android.hardware.faketouch',
      'android.software.leanback',
      'android.hardware.microphone',
      'android.hardware.telephony',
      'android.hardware.camera',
      'android.hardware.bluetooth',
      'android.hardware.nfc',
      'android.hardware.gps',
      'android.hardware.screen.portrait',
    ];

    features.forEach((feature) => {
      const existingFeature = manifest['uses-feature'].find(
        (f) => f.$ && f.$['android:name'] === feature
      );
      if (!existingFeature) {
        manifest['uses-feature'].push({
          $: {
            'android:name': feature,
            'android:required': 'false',
          },
        });
      } else {
        existingFeature.$['android:required'] = 'false';
      }
    });

    return config;
  });
};

module.exports = withUsesFeature;
