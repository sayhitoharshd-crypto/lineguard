import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';

export function Btn({ title, onPress, kind = 'white', busy, disabled, style, color }) {
  const base = { borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginBottom: 11, opacity: disabled ? 0.5 : 1 };
  const inner = busy ? <ActivityIndicator color={kind === 'white' ? C.purple : '#fff'} /> : null;
  if (kind === 'grad' || kind === 'green') {
    const colors = kind === 'grad' ? ['#a855f7', '#ec4899'] : ['#10b981', '#06b6d4'];
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={disabled || busy} style={style}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={base}>
          {inner || <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>{title}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  const st = kind === 'white'
    ? { backgroundColor: '#fff' }
    : kind === 'ghost'
      ? { borderWidth: 1.5, borderColor: C.border }
      : { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' };
  const tc = kind === 'white' ? (color || C.purple) : kind === 'ghost' ? C.light : '#fff';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={disabled || busy} style={[base, st, style]}>
      {inner || <Text style={{ color: tc, fontSize: 15, fontWeight: '900' }}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Pill({ text, bg = C.amberBg, color = C.amber }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 10, fontWeight: '900' }}>{text}</Text>
    </View>
  );
}

let _toast = null;
export const toast = (m) => _toast && _toast(m);
export function ToastHost() {
  const [msg, setMsg] = useState('');
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    _toast = (m) => {
      setMsg(m);
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2300),
        Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    };
    return () => { _toast = null; };
  }, []);
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { opacity: op }]}>
      <Text style={s.toastTxt}>{msg}</Text>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#1a1a2e', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 12, zIndex: 999, maxWidth: '88%' },
  toastTxt: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
