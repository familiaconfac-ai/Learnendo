import { createContext, useContext } from 'react';
import type { UiLanguage } from './uiLabels';

// Presentation consumers receive the already resolved Phase 2 values. No target inference or storage.
const UiLanguageContext = createContext<{ uiLanguage: UiLanguage; baseLanguage: UiLanguage }>({ uiLanguage: 'en', baseLanguage: 'en' });
export const UiLanguageProvider = UiLanguageContext.Provider;
export const useUiLanguage = () => useContext(UiLanguageContext);
