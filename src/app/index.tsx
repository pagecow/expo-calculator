import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxCalculatorWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  backspace,
  clear,
  equals,
  expressionFor,
  initialState,
  inputDecimal,
  inputDigit,
  inputOperator,
  percent,
  toggleSign,
  type CalculatorState,
  type Operator,
} from '@/lib/calculator';

type KeyKind = 'digit' | 'function' | 'operator';

type Key = {
  /** What is printed on the key. */
  label: string;
  kind: KeyKind;
  /** Spoken by screen readers. Falls back to the label. */
  accessibilityLabel?: string;
  /** Pure transition: current state in, next state out. */
  onPress: (state: CalculatorState) => CalculatorState;
};

function digitKey(digit: string): Key {
  return {
    label: digit,
    kind: 'digit',
    accessibilityLabel: digit,
    onPress: (state) => inputDigit(state, digit),
  };
}

function operatorKey(operator: Operator, name: string, label: string = operator): Key {
  return {
    label,
    kind: 'operator',
    accessibilityLabel: name,
    onPress: (state) => inputOperator(state, operator),
  };
}

/** The keypad, read top-to-bottom and left-to-right exactly like it looks. */
const KEYPAD: Key[][] = [
  [
    { label: 'AC', kind: 'function', accessibilityLabel: 'All clear', onPress: clear },
    { label: '±', kind: 'function', accessibilityLabel: 'Toggle sign', onPress: toggleSign },
    { label: '%', kind: 'function', accessibilityLabel: 'Percent', onPress: percent },
    operatorKey('÷', 'Divide'),
  ],
  [digitKey('7'), digitKey('8'), digitKey('9'), operatorKey('×', 'Multiply')],
  [digitKey('4'), digitKey('5'), digitKey('6'), operatorKey('-', 'Subtract', '−')],
  [digitKey('1'), digitKey('2'), digitKey('3'), operatorKey('+', 'Add')],
  [
    digitKey('0'),
    {
      label: '.',
      kind: 'digit',
      accessibilityLabel: 'Decimal point',
      onPress: inputDecimal,
    },
    {
      label: '⌫',
      kind: 'function',
      accessibilityLabel: 'Delete last digit',
      onPress: backspace,
    },
    {
      label: '=',
      kind: 'operator',
      accessibilityLabel: 'Equals',
      onPress: equals,
    },
  ],
];

/** Shrink the result line as the number grows so it never overflows. */
function resultFontSize(display: string): number {
  if (display.length <= 8) return 76;
  if (display.length <= 12) return 58;
  return 44;
}

function CalculatorKey({ item, onPress }: { item: Key; onPress: (item: Key) => void }) {
  const theme = useTheme();
  const background =
    item.kind === 'operator'
      ? theme.keyOperator
      : item.kind === 'function'
        ? theme.keyFunction
        : theme.keyDigit;
  const color =
    item.kind === 'operator'
      ? theme.keyOperatorText
      : item.kind === 'function'
        ? theme.keyFunctionText
        : theme.keyDigitText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.key,
        { backgroundColor: background, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Text style={[styles.keyLabel, { color }]}>{item.label}</Text>
    </Pressable>
  );
}

export default function CalculatorScreen() {
  const theme = useTheme();
  const [state, setState] = useState<CalculatorState>(initialState);

  const handlePress = useCallback((item: Key) => {
    setState((current) => item.onPress(current));
  }, []);

  const operatorInProgress = state.pending !== null && !state.replace;

  return (
    <View style={[styles.container, { backgroundColor: theme.calculatorBackground }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.sheet}>
          <View style={styles.display}>
            <Text style={[styles.expression, { color: theme.textSecondary }]} numberOfLines={1}>
              {expressionFor(state)}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={[
                styles.result,
                {
                  color: operatorInProgress ? theme.textSecondary : theme.text,
                  fontSize: resultFontSize(state.display),
                },
              ]}>
              {state.display}
            </Text>
          </View>

          <View style={styles.keypad}>
            {KEYPAD.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((item) => (
                  <CalculatorKey key={item.label} item={item} onPress={handlePress} />
                ))}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxCalculatorWidth,
  },
  sheet: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  display: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  expression: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  result: {
    width: '100%',
    lineHeight: 84,
    fontWeight: '300',
    letterSpacing: -1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  keypad: {
    flex: 2.2,
    gap: Spacing.three,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  keyLabel: {
    fontSize: 30,
    fontWeight: '500',
  },
});
