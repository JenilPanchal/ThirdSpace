import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export function Control({
  label,
  onPress,
  selected = false,
  primary = false,
  preferred = false,
  color,
  testID,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  primary?: boolean;
  preferred?: boolean;
  color?: string;
  testID?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected, disabled}}
      disabled={disabled}
      hasTVPreferredFocus={preferred}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        s.button,
        primary && s.primary,
        selected && s.selected,
        focused && s.focused,
        disabled && s.disabled,
      ]}>
      {color && <View style={[s.swatch, {backgroundColor: color}]} />}
      <Text style={[s.text, (primary || selected) && s.light]}>
        {label}
        {selected ? '  ✓' : ''}
      </Text>
      {primary && <Text style={s.arrow}>→</Text>}
    </Pressable>
  );
}
const s = StyleSheet.create({
  disabled: {opacity: 0.45},
  button: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#EAE8DF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: {
    minHeight: 54,
    backgroundColor: '#294D43',
    justifyContent: 'space-between',
    gap: 28,
  },
  selected: {backgroundColor: '#294D43'},
  focused: {borderColor: '#D78154', transform: [{scale: 1.035}]},
  text: {fontSize: 16, fontWeight: '500', color: '#31473E'},
  light: {color: '#FFF9EB'},
  swatch: {
    width: 19,
    height: 19,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#FFFFFF70',
  },
  arrow: {fontSize: 23, color: '#F2D795'},
});
