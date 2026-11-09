/**
 * The calculator's brain — a pure state machine with no React, no navigation and
 * no platform APIs in it. Keeping the math separate from the UI means the whole
 * thing can be reasoned about (and tested) without rendering anything.
 *
 * Every handler takes the current state and returns the next one, so the screen
 * only ever has to do: `setState((state) => inputDigit(state, '7'))`.
 */

export type Operator = '+' | '-' | '×' | '÷';

export type CalculatorState = {
  /** The text on the big display line. Always a string so `0.` and `-` survive. */
  display: string;
  /** Left-hand side of the operation waiting to be applied. */
  accumulator: number | null;
  /** The operation waiting to be applied, if any. */
  pending: Operator | null;
  /** When true the next digit replaces the display instead of appending to it. */
  replace: boolean;
  /** Sticky error flag (divide by zero, overflow) — only AC clears it. */
  error: boolean;
};

/** How many significant digits we keep before switching to exponential notation. */
export const MAX_DISPLAY_DIGITS = 12;

export const initialState: CalculatorState = {
  display: '0',
  accumulator: null,
  pending: null,
  replace: false,
  error: false,
};

/** Compact scientific notation: `1.23457e13` rather than `1.234570e+13`. */
function toExponentialString(value: number): string {
  const [mantissa, exponent] = value.toExponential(5).split('e');
  const trimmed = mantissa.replace(/0+$/, '').replace(/\.$/, '');
  // `Number('+13')` is `13`, so the leading plus sign disappears too.
  return `${trimmed}e${Number(exponent)}`;
}

/**
 * Turn a raw JS number into something a human wants to read.
 *
 * Floating point maths is the reason this exists: `0.1 + 0.2` is
 * `0.30000000000000004` in IEEE 754. Rounding to 12 significant digits and
 * parsing it back into a number drops that noise without losing real precision.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return 'Error';
  }
  // Normalising through `toPrecision` also collapses `-0` into `0`.
  const cleaned = Number(value.toPrecision(MAX_DISPLAY_DIGITS));
  if (cleaned === 0) {
    return '0';
  }
  const magnitude = Math.abs(cleaned);
  // Outside this window plain decimal notation stops being readable on a phone,
  // so switch to scientific notation. The result is still a valid Number() input.
  if (magnitude >= 1e13 || magnitude < 1e-11) {
    return toExponentialString(cleaned);
  }
  return String(cleaned);
}

function compute(left: number, right: number, operator: Operator): number {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '×':
      return left * right;
    case '÷':
      // Let this become Infinity/NaN so `formatNumber` can turn it into `Error`.
      return right === 0 ? Number.NaN : left / right;
  }
}

function toError(state: CalculatorState): CalculatorState {
  return { ...state, display: 'Error', accumulator: null, pending: null, replace: true, error: true };
}

/**
 * The small line above the result, e.g. `12 ×` or `12 × 4`. Derived from state
 * rather than stored, so it can never drift out of sync with the display.
 */
export function expressionFor(state: CalculatorState): string {
  if (state.error || state.accumulator === null || state.pending === null) {
    return '';
  }
  const left = formatNumber(state.accumulator);
  return state.replace ? `${left} ${state.pending}` : `${left} ${state.pending} ${state.display}`;
}

export function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.error) {
    return inputDigit({ ...initialState }, digit);
  }
  if (state.replace) {
    return { ...state, display: digit, replace: false };
  }
  // No leading zeros: `0` then `5` is `5`, not `05`.
  if (state.display === '0') {
    return { ...state, display: digit };
  }
  const digitsOnly = state.display.replace(/[-.]/g, '');
  if (digitsOnly.length >= MAX_DISPLAY_DIGITS) {
    return state;
  }
  return { ...state, display: state.display + digit };
}

export function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.error) {
    return { ...initialState, display: '0.', replace: false };
  }
  if (state.replace) {
    return { ...state, display: '0.', replace: false };
  }
  if (state.display.includes('.')) {
    return state;
  }
  return { ...state, display: `${state.display}.` };
}

export function inputOperator(state: CalculatorState, operator: Operator): CalculatorState {
  if (state.error) {
    return state;
  }
  // Pressing a second operator swaps the pending one instead of computing.
  if (state.pending === null || state.replace) {
    return { ...state, accumulator: Number(state.display), pending: operator, replace: true };
  }
  const result = compute(state.accumulator ?? Number(state.display), Number(state.display), state.pending);
  if (!Number.isFinite(result)) {
    return toError(state);
  }
  // Chain off the *formatted* result so the maths matches what was on screen.
  const display = formatNumber(result);
  return { display, accumulator: Number(display), pending: operator, replace: true, error: false };
}

export function equals(state: CalculatorState): CalculatorState {
  if (state.error) {
    return state;
  }
  if (state.pending === null || state.accumulator === null) {
    return { ...state, replace: true };
  }
  const result = compute(state.accumulator, Number(state.display), state.pending);
  if (!Number.isFinite(result)) {
    return toError(state);
  }
  const display = formatNumber(result);
  return { display, accumulator: null, pending: null, replace: true, error: false };
}

export function clear(): CalculatorState {
  return { ...initialState };
}

export function toggleSign(state: CalculatorState): CalculatorState {
  if (state.error || state.display === '0') {
    return state;
  }
  const display = state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`;
  return { ...state, display };
}

export function percent(state: CalculatorState): CalculatorState {
  if (state.error) {
    return state;
  }
  return { ...state, display: formatNumber(Number(state.display) / 100) };
}

export function backspace(state: CalculatorState): CalculatorState {
  if (state.error) {
    return clear();
  }
  // Nothing meaningful to delete while a fresh operand is about to be typed.
  if (state.replace) {
    return state;
  }
  const next = state.display.slice(0, -1);
  if (next === '' || next === '-') {
    return { ...state, display: '0' };
  }
  return { ...state, display: next };
}
