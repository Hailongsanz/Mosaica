import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';
import { de } from 'date-fns/locale/de';
import { it } from 'date-fns/locale/it';
import { pt } from 'date-fns/locale/pt';
import { zhCN } from 'date-fns/locale/zh-CN';
import { ja } from 'date-fns/locale/ja';
import { ko } from 'date-fns/locale/ko';
import { ar } from 'date-fns/locale/ar';

const LOCALE_MAP = {
  en: enUS,
  es,
  fr,
  de,
  it,
  pt,
  zh: zhCN,
  ja,
  ko,
  ar,
};

/** Returns the date-fns locale object for a given language code. Defaults to enUS. */
export function getDateLocale(language) {
  return LOCALE_MAP[language] || enUS;
}
