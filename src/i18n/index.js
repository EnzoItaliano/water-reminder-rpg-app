import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import pt from '../locales/pt.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  fr: { translation: fr },
  es: { translation: es },
};

// A language detector compatible with i18next
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      
      const locale = Localization.getLocales()[0]?.languageCode;
      if (locale && resources[locale]) {
        return callback(locale);
      }
      return callback('en');
    } catch (error) {
      console.log('Error reading language', error);
      return callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: (language) => {
    AsyncStorage.setItem('appLanguage', language).catch(() => {});
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
