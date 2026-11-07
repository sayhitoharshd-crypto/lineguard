import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Modal, TextInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listenShameboard, listenReports, fileAppeal, getMyAppeal } from '../firebase/db';
import { useAuth } from '../firebase/AuthContext';
import { Btn, toast } from '../components/ui';
import { C, G } from '../theme';

export default function ShameScreen() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [findings, setFindings] = useState(null);
  const [error, setError] = useState(false);
  const [appealFor, setAppealFor] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [appealContact, setAppealContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [appealStates, setAppealStates] = useState({});
  useEffect(() => listenShameboard(setSubjects, () => setError(true)), []);
  useEffect(() => listenReports((rows) => setFindings(rows.filter((r) => r.status === 'guilty'))), []);
  useEffect(() => {
    let live = true;
    async function loadAppeals() {
      const ids = [...new Set([...(subjects || []).flatMap((s) => s.reportIds || []), ...(findings || []).map((r) => r.id)])];
      const pairs = await Promise.all(ids.map(async (id) => [id, await getMyAppeal(id, user.uid).catch(() => null)]));
      if (live) setAppealStates(Object.fromEntries(pairs));
    }
    if (subjects && findings && user?.uid) loadAppeals();
    return () => { live = false; };
  }, [subjects, findings, user?.uid]);

  async function sendAppeal() {
    if (!appealText.trim()) return toast('Explain why you are requesting a review');
    setBusy(true);
    try { await fileAppeal(appealFor.reportId, user.uid, appealText.trim(), appealContact.trim()); setAppealStates((old) => ({ ...old, [appealFor.reportId]: { status: 'pending' } })); setAppealFor(null); setAppealText(''); setAppealContact(''); toast('Review request submitted. Staff will verify the claimant before deciding.'); }
    catch (e) { toast(e?.message || 'Could not submit request'); }
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.off }} edges={['top']}>
      <LinearGradient colors={G.purplePink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Shameboard 🏴</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 3 }}>Repeat findings · staff reviewed only</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 34 }}>
        <View style={{ backgroundColor: '#fff7ed', borderRadius: 16, borderWidth: 1, borderColor: '#fed7aa', padding: 13, marginBottom: 14 }}>
          <Text style={{ color: '#9a3412', fontSize: 12, lineHeight: 18, fontWeight: '700' }}>A community vote is not proof. Entries appear only when at least two separate reports have been reviewed and marked guilty by staff using the same internal subject reference. Names and photos stay hidden in this version.</Text>
        </View>
        {subjects === null ? <ActivityIndicator style={{ marginTop: 35 }} color={C.purple} /> : error ? (
          <Text style={{ color: C.red, textAlign: 'center', fontWeight: '800', padding: 24 }}>Could not load the Shameboard. Check your connection and Firestore rules.</Text>
        ) : subjects.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 38 }}>
            <Text style={{ fontSize: 48 }}>🛡️</Text>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '900', marginTop: 10 }}>No repeat findings yet</Text>
            <Text style={{ color: C.xlight, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 19, marginTop: 6 }}>Only staff-reviewed findings count. Pending reports and community votes never appear here.</Text>
          </View>
        ) : subjects.map((s) => (
          <View key={s.id} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <LinearGradient colors={G.deep} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Text style={{ color: '#fff', fontSize: 23 }}>◈</Text></LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '900' }}>{s.label || 'Repeat finding'}</Text>
                <Text style={{ color: C.light, fontSize: 11, fontWeight: '700', marginTop: 3 }}>Identity withheld · due-process safeguards</Text>
              </View>
              <View style={{ backgroundColor: '#f3e8ff', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ color: C.purple, fontSize: 20, fontWeight: '900' }}>{s.verifiedCount}</Text>
                <Text style={{ color: C.purple, fontSize: 9, fontWeight: '900' }}>FINDINGS</Text>
              </View>
            </View>
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', lineHeight: 17, marginTop: 12 }}>Count reflects distinct reports marked guilty by staff. It is not a criminal conviction or a community popularity score. Identity remains withheld.</Text>
            {(s.reportLocations || []).map((finding) => <View key={finding.reportId} style={{ marginTop: 8, backgroundColor: C.off, borderRadius: 10, padding: 9 }}><Text style={{ color: C.muted, fontSize: 11, fontWeight: '800' }}>📍 {finding.locationName || 'Location not provided'}</Text></View>)}
          </View>
        ))}
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '900', marginTop: 18, marginBottom: 9 }}>Staff-reviewed findings</Text>
        <Text style={{ color: C.light, fontSize: 11, fontWeight: '700', lineHeight: 17, marginBottom: 10 }}>A person can request review of any staff-reviewed finding, even if it has not reached the repeat-offender threshold.</Text>
        {findings === null ? <ActivityIndicator color={C.purple} /> : findings.length === 0 ? <Text style={{ color: C.xlight, fontSize: 12, fontWeight: '700', padding: 12 }}>No staff-reviewed findings yet.</Text> : findings.map((finding) => {
          const appeal = appealStates[finding.id];
          const status = appeal?.status;
          return <View key={finding.id} style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: C.border, padding: 13, marginBottom: 9 }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '900' }}>📍 {finding.locationName || 'Location not provided'}</Text>
            {finding.note ? <Text style={{ color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }}>{finding.note}</Text> : null}
            <TouchableOpacity disabled={!!status} onPress={() => { setAppealFor({ reportId: finding.id, label: finding.locationName }); setAppealText(''); setAppealContact(''); }} style={{ marginTop: 10, paddingVertical: 9, borderRadius: 30, borderWidth: 1.5, borderColor: status ? C.border : '#fca5a5', alignItems: 'center' }}>
              <Text style={{ color: status ? C.light : C.red, fontSize: 11, fontWeight: '900' }}>{status === 'pending' ? '⏳ Review request pending' : status === 'approved' ? '✓ Appeal approved' : status === 'rejected' ? 'Appeal reviewed' : '⚖️ Request review of finding'}</Text>
            </TouchableOpacity>
          </View>;
        })}
      </ScrollView>
      <Modal visible={!!appealFor} transparent animationType="slide" onRequestClose={() => setAppealFor(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
            <Text style={{ color: C.text, fontSize: 19, fontWeight: '900' }}>Request a review ⚖️</Text>
            <Text style={{ color: C.light, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 6, marginBottom: 12 }}>This is a claim, not proof that you are the person in the report. Staff must verify your identity separately before deciding it.</Text>
            <TextInput value={appealText} onChangeText={setAppealText} multiline maxLength={600} placeholder="Explain why this finding should be reviewed…" placeholderTextColor={C.xlight} style={{ minHeight: 100, textAlignVertical: 'top', backgroundColor: C.off, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, color: C.text, fontWeight: '700', marginBottom: 10 }} />
            <TextInput value={appealContact} onChangeText={setAppealContact} maxLength={120} placeholder="Optional contact email or phone for verification" placeholderTextColor={C.xlight} autoCapitalize="none" keyboardType="email-address" style={{ backgroundColor: C.off, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, color: C.text, fontWeight: '700', marginBottom: 12 }} />
            <Text style={{ color: C.xlight, fontSize: 10, fontWeight: '700', marginBottom: 10 }}>Do not send Aadhaar, passwords, or other highly sensitive documents in this form.</Text>
            <Btn kind="grad" title="Submit review request" onPress={sendAppeal} busy={busy} />
            <Btn kind="ghost" title="Cancel" onPress={() => setAppealFor(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
