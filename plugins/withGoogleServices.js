const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const CLASSPATH_LINE = "    classpath 'com.google.gms:google-services:4.4.1'";
const APPLY_LINE = "apply plugin: 'com.google.gms.google-services'";

const withGoogleServicesClasspath = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('com.google.gms:google-services')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      'dependencies {',
      `dependencies {\n${CLASSPATH_LINE}`
    );
    return cfg;
  });

const withGoogleServicesApply = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('com.google.gms.google-services')) {
      return cfg;
    }
    cfg.modResults.contents = `${cfg.modResults.contents}\n${APPLY_LINE}\n`;
    return cfg;
  });

const withGoogleServices = (config) =>
  withGoogleServicesApply(withGoogleServicesClasspath(config));

module.exports = withGoogleServices;
