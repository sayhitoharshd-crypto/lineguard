import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAuth } from '../firebase/AuthContext';
import { listenReports, castVote, getMyVote } from '../firebase/db';
import { C, G } from '../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_HEIGHT = SCREEN_HEIGHT - 78;

function ReelCard({ item, active, user, navigation }) {
  const [busy, setBusy] = useState(false);
  const [myVote, setMyVote] = useState(null);
  const player = useVideoPlayer(item.mediaURL, (p) => { p.loop = true; });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  useEffect(() => {
    let live = true;
    setMyVote(null);
    if (user?.uid) getMyVote(item.id, user.uid).then((v) => { if (live) setMyVote(v); }).catch(() => {});
    return () => { live = false; };
  }, [item.id, user?.uid]);

  const yes = item.votes?.yes || 0;
  const no = item.votes?.no || 0;
  const total = yes + no;

  async function vote(value) {
    if (!user) {
      Alert.alert('Join the conversation', 'You can browse videos as a guest. Sign in anonymously or with Google to vote.');
      navigation?.navigate('Sign in');
      return;
    }
    if (myVote) return Alert.alert('Vote already recorded', 'Each account gets one community vote per video.');
    setBusy(true);
    try {
      await castVote(item.id, user.uid, value);
      setMyVote(value);
    } catch (e) {
      Alert.alert('Could not record vote', e?.message || 'Please try again.');
    }
    setBusy(false);
  }

  return (
    <View style={{ height: PAGE_HEIGHT, width: SCREEN_WIDTH, backgroundColor: '#090914' }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
      <LinearGradient colors={['transparent', 'rgba(5,5,18,0.35)', 'rgba(5,5,18,0.96)']} locations={[0.25, 0.58, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 }} />
      <View style={{ position: 'absolute', left: 18, right: 88, bottom: 28 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 }}>UNDER REVIEW</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 21, fontWeight: '900', marginBottom: 5 }}>Incident reported</Text>
        <Text style={{ color: '#f3e8ff', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>📍 {item.locationName || 'Location not provided'}</Text>
        {item.note ? <Text numberOfLines={3} style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 19, marginBottom: 10 }}>{item.note}</Text> : null}
        <Text style={{ color: 'rgba(255,255,255,0.58)', fontSize: 10, lineHeight: 15 }}>Community votes are opinions, not a legal finding. A report is not treated as verified unless reviewed by LineGuard staff.</Text>
      </View>
      <View style={{ position: 'absolute', right: 14, bottom: 34, alignItems: 'center', gap: 12 }}>
        <TouchableOpacity disabled={busy || !!myVote} onPress={() => vote('yes')} style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: myVote === 'yes' ? '#16a34a' : 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 22 }}>👍</Text>}
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>Guilty</Text>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{yes}</Text>
        <TouchableOpacity disabled={busy || !!myVote} onPress={() => vote('no')} style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: myVote === 'no' ? '#2563eb' : 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>👎</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>Not guilty</Text>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{no}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{total} votes</Text>
      </View>
    </View>
  );
}

export default function ReelsScreen({ navigation }) {
  const { user } = useAuth();
  const [reports, setReports] = useState(null);
  const [active, setActive] = useState(0);
  useEffect(() => listenReports(setReports), []);

  const videos = useMemo(() => (reports || []).filter((r) => r.mediaURL && r.mediaType === 'video' && r.status === 'pending'), [reports]);

  return (
    <View style={{ flex: 1, backgroundColor: '#090914' }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', zIndex: 2, top: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>LineGuard <Text style={{ color: '#e879f9' }}>Reels</Text></Text>
        <TouchableOpacity onPress={() => user ? Alert.alert('You are signed in', 'You can vote on videos as you browse.') : navigation?.navigate('Sign in')} style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{user ? 'ACCOUNT' : 'JOIN / SIGN IN'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
      {reports === null ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#e879f9" size="large" /><Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Loading community videos…</Text></View>
      ) : videos.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>🎬</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' }}>Your feed starts here</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>No public videos yet. When people upload incident videos, they will appear here for the community to review.</Text>
          {!user ? <TouchableOpacity onPress={() => navigation?.navigate('Sign in')} style={{ marginTop: 20, backgroundColor: '#a855f7', borderRadius: 30, paddingHorizontal: 22, paddingVertical: 12 }}><Text style={{ color: '#fff', fontWeight: '900' }}>Sign in to participate</Text></TouchableOpacity> : null}
        </View>
      ) : (
        <FlatList data={videos} keyExtractor={(item) => item.id} pagingEnabled showsVerticalScrollIndicator={false} snapToInterval={PAGE_HEIGHT} decelerationRate="fast" onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.y / PAGE_HEIGHT))} getItemLayout={(_, index) => ({ length: PAGE_HEIGHT, offset: PAGE_HEIGHT * index, index })} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} renderItem={({ item, index }) => <ReelCard item={item} active={index === active} user={user} navigation={navigation} />} />
      )}
    </View>
  );
}
