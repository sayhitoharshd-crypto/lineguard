import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from './config';
import { ensureUser, isStaff, listenUser } from './db';

WebBrowser.maybeCompleteAuthSession();

// Get this from Google Cloud Console > APIs & Services > Credentials > "Web client (auto created by Google Service)"
export const GOOGLE_WEB_CLIENT_ID = 'PASTE_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = 'PASTE_YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (idToken) signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).catch(() => {});
    }
  }, [response]);

  useEffect(() => {
    let unsubProfile = () => {};
    const unsub = onAuthStateChanged(auth, async (u) => {
      unsubProfile();
      setUser(u);
      if (u) {
        try {
          await ensureUser();
          setStaff(await isStaff(u.uid));
        } catch (e) {}
        unsubProfile = listenUser(u.uid, setProfile);
      } else {
        setProfile(null);
        setStaff(false);
      }
      setLoading(false);
    });
    return () => { unsub(); unsubProfile(); };
  }, []);

  const value = {
    user, profile, staff, loading,
    displayName: user?.isAnonymous ? 'Anonymous' : (user?.displayName?.split(' ')[0] || 'User'),
    rep: profile?.rep ?? 100,
    googleReady: !!request && !GOOGLE_WEB_CLIENT_ID.startsWith('PASTE') && !GOOGLE_ANDROID_CLIENT_ID.startsWith('PASTE'),
    signInGoogle: () => promptAsync(),
    signInAnon: () => signInAnonymously(auth),
    logout: () => signOut(auth),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
