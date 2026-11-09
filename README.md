# Expo Calculator

A clean, theme-aware calculator built with [Expo](https://expo.dev) and
[Expo Router](https://docs.expo.dev/router/introduction). Runs on iOS, Android
and the web from one codebase.

## Features

- The four basic operations, with a running expression line (`12 × 4`) above the
  result so you can see what you're in the middle of.
- `AC`, sign toggle, percent, decimal point and backspace.
- Left-to-right calculator math, exactly like a pocket calculator — `2 + 3 × 4`
  is `20`, not `14`.
- Floating point noise is cleaned up, so `0.1 + 0.2` shows `0.3`.
- Divides by zero gracefully: the display shows `Error` and only `AC` clears it.
- Large results switch to scientific notation (`1.23457e13`).
- Follows the system light/dark theme, with accessible labels on every key.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

From there you can open the app in a [development build](https://docs.expo.dev/develop/development-builds/introduction/),
an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/),
the [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/), or
[Expo Go](https://expo.dev/go).

## Project layout

| Path                    | What lives there                                              |
| ----------------------- | ------------------------------------------------------------- |
| `src/app/_layout.tsx`   | Root layout — theme provider and the single-screen stack.      |
| `src/app/index.tsx`     | The calculator screen: display, keypad and key components.     |
| `src/lib/calculator.ts` | The calculator state machine. Pure functions, no React.        |
| `src/constants/theme.ts`| Colour tokens for both themes plus spacing and fonts.          |

The math lives in `src/lib/calculator.ts` as pure `state => state` transitions,
so it can be tested without rendering anything:

```ts
import { equals, initialState, inputDigit, inputOperator } from '@/lib/calculator';

// Simulates tapping 1, +, 2, =
let state = inputDigit(initialState, '1');
state = inputOperator(state, '+');
state = inputDigit(state, '2');
equals(state).display; // "3"
```

## Type checking

```bash
npx tsc --noEmit
```

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router documentation](https://docs.expo.dev/router/introduction)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
