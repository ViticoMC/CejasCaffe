const { withAppBuildGradle } = require('@expo/config-plugins');

const KEYSTORE_PROPERTIES_BLOCK = `def keystorePropertiesFile = rootProject.file("../signing/keystore.properties")
def keystoreProperties = new Properties()

if (!keystorePropertiesFile.exists()) {
    throw new GradleException("Falta signing/keystore.properties para firmar el release")
}

keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

`;

const RELEASE_SIGNING_CONFIG = `        release {
            storeFile rootProject.file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
`;

function applySigning(contents) {
  let result = contents;

  if (!result.includes('keystorePropertiesFile')) {
    if (/def projectRoot = .*\n/.test(result)) {
      result = result.replace(/(def projectRoot = .*\n)/, `$1\n${KEYSTORE_PROPERTIES_BLOCK}`);
    } else {
      result = result.replace(/(\nandroid \{)/, `\n${KEYSTORE_PROPERTIES_BLOCK}$1`);
    }
  }

  if (!result.includes("keystoreProperties['keyAlias']")) {
    if (/signingConfigs \{\n\s*debug \{/.test(result)) {
      result = result.replace(/(signingConfigs \{\n)/, `$1${RELEASE_SIGNING_CONFIG}`);
    } else {
      throw new Error(
        'No se pudo inyectar signingConfigs.release: formato de build.gradle no reconocido'
      );
    }
  }

  if (!/release \{[\s\S]*?signingConfig signingConfigs\.release/.test(result)) {
    const targeted = result.replace(
      /(release \{\s*(?:\/\/[^\n]*\n\s*)*)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );

    if (targeted !== result) {
      result = targeted;
    } else {
      let seen = 0;
      result = result.replace(/signingConfig signingConfigs\.debug/g, (match) => {
        seen += 1;
        return seen === 2 ? 'signingConfig signingConfigs.release' : match;
      });

      if (seen < 2) {
        throw new Error('No se pudo apuntar buildTypes.release a signingConfigs.release');
      }
    }
  }

  return result;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = applySigning(config.modResults.contents);
    return config;
  });
};

module.exports.applySigning = applySigning;
