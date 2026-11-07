import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../firebase/AuthContext';
import { listenRepLog } from '../firebase/db';
import { Btn } from '../components/ui';
import { C, G, MIN_REP, repLevel } from '../theme';

export default function ProfileScreen() {
  const { user, profile, rep, logout, displayName, staff } = useAuth();
  const [log, setLog] = useState([]);
  useEffect(() => listenRepLog(user.uid, setLog), [user.uid]);
  const lvl = repLevel(rep);
  const pct = Math.min(100, Math.max(0, (rep / 200) * 100));
  const Box = ({ n, l, bg, c }) => (
    <View style={{ width: '48%', backgroundColor: bg, borderRadius: 16, padding: 12, alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: '900', color: c }}>{n}</Text>
      <Text style={{ fontSize: 10, color: C.light, fontWeight: '800', marginTop: 2 }}>{l}</Text>
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.off }} edges={['top']}>
      <LinearGradient colors={G.purplePink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>{displayName} ⭐</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginTop: 2 }}>{user.isAnonymous ? 'Anonymous account' : user.email}{staff ? ' · Staff' : ''}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 18, borderWidth: 1.5, borderColor: C.border, marginBottom: 14 }}>
          <Text style={{ fontSize: 54, fontWeight: '900', textAlign: 'center', color: lvl.color }}>{rep}</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', textAlign: 'center', color: lvl.color, marginBottom: 14 }}>{lvl.label}</Text>
          <View style={{ height: 10, backgroundColor: C.border, borderRadius: 10, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: rep >= 75 ? '#4ade80' : rep >= MIN_REP ? '#fbbf24' : '#f87171' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, marginBottom: 14 }}>
            <Text style={{ fontSize: 10, color: C.light, fontWeight: '700' }}>0</Text>
            <Text style={{ fontSize: 10, color: C.light, fontWeight: '700' }}>{MIN_REP} min to report</Text>
            <Text style={{ fontSize: 10, color: C.light, fontWeight: '700' }}>200</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Box n={profile?.reports || 0} l="Reports" bg={C.off} c={C.purple2} />
            <Box n={profile?.confirmed || 0} l="Confirmed" bg={C.greenBg} c={C.green} />
            <Box n={profile?.dismissed || 0} l="Dismissed" bg={C.redBg} c={C.red} />
            <Box n={profile?.posts || 0} l="Posts" bg="#fff7ed" c={C.orange} />
          </View>
        </View>

        <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: C.xlight, marginBottom: 8 }}>HOW REPUTATION WORKS</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: C.border, marginBottom: 14 }}>
          {[['File a report', 'free'], ['Report confirmed guilty', '+10'], ['Report dismissed', '−20'], ['Community post', '+2'], [`Below ${MIN_REP}`, 'reporting paused']].map(([a, b], i, arr) => (
            <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: C.off }}>
              <Text style={{ fontSize: 13, color: C.muted, fontWeight: '700' }}>{a}</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: b.startsWith('+') ? C.green : b.startsWith('−') || b.includes('paused') ? C.red : C.text }}>{b}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: C.xlight, marginBottom: 8 }}>RECENT ACTIVITY</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: C.border, marginBottom: 18 }}>
          {log.length === 0 && <Text style={{ color: C.xlight, fontWeight: '700', fontSize: 13 }}>Nothing yet.</Text>}
          {log.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
              <Text style={{ fontSize: 13, color: C.muted, fontWeight: '700' }}>{l.why}</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: l.delta > 0 ? C.green : C.red }}>{l.delta > 0 ? '+' : ''}{l.delta}</Text>
            </View>
          ))}
        </View>
        <Btn kind="ghost" title="Sign out" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}
