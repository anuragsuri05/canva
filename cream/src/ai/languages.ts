// 100+ languages (ISO 639-1 / MyMemory codes). rtl = right-to-left script.
export const LANGUAGES: { code: string; name: string; rtl?: boolean }[] = [
  { code: 'af', name: 'Afrikaans' }, { code: 'sq', name: 'Albanian' }, { code: 'am', name: 'Amharic' }, { code: 'ar', name: 'Arabic', rtl: true },
  { code: 'hy', name: 'Armenian' }, { code: 'as', name: 'Assamese' }, { code: 'az', name: 'Azerbaijani' }, { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' }, { code: 'bn', name: 'Bengali' }, { code: 'bs', name: 'Bosnian' }, { code: 'bg', name: 'Bulgarian' },
  { code: 'my', name: 'Burmese' }, { code: 'ca', name: 'Catalan' }, { code: 'ceb', name: 'Cebuano' }, { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' }, { code: 'co', name: 'Corsican' }, { code: 'hr', name: 'Croatian' }, { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' }, { code: 'dv', name: 'Dhivehi', rtl: true }, { code: 'nl', name: 'Dutch' }, { code: 'en', name: 'English' },
  { code: 'eo', name: 'Esperanto' }, { code: 'et', name: 'Estonian' }, { code: 'fil', name: 'Filipino' }, { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' }, { code: 'fy', name: 'Frisian' }, { code: 'gl', name: 'Galician' }, { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' }, { code: 'gu', name: 'Gujarati' }, { code: 'ht', name: 'Haitian Creole' },
  { code: 'ha', name: 'Hausa' }, { code: 'haw', name: 'Hawaiian' }, { code: 'he', name: 'Hebrew', rtl: true }, { code: 'hi', name: 'Hindi' },
  { code: 'hmn', name: 'Hmong' }, { code: 'hu', name: 'Hungarian' }, { code: 'is', name: 'Icelandic' }, { code: 'ig', name: 'Igbo' },
  { code: 'id', name: 'Indonesian' }, { code: 'ga', name: 'Irish' }, { code: 'it', name: 'Italian' }, { code: 'ja', name: 'Japanese' },
  { code: 'jv', name: 'Javanese' }, { code: 'kn', name: 'Kannada' }, { code: 'kk', name: 'Kazakh' }, { code: 'km', name: 'Khmer' },
  { code: 'rw', name: 'Kinyarwanda' }, { code: 'ko', name: 'Korean' }, { code: 'ku', name: 'Kurdish' }, { code: 'ky', name: 'Kyrgyz' },
  { code: 'lo', name: 'Lao' }, { code: 'la', name: 'Latin' }, { code: 'lv', name: 'Latvian' }, { code: 'lt', name: 'Lithuanian' },
  { code: 'lb', name: 'Luxembourgish' }, { code: 'mk', name: 'Macedonian' }, { code: 'mg', name: 'Malagasy' }, { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' }, { code: 'mt', name: 'Maltese' }, { code: 'mi', name: 'Maori' }, { code: 'mr', name: 'Marathi' },
  { code: 'mn', name: 'Mongolian' }, { code: 'ne', name: 'Nepali' }, { code: 'no', name: 'Norwegian' }, { code: 'ny', name: 'Nyanja (Chichewa)' },
  { code: 'or', name: 'Odia (Oriya)' }, { code: 'ps', name: 'Pashto', rtl: true }, { code: 'fa', name: 'Persian', rtl: true }, { code: 'pl', name: 'Polish' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' }, { code: 'pt-PT', name: 'Portuguese (Portugal)' }, { code: 'pa', name: 'Punjabi' }, { code: 'qu', name: 'Quechua' },
  { code: 'ro', name: 'Romanian' }, { code: 'ru', name: 'Russian' }, { code: 'sm', name: 'Samoan' }, { code: 'gd', name: 'Scots Gaelic' },
  { code: 'sr', name: 'Serbian' }, { code: 'st', name: 'Sesotho' }, { code: 'sn', name: 'Shona' }, { code: 'sd', name: 'Sindhi', rtl: true },
  { code: 'si', name: 'Sinhala' }, { code: 'sk', name: 'Slovak' }, { code: 'sl', name: 'Slovenian' }, { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' }, { code: 'es-MX', name: 'Spanish (Mexico)' }, { code: 'su', name: 'Sundanese' }, { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' }, { code: 'tg', name: 'Tajik' }, { code: 'ta', name: 'Tamil' }, { code: 'tt', name: 'Tatar' },
  { code: 'te', name: 'Telugu' }, { code: 'th', name: 'Thai' }, { code: 'ti', name: 'Tigrinya' }, { code: 'tr', name: 'Turkish' },
  { code: 'tk', name: 'Turkmen' }, { code: 'uk', name: 'Ukrainian' }, { code: 'ur', name: 'Urdu', rtl: true }, { code: 'ug', name: 'Uyghur', rtl: true },
  { code: 'uz', name: 'Uzbek' }, { code: 'vi', name: 'Vietnamese' }, { code: 'cy', name: 'Welsh' }, { code: 'xh', name: 'Xhosa' },
  { code: 'yi', name: 'Yiddish', rtl: true }, { code: 'yo', name: 'Yoruba' }, { code: 'zu', name: 'Zulu' },
];

export const langName = (code: string) => LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase())?.name ?? code;
export const isRtl = (code: string) => !!LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase())?.rtl;

/** Resolve a language from free text ("spanish", "es", "Español"…). */
export function findLanguage(q: string): { code: string; name: string; rtl?: boolean } | undefined {
  const s = q.trim().toLowerCase();
  const alias: Record<string, string> = { español: 'es', espanol: 'es', français: 'fr', francais: 'fr', deutsch: 'de', chinese: 'zh-CN', mandarin: 'zh-CN', portuguese: 'pt-BR', brazilian: 'pt-BR', farsi: 'fa', tagalog: 'fil' };
  if (alias[s]) return LANGUAGES.find((l) => l.code === alias[s]);
  return LANGUAGES.find((l) => l.code.toLowerCase() === s) ?? LANGUAGES.find((l) => l.name.toLowerCase() === s) ?? LANGUAGES.find((l) => l.name.toLowerCase().startsWith(s));
}
