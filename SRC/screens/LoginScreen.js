
import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../firebase/AuthContext';
import { Btn } from '../components/ui';
import { G } from '../theme';

export default function LoginScreen({ onBrowse }) {
  const { signInGoogle, signInAnon, googleReady } = useAuth();
  const [busy, setBusy] = useState('');

  const run = async (k, fn) => {
    setBusy(k);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Sign in failed', String(e?.message || e));
    }
    setBusy('');
  };

  return (
    <LinearGradient
      colors={G.main}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          padding: 24
        }}>
          <View style={{ alignItems: 'center', marginTop: 36 }}>
            <Image
              source={require('../../Assets/icon.png')}
              style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                marginBottom: 18
              }}
            />

            <Text style={{
              fontSize: 38,
              fontWeight: '900',
              color: '#fff',
              letterSpacing: -2
            }}>
              LineGuard
            </Text>

            <Text style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.85)',
              fontWeight: '700',
              marginTop: 8,
              textAlign: 'center',
              lineHeight: 22
            }}>
              Report line cutters silently.{'\n'}No shouting. No arguments.
            </Text>
          </View>

          <View style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 18,
            padding: 14,
            marginVertical: 22,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)'
          }}>
            <Text style={{
              color: '#fff',
              fontWeight: '900',
              fontSize: 12,
              marginBottom: 5
            }}>
              ⭐ Reputation keeps reports honest
            </Text>

            <Text style={{
              color: 'rgba(255,255,255,0.75)',
              fontWeight: '700',
              fontSize: 11,
              lineHeight: 17
            }}>
              Start with 100 points. Dismissed reports cost 20.
              Confirmed ones earn 10. Below 50 you're paused.
            </Text>
          </View>

          <View>
            <Btn
              title="Continue with Google"
              onPress={() => {
                if (!googleReady) {
                  Alert.alert(
                    'Google login not set up yet',
                    'Paste your Web Client ID in SRC/firebase/AuthContext.js. Use "Use anonymously" meanwhile.'
                  );
                  return;
                }
                run('g', signInGoogle);
              }}
              busy={busy === 'g'}
            />

            <Btn
              kind="outline"
              title="Use anonymously"
              onPress={() => run('a', signInAnon)}
              busy={busy === 'a'}
            />

            {onBrowse ? (
              <Btn
                kind="ghost"
                title="Browse as guest"
                onPress={onBrowse}
              />
            ) : null}

            <Text style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 11,
              textAlign: 'center',
              fontWeight: '600',
              marginTop: 4
            }}>
              Your account name is hidden from public report cards.
              Check your media for identifying details.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
