export type Syllable = {
  text: string;
  /** True for the stressed syllable (primary stress). */
  stressed?: boolean;
};

export type WordEntry = {
  word: string;
  /** American pronunciation in IPA, e.g. /ˈletər/ */
  ipaUS: string;
  /** British pronunciation in IPA (optional). */
  ipaUK?: string;
  /** Syllable breakdown with stress marked. */
  syllables: Syllable[];
  partOfSpeech: string;
  /** English definition. */
  definition: string;
  /** Logical Arabic meaning (not a literal word-for-word translation). */
  arabic: string;
  /** Example sentence in English. */
  example: string;
  /** Arabic gloss of the example (meaning, not literal). */
  exampleArabic?: string;
  synonyms?: string[];
  /** Where this entry came from. */
  source?: 'offline' | 'online';
};
