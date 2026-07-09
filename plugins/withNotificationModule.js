const {
  withPlugins,
  withDangerousMod,
  withMainApplication,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const KOTLIN_FILES = [
  'NotificationModule.kt',
  'NotificationPackage.kt',
  'NotificationService.kt',
];

const REGISTER_LINE = '              add(NotificationPackage())';
const ANCHOR =
  '// Packages that cannot be autolinked yet can be added manually here, for example:';

const SERVICE_NAME = '.NotificationService';
const SUBTYPE = 'Timer for water drinking reminders';

const withCopyKotlin = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = cfg.android && cfg.android.package;
      if (!pkg) throw new Error('android.package missing in app.json');
      const projectRoot = cfg.modRequest.projectRoot;
      const pkgPath = pkg.replace(/\./g, '/');
      const src = path.join(
        projectRoot,
        'plugins/notification-module/android/src/main/java',
        pkgPath
      );
      const dest = path.join(
        projectRoot,
        'android/app/src/main/java',
        pkgPath
      );
      fs.mkdirSync(dest, { recursive: true });
      for (const f of KOTLIN_FILES) {
        fs.copyFileSync(path.join(src, f), path.join(dest, f));
      }
      return cfg;
    },
  ]);

const withRegisterPackage = (config) =>
  withMainApplication(config, (cfg) => {
    const file = cfg.modResults;
    if (file.contents.includes('add(NotificationPackage())')) return cfg;
    if (!file.contents.includes(ANCHOR)) {
      throw new Error(
        'MainApplication anchor not found — Expo template changed?'
      );
    }
    file.contents = file.contents.replace(
      ANCHOR,
      `${ANCHOR}\n${REGISTER_LINE}`
    );
    return cfg;
  });

const withNotificationService = (config) =>
  withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults
    );
    app.service = app.service || [];
    if (app.service.some((s) => s.$['android:name'] === SERVICE_NAME)) {
      return cfg;
    }
    app.service.push({
      $: {
        'android:name': SERVICE_NAME,
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': SUBTYPE,
          },
        },
      ],
    });
    return cfg;
  });

const withNotificationModule = (config) =>
  withPlugins(config, [
    withCopyKotlin,
    withRegisterPackage,
    withNotificationService,
  ]);

module.exports = withNotificationModule;
