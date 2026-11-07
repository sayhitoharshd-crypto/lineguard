import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../firebase/AuthContext';
import { listenPosts, post, likePost, getMyLike } from '../firebase/db';
import { toast } from '../components/ui';
import { C } from '../theme';

const TOPICS = ['All', 'RTO', 'Railway', 'Airport', 'Hospital', 'Mall', 'Police', 'General'];
const GR = [['#a855f7', '#ec4899'], ['#7c3aed', '#db2777'], ['#ec4899', '#f97316'], ['#06b6d4', '#a855f7'], ['#f97316', '#ec4899']];

function ago(ts) {
  if (!ts?.toDate) return 'just now';
  const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [topic, setTopic] = useState('All');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [myLikes, setMyLikes] = useState({});
  useEffect(() => listenPosts(setPosts), []);
  useEffect(() => {
    let live = true;
    async function loadLikes() {
      const ids = (posts || []).map((p) => p.id);
      const pairs = await Promise.all(ids.map(async (id) => [id, await getMyLike(id, user.uid).catch(() => false)]));
      if (live) setMyLikes(Object.fromEntries(pairs));
    }
    if (posts && user?.uid) loadLikes();
    return () => { live = false; };
  }, [posts, user?.uid]);
  const list = (posts || []).filter((p) => topic === 'All' || p.topic === topic);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try { await post({ text: text.trim(), topic: topic === 'All' ? 'General' : topic }); setText(''); toast('Posted +2 rep'); }
    catch (e) { toast('Could not post'); }
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.off }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={['#7c3aed', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Community 💬</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginTop: 2, marginBottom: 10 }}>Queue culture · each post earns +2 rep</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TOPICS.map((t) => (
              <TouchableOpacity key={t} onPress={() => setTopic(t)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, marginRight: 8, backgroundColor: topic === t ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: topic === t ? C.purple : '#fff' }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {posts === null ? <ActivityIndicator style={{ marginTop: 40 }} color={C.purple} /> : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
            {list.length === 0 && <Text style={{ textAlign: 'center', color: C.xlight, fontWeight: '800', marginTop: 40, lineHeight: 22 }}>No posts yet.{'\n'}Start the conversation!</Text>}
            {list.map((p, i) => {
              const liked = !!myLikes[p.id];
              return (
                <View key={p.id} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: C.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <LinearGradient colors={GR[i % GR.length]} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{(p.name || 'A')[0].toUpperCase()}</Text>
                      </LinearGradient>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: C.text }}>{p.name || 'Anonymous'}</Text>
                        <Text style={{ fontSize: 11, color: C.xlight, fontWeight: '700' }}>{ago(p.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: C.off, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.border }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: C.purple }}>{p.topic}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, color: C.text, lineHeight: 21, fontWeight: '600', marginBottom: 10 }}>{p.text}</Text>
                  <TouchableOpacity disabled={liked} onPress={async () => { try { await likePost(p.id); setMyLikes((old) => ({ ...old, [p.id]: true })); } catch (e) { toast(e?.message || 'Could not like post'); } }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, backgroundColor: liked ? C.purple2 : C.off }}>
                    <Text>❤️</Text>
                    <Text style={{ fontWeight: '900', fontSize: 13, color: liked ? '#fff' : C.purple }}>{p.likes || 0}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Share your experience…" placeholderTextColor={C.xlight} maxLength={300}
            style={{ flex: 1, backgroundColor: C.off, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, fontWeight: '700', borderWidth: 1.5, borderColor: C.border }} />
          <TouchableOpacity onPress={send} disabled={!text.trim() || busy} style={{ opacity: text.trim() ? 1 : 0.4 }}>
            <LinearGradient colors={['#a855f7', '#ec4899']} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>↑</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
