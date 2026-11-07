import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../firebase/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { submitReport } from '../firebase/db';
import { Btn, toast } from '../components/ui';
import { C, G, MIN_REP, repLevel } from '../theme';

const HOME = 0, LOC = 1, MEDIA = 2, REVIEW = 3, SENT = 4;

function LocalVideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; });
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls />;
}

export default function ReportScreen({ navigation }) {
  const { user, rep } = useAuth();
  const { place, busy: gpsBusy, error: gpsError, detect, setPlace } = useLocation();
  const [step, setStep] = useState(HOME);
  const [manual, setManual] = useState('');
  const [media, setMedia] = useState(null); // {uri,type}
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const locName = manual.trim() || place?.name || '';
  const lvl = repLevel(rep);

  function start() {
    if (rep < MIN_REP) {
      Alert.alert('Reporting paused', `Your reputation is ${rep}. You need ${MIN_REP}+ to report.\n\nPost in Community (+2) to recover your reputation.`);
      return;
    }
    setStep(LOC);
  }

  async function capture(kind) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera permission needed', 'Allow camera access in Settings > Apps > LineGuard.'); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: kind === 'video' ? ['videos'] : ['images'], quality: 0.7, videoMaxDuration: 30 });
    if (!r.canceled && r.assets?.[0]) { setMedia({ uri: r.assets[0].uri, type: kind, mimeType: r.assets[0].mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg') }); toast(kind === 'video' ? 'Video recorded' : 'Photo taken'); }
  }
  async function gallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access in Settings.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      setMedia({ uri: a.uri, type: a.type === 'video' ? 'video' : 'photo', mimeType: a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg') });
      toast('File selected');
    }
  }

  async function send() {
    if (!locName) { Alert.alert('Location needed', 'Detect or type where this happened.'); return; }
    setSending(true);
    try {
      await submitReport({
        uid: user.uid, locationName: locName,
        address: manual.trim() || place?.address, lat: manual.trim() ? null : place?.lat, lng: manual.trim() ? null : place?.lng,
        mediaUri: media?.uri, mediaType: media?.type, mediaMimeType: media?.mimeType, note: note.trim(),
      });
      setStep(SENT);
    } catch (e) {
      Alert.alert('Could not submit', 'Check internet and that Firestore and Storage rules are published.\n\n' + (e?.message || ''));
    }
    setSending(false);
  }

  function reset() { setStep(HOME); setManual(''); setMedia(null); setNote(''); setPlace(null); }

  const Steps = ({ n }) => (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
      {[1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i < n ? '#fff' : i === n ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)' }} />)}
    </View>
  );
  const Wrap = ({ colors, children }) => (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
  const H = ({ t, s }) => (<><Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>{t}</Text><Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginTop: 4, marginBottom: 18 }}>{s}</Text></>);

  if (step === HOME) return (
    <Wrap colors={G.main}>
      <Text style={{ fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginTop: 8 }}>LINEGUARD</Text>
      <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1.5, lineHeight: 40, marginBottom: 6 }}>Stop line{'\n'}cutters.</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginBottom: 18 }}>Works anywhere in India and worldwide.</Text>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 18, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>⭐ Reputation · {lvl.label}</Text>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{rep} pts</Text>
        </View>
        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, (rep / 200) * 100)}%`, height: '100%', backgroundColor: rep >= 75 ? '#4ade80' : rep >= MIN_REP ? '#fbbf24' : '#f87171', borderRadius: 8 }} />
        </View>
      </View>
      <Btn title="🚩  Flag a line cutter" onPress={start} />
      <Btn kind="outline" title="🏴  See the shame board" onPress={() => navigation.navigate('Shame')} />
    </Wrap>
  );

  if (step === LOC) return (
    <Wrap colors={['#7c3aed', '#ec4899']}>
      <Steps n={1} />
      <H t="Where are you? 📍" s="Real GPS, works anywhere in the world" />
      <TouchableOpacity activeOpacity={0.85} onPress={detect} disabled={gpsBusy} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {gpsBusy ? <ActivityIndicator color={C.purple} /> : <Text style={{ fontSize: 26 }}>📡</Text>}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: C.text }}>{gpsBusy ? 'Finding you…' : 'Detect my location'}</Text>
          <Text style={{ fontSize: 12, color: C.light, fontWeight: '700', marginTop: 1 }}>Uses your phone's GPS</Text>
        </View>
      </TouchableOpacity>
      {place && !manual ? (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, color: C.purple, fontWeight: '900', marginBottom: 4 }}>📍 DETECTED</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{place.name}</Text>
          <Text style={{ fontSize: 12, color: C.light, fontWeight: '700', marginTop: 2 }}>{place.address}</Text>
        </View>
      ) : null}
      {gpsError ? <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, marginBottom: 10 }}>⚠️ {gpsError}</Text> : null}
      <Text style={{ color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: 12, textAlign: 'center', marginVertical: 8 }}>or type the place name</Text>
      <TextInput value={manual} onChangeText={setManual} placeholder="e.g. Andheri RTO, Mumbai" placeholderTextColor={C.light}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, fontSize: 14, color: C.text, fontWeight: '700', marginBottom: 16 }} />
      <Btn title="Next →" onPress={() => { if (!locName) { Alert.alert('Location needed', 'Detect or type your location.'); return; } setStep(MEDIA); }} />
      <Btn kind="outline" title="Back" onPress={() => setStep(HOME)} />
    </Wrap>
  );

  if (step === MEDIA) return (
    <Wrap colors={['#7c3aed', '#a855f7', '#ec4899']}>
      <Steps n={2} />
      <H t="Add evidence 📸" s="Photo or video. You stay anonymous." />
      {!media ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            {[['📷', 'Take photo', () => capture('photo')], ['🎥', 'Record video', () => capture('video')]].map(([i, t, f]) => (
              <TouchableOpacity key={t} onPress={f} activeOpacity={0.8} style={{ flex: 1, paddingVertical: 22, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', gap: 7 }}>
                <Text style={{ fontSize: 32 }}>{i}</Text>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={gallery} activeOpacity={0.8} style={{ borderWidth: 2.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)', borderRadius: 20, padding: 22, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12 }}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>🖼️</Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Upload from gallery</Text>
          </TouchableOpacity>
          <Btn kind="outline" title="Skip, alert only" onPress={() => setStep(REVIEW)} />
        </>
      ) : (
        <>
          <View style={{ height: 230, borderRadius: 20, overflow: 'hidden', backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            {media.type === 'video'
              ? <LocalVideoPreview uri={media.uri} />
              : <Image source={{ uri: media.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
          </View>
          <Btn title="Next →" onPress={() => setStep(REVIEW)} />
          <Btn kind="outline" title="Retake" onPress={() => setMedia(null)} />
        </>
      )}
    </Wrap>
  );

  if (step === REVIEW) return (
    <Wrap colors={['#ec4899', '#f97316']}>
      <Steps n={3} />
      <H t="Confirm and send 🚨" s="One last look" />
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14 }}>
        {[['📍 Place', locName], ['📸 Evidence', media ? (media.type === 'video' ? 'Video' : 'Photo') : 'None'], ['🔒 Reporter', 'Account name is not shown publicly'], ['⭐ Your rep', `${rep} pts`]].map(([l, v], i, a) => (
          <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: i < a.length - 1 ? 1 : 0, borderColor: '#faf5ff' }}>
            <Text style={{ color: C.light, fontWeight: '700', fontSize: 13 }}>{l}</Text>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 13, flex: 1, textAlign: 'right', marginLeft: 10 }} numberOfLines={2}>{v}</Text>
          </View>
        ))}
      </View>
      <TextInput value={note} onChangeText={setNote} placeholder="What happened? (optional)" placeholderTextColor={C.light} multiline maxLength={200}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, fontSize: 14, color: C.text, fontWeight: '700', minHeight: 70, textAlignVertical: 'top', marginBottom: 10 }} />
      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 13, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, lineHeight: 18 }}>
          ⚠️ Your account name is hidden from public report cards, but uploaded footage can still reveal faces, voices or other identifying details. Review media before uploading. Dismissed reports cost <Text style={{ fontWeight: '900' }}>20 pts</Text>. Confirmed ones earn <Text style={{ fontWeight: '900' }}>10 pts</Text>.
        </Text>
      </View>
      <Btn title="🚨  Submit report" onPress={send} busy={sending} color={C.pink} />
      <Btn kind="outline" title="Cancel" onPress={reset} />
    </Wrap>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.off }}>
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <LinearGradient colors={G.main} style={{ borderRadius: 26, padding: 28, alignItems: 'center', marginVertical: 14 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={{ fontSize: 54 }}>🎉</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 8 }}>Report sent</Text>
          <Text style={{ color: 'rgba(255,255,255,0.88)', fontWeight: '700', textAlign: 'center', marginTop: 6, lineHeight: 21 }}>Staff will review it. You stay anonymous.</Text>
        </LinearGradient>
        <Btn kind="grad" title="Back to home" onPress={reset} />
      </ScrollView>
    </SafeAreaView>
  );
}
