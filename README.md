# 👑 Empire English Community

> Speak like an Emperor. — *Sponsored by MacLempire*

An imperial-themed English pronunciation dictionary for **iOS & Android**, built with
React Native (Expo). It teaches the **American accent**, breaks words into **syllables**
with stress, shows **IPA**, gives a **logical Arabic meaning** (not a literal translation),
and pronounces **full sentences** — because a word inside a sentence sounds different
from the word on its own.

This is **Phase 1 — "The Core."**

---

## ✨ What's inside (Phase 1)

- 🏛️ **Cinematic imperial gate** (splash) with the brand emblem + MacLempire sponsorship.
- 🔊 **American-accent pronunciation** for words *and* full sentences (offline device voice).
- 🐢 **Slow / Normal** speed control for clearer learning.
- 🧩 **Syllable breakdown** with the stressed syllable highlighted (tap any syllable to hear it).
- 🔤 **IPA** for US (and UK where available).
- 🌍 **Logical Arabic meaning** for every word.
- 📖 **Definition + example sentence** (with its own pronounce button).
- 🕘 **History & 🔖 Bookmarks** stored locally (offline).
- 🟡 Full **gold-on-black imperial** design system derived from the logo.

### Online ↔ Offline behavior
| Feature | Offline | Notes |
|---|---|---|
| Pronunciation (words & sentences) | ✅ | Device `en-US` voice via `expo-speech` |
| Curated dictionary (30 seed words) | ✅ | Bundled in `src/data/dictionary.ts` |
| Any other word | 🌐 | Falls back to `dictionaryapi.dev` when online |
| Arabic for curated words | ✅ | Hand-written meanings |
| Arabic for online words / sentences | 🌐 | Online translation fallback |

> Design goal: **offline-first**, with an optional path to add a premium online
> "Authentic Voice" (neural TTS) later — the speech layer (`src/services/speech.ts`)
> is built so that can be slotted in without touching the screens.

---

## 🚀 Run it

Requires Node 18+ and the **Expo Go** app on your phone (or an emulator/simulator).

```bash
npm install
npx expo start
```

Then:
- 📱 Scan the QR code with **Expo Go** (Android) or the Camera app (iOS), **or**
- press `a` for an Android emulator, `i` for an iOS simulator (macOS).

> Note: `react-native-reanimated` v4 requires `react-native-worklets`, and the Babel
> plugin is configured in `babel.config.js` as `react-native-worklets/plugin`.

---

## 🗂️ Project structure

```
app/                        # expo-router screens
  _layout.tsx               # root stack + providers
  index.tsx                 # imperial splash / gate
  (tabs)/
    _layout.tsx             # bottom tabs (Dictionary | Sentences)
    index.tsx               # Home: search, Word of the Day, tiles, history
    sentence.tsx            # Sentence Studio (full-sentence pronunciation)
  word/[word].tsx           # Word detail: pronounce, syllables, IPA, meaning, example
src/
  theme/                    # colors, gradients, spacing, typography (gold/black)
  components/               # RoyalBackground, EmpireLogo, GoldButton, EmpireCard,
                            # SpeakerButton, SectionLabel, OrnamentDivider
  data/                     # types + curated offline dictionary
  services/                 # speech (TTS), dictionary lookup, translation, storage
```

---

## 🧭 Roadmap

- ✅ **Phase 1 — The Core:** pronunciation (words & sentences), syllables, IPA, Arabic
  meaning, definition, history, bookmarks.
- ✅ **Phase 2 — The Journey:** XP & imperial ranks (Citizen → Knight → Commander →
  Emperor), daily streak, "Learn this word" lessons with a quiz, Notes, My Empire tab.
- ✅ **Phase 3 — The Full Empire:** Conquest Map (themed provinces that unlock as you
  master words), Achievements/Badges, and multi-language translation (Arabic offline +
  12 world languages online, chosen via the in-word Language Picker).
- ⏭️ **Next:** Shadowing (record your voice & compare — needs microphone), an optional
  online "Authentic Voice" (neural American TTS), and a community leaderboard.
