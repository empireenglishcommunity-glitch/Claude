# 👑 Empire English Community

> Speak like an Emperor. — *Sponsored by MacLempire*

An imperial-themed English pronunciation dictionary for **iOS & Android**, built with
React Native (Expo Router). It teaches the **American accent**, breaks words into
**syllables** with stress, shows **IPA**, gives a **logical Arabic meaning** (not a
literal translation), and pronounces **full sentences**.

This repository is **Phase 1 — "The Core"** (rebuilt from the project spec).

---

## ✨ What's inside (Phase 1)

- 🏛️ **Cinematic imperial gate** (splash) with the brand emblem + MacLempire sponsorship.
- 🔊 **American-accent pronunciation** for words *and* full sentences (offline device voice).
- 🐢 **Slow / Normal** speed control for clearer learning.
- 🧩 **Syllable breakdown** with the stressed syllable highlighted (tap any syllable to hear it).
- 🔤 **IPA** for US (and UK where available).
- 🌍 **Logical Arabic meaning** for every curated word.
- 📖 **Definition + example sentence** (with its own pronounce button).
- 🕘 **History & 🔖 Bookmarks** stored locally (offline).
- 🟡 Full **gold-on-black imperial** design system.

### Online ↔ Offline behavior
| Feature | Offline | Notes |
|---|---|---|
| Pronunciation (words & sentences) | ✅ | Device `en-US` voice via `expo-speech` |
| Curated dictionary (30 seed words) | ✅ | Bundled in `src/data/dictionary.ts` |
| Any other word | 🌐 | Falls back to `dictionaryapi.dev` when online |
| Arabic for curated words | ✅ | Hand-written meanings |
| Arabic for online words / sentences | 🌐 | Online translation fallback |

---

## 🚀 Run it on your phone (Expo Go + Tunnel)

You need **Node 18+** and the **Expo Go** app on your phone.

```bash
# 1) Install the base packages
npm install

# 2) Add the Expo SDK packages at versions matched to your installed SDK
npm run setup

# 3) Start the dev server with a tunnel (works on any network)
npx expo start --tunnel
```

Then scan the QR code with **Expo Go** (Android) or the **Camera** app (iOS).

> 💡 `npm run setup` runs `expo install ...` followed by `expo install --fix`, so every
> dependency lands on the exact version that matches the Expo SDK on your machine — this
> avoids version-mismatch errors regardless of which SDK is current.

### Troubleshooting
- **"This project requires a newer/older version of Expo Go":** run `npm run fix`
  (`expo install --fix`) and restart, or update the Expo Go app from the store.
- **Tunnel won't connect:** try `npx expo start --tunnel --clear`, or use `--lan` on the
  same Wi‑Fi.
- **Nothing speaks:** make sure your phone isn't on silent and the media volume is up.

---

## 🗂️ Project structure

```
app/                        # expo-router screens
  _layout.tsx               # root stack + SafeAreaProvider
  index.tsx                 # imperial splash / gate
  (tabs)/
    _layout.tsx             # bottom tabs (Dictionary | Sentences)
    index.tsx               # Home: search, Word of the Day, tiles, history
    sentence.tsx            # Sentence Studio (full-sentence pronunciation)
  word/[word].tsx           # Word detail: pronounce, syllables, IPA, meaning, example
src/
  theme/                    # colors, gradients, spacing, typography (gold/black)
  components/               # RoyalBackground, EmpireLogo, GoldButton, EmpireCard,
                            # SpeakerButton, SectionLabel, OrnamentDivider, SyllableBreakdown
  data/                     # types + curated offline dictionary
  services/                 # speech (TTS), dictionary lookup, translation, storage
```

---

## 🧭 Roadmap

- ✅ **Phase 1 — The Core:** pronunciation (words & sentences), syllables, IPA, Arabic
  meaning, definition, history, bookmarks. *(this repo)*
- ⏭️ **Phase 2 — The Journey:** XP & imperial ranks, daily streak, lessons + quiz, Notes.
- ⏭️ **Phase 3 — The Full Empire:** Conquest Map, Achievements, multi-language translation.
- ⏭️ **Phase 4 — Voice & Community:** online Authentic Voice, Shadowing, Settings, leaderboard.

---

### Notes on the speech layer
`src/services/speech.ts` is intentionally isolated so a premium online **Authentic Voice**
(neural TTS) can be slotted in later without touching any screen.
