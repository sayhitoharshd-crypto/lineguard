import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listenReports, listenAppeals, markGuilty, dismissReport, verifyAppealClaim, resolveAppeal } from '../firebase/db';
import { toast } from '../components/ui';
import { C, G } from '../theme';

function EvidenceVideo({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return <VideoView player={player} style={{ width: '100%', height: 210 }} contentFit="contain" nativeControls />;
}

export default function StaffScreen() {
  const [reports, setReports] = useState(null);
  const [appeals, setAppeals] = useState([]);
  const [tab, setTab] = useState('Reports');
  const [acting, setActing] = useState('');
  const [subjectKeys, setSubjectKeys] = useState({});
  useEffect(() => { const a = listenReports(setReports); const b = listenAppeals(setAppeals); return () => { a(); b(); }; }, []);

  const open = (reports || []).filter((r) => r.status === 'pending');
  const done = (reports || []).filter((r) => r.status !== 'pending');
  const run = async (id, fn, msg) => { setActing(id); try { await fn(); toast(msg); } catch (e) { toast(e?.message || 'Staff action failed'); } setActing(''); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.off }} edges={['top']}>
      <LinearGradient colors={G.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Staff 👮</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginTop: 2 }}>Review reports and appeals</Text>
      </LinearGradient>
      {reports === null ? <ActivityIndicator style={{ marginTop: 40 }} color={C.purple} /> : (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[[open.length, 'Open', G.purplePink], [done.length, 'Resolved', G.green], [appeals.length, 'Appeals', ['#f97316', '#ec4899']]].map(([n, l, g]) => (
              <LinearGradient key={l} colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{n}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '800' }}>{l}</Text>
              </LinearGradient>
            ))}
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 4, marginBottom: 14, borderWidth: 1.5, borderColor: C.border }}>
            {['Reports', 'Appeals'].map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                {tab === t ? <LinearGradient colors={G.purplePink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 10, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{t}</Text></LinearGradient>
                  : <View style={{ padding: 10, alignItems: 'center' }}><Text style={{ color: C.light, fontWeight: '800', fontSize: 13 }}>{t}</Text></View>}
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'Reports' && (open.length === 0 ? <Text style={{ textAlign: 'center', color: C.xlight, fontWeight: '800', padding: 30 }}>✅ All clear</Text> : open.map((r) => (
            <View key={r.id} style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 12, borderWidth: 2, borderColor: C.purple2 }}>
              {r.mediaURL && r.mediaType !== 'video' ? <Image source={{ uri: r.mediaURL }} style={{ width: '100%', height: 170 }} resizeMode="cover" /> : null}
              {r.mediaType === 'video' && r.mediaURL ? <EvidenceVideo uri={r.mediaURL} /> : null}
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: C.purple }}>📍 {r.locationName}</Text>
                {r.address && r.address !== r.locationName ? <Text style={{ fontSize: 12, color: C.light, fontWeight: '700', marginTop: 2 }}>{r.address}</Text> : null}
                {r.note ? <Text style={{ fontSize: 13, color: C.muted, fontWeight: '700', marginTop: 8, lineHeight: 19 }}>{r.note}</Text> : null}
                <Text style={{ fontSize: 12, color: C.xlight, fontWeight: '800', marginTop: 8, marginBottom: 8 }}>Community votes are context only. Staff must decide from evidence.</Text>
                <TextInput value={subjectKeys[r.id] || ''} onChangeText={(v) => setSubjectKeys((old) => ({ ...old, [r.id]: v }))} placeholder="Internal subject reference (same person = same code)" placeholderTextColor={C.xlight} autoCapitalize="none" maxLength={64} style={{ backgroundColor: C.off, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 11, color: C.text, fontSize: 12, fontWeight: '700', marginBottom: 10 }} />
                <Text style={{ color: C.xlight, fontSize: 10, fontWeight: '700', marginBottom: 10 }}>Optional. Use a non-identifying code, never a name, phone number or plate number. A board entry appears only after 2 staff-verified reports share this code.</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={{ flex: 1, borderRadius: 50, overflow: 'hidden' }} disabled={acting === r.id}
                    onPress={() => Alert.alert('Mark guilty?', 'This records a staff-reviewed finding. It does not publish a person’s identity. A repeat-offender entry requires the same internal subject reference on at least two reviewed reports.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Mark guilty', style: 'destructive', onPress: () => run(r.id, () => markGuilty(r, (subjectKeys[r.id] || '').trim()), 'Marked guilty after staff review') }])}>
                    <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 12, alignItems: 'center' }}>
                      {acting === r.id ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>🚩 Guilty</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={acting === r.id} onPress={() => run(r.id, () => dismissReport(r), 'Dismissed (reporter −20)')} style={{ paddingHorizontal: 20, justifyContent: 'center', borderRadius: 50, borderWidth: 2, borderColor: C.border }}>
                    <Text style={{ color: C.light, fontWeight: '800', fontSize: 13 }}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )))}

          {tab === 'Appeals' && (appeals.length === 0 ? <Text style={{ textAlign: 'center', color: C.xlight, fontWeight: '800', padding: 30 }}>⚖️ No pending appeals</Text> : appeals.map((a) => (
            <View key={a.id} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: '#fca5a5' }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: C.red, marginBottom: 6 }}>⚖️ Appeal · {(reports || []).find((r) => r.id === a.reportId)?.locationName || 'Report details unavailable'}</Text>
              <Text style={{ fontSize: 13, color: C.muted, fontWeight: '700', lineHeight: 19, marginBottom: 6 }}>{a.reason}</Text>
              {a.contact ? <Text style={{ fontSize: 11, color: C.purple, fontWeight: '800', marginBottom: 8 }}>Claimant contact: {a.contact}</Text> : null}
              <Text style={{ fontSize: 10, color: C.xlight, fontWeight: '800', marginBottom: 12 }}>Claimant identity verified: {a.claimantIdentityVerified ? 'Yes' : 'No — verify separately before treating this as the subject’s appeal'}</Text>
              {!a.claimantIdentityVerified ? <TouchableOpacity disabled={acting === a.id} onPress={() => Alert.alert('Verify claimant identity', 'Only mark this after checking reliable evidence that the claimant is the person affected. This check happens outside LineGuard.', [{ text: 'Cancel', style: 'cancel' }, { text: 'I verified them', onPress: () => run(a.id, () => verifyAppealClaim(a), 'Claimant identity marked verified') }])} style={{ padding: 11, borderRadius: 12, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', marginBottom: 10 }}><Text style={{ color: '#9a3412', fontSize: 12, fontWeight: '900', textAlign: 'center' }}>🔎 Verify claimant identity before deciding</Text></TouchableOpacity> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={{ flex: 1, borderRadius: 50, overflow: 'hidden', opacity: a.claimantIdentityVerified ? 1 : 0.45 }} disabled={acting === a.id || !a.claimantIdentityVerified} onPress={() => run(a.id, () => resolveAppeal(a, true), 'Appeal approved, finding removed')}>
                  <LinearGradient colors={G.green} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>✅ Approve and remove</Text></LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity disabled={acting === a.id || !a.claimantIdentityVerified} onPress={() => run(a.id, () => resolveAppeal(a, false), 'Appeal rejected')} style={{ paddingHorizontal: 18, justifyContent: 'center', borderRadius: 50, borderWidth: 2, borderColor: '#fca5a5' }}>
                  <Text style={{ color: C.red, fontWeight: '800', fontSize: 13 }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
