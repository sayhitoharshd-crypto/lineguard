import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCST6UelUZN2i8z3wgzVlhoKISxjA3bMp4',
  authDomain: 'lineguard-68bb0.firebaseapp.com',
  projectId: 'lineguard-68bb0',
  storageBucket: 'lineguard-68bb0.firebasestorage.app',
  messagingSenderId: '677986213198',
  appId: '1:677986213198:web:88dc4d6c409ec636b9d21f',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  auth = getAuth(app);
}
export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');
