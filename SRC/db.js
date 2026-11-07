import {
  collection, doc, getDoc, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from './config';

const call = (name, data) => httpsCallable(functions, name)(data).then((r) => r.data);

// Profile creation is server-owned so clients cannot mint reputation or impersonate profile names.
export async function ensureUser() {
  return call('ensureProfile', {});
}
export function listenUser(uid, cb) {
  return onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? s.data() : null));
}
export function listenRepLog(uid, cb) {
  const q = query(collection(db, 'users', uid, 'repLog'), orderBy('at', 'desc'));
  return onSnapshot(q, (s) => cb(s.docs.slice(0, 15).map((d) => ({ id: d.id, ...d.data() }))));
}
export async function isStaff(uid) {
  const s = await getDoc(doc(db, 'staff', uid));
  return s.exists();
}

async function uploadMedia(uid, uri, type, mimeType) {
  const blob = await (await fetch(uri)).blob();
  if (blob.size > 25 * 1024 * 1024) throw new Error('Evidence must be smaller than 25 MB.');
  const fallback = type === 'video' ? 'video/mp4' : 'image/jpeg';
  const contentType = mimeType || blob.type || fallback;
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
  if (!extensions[contentType]) throw new Error('Unsupported media format. Use JPG, PNG, WebP, MP4 or MOV.');
  const r = ref(storage, `evidence/${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extensions[contentType]}`);
  await uploadBytes(r, blob, { contentType });
  return getDownloadURL(r);
}
export async function submitReport({ uid, locationName, address, lat, lng, mediaUri, mediaType, mediaMimeType, note }) {
  const mediaURL = mediaUri ? await uploadMedia(uid, mediaUri, mediaType, mediaMimeType) : null;
  return call('createReport', {
    locationName, address: address || locationName, lat: lat ?? null, lng: lng ?? null,
    mediaURL, mediaType: mediaType || 'none', note: note || '',
  });
}
export function listenReports(cb) {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function getMyVote(reportId, uid) {
  const snap = await getDoc(doc(db, 'reports', reportId, 'votes', uid));
  return snap.exists() ? snap.data().value : null;
}
export async function castVote(id, uid, v) {
  if (!['yes', 'no'].includes(v)) throw new Error('Invalid vote');
  return call('castVote', { reportId: id, value: v });
}
export async function markGuilty(report, subjectKey = '') {
  return call('markGuilty', { reportId: report.id, subjectKey });
}
export async function dismissReport(report) {
  return call('dismissReport', { reportId: report.id });
}

// Shameboard contains staff-created aggregate records only; public identities are not exposed.
export function listenShameboard(cb, onError) {
  const q = query(collection(db, 'shameboard'), orderBy('verifiedCount', 'desc'));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.verifiedCount >= 2)), onError);
}

// Appeals are claims, not proof of identity. Staff must review them before any report is changed.
export async function getMyAppeal(reportId, uid) {
  const snap = await getDoc(doc(db, 'appeals', `${reportId}_${uid}`));
  return snap.exists() ? snap.data() : null;
}
export async function fileAppeal(reportId, uid, reason, contact = '') {
  return call('fileAppeal', { reportId, reason, contact });
}
export function listenAppeals(cb) {
  const q = query(collection(db, 'appeals'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.status === 'pending')));
}
export async function verifyAppealClaim(appeal) {
  return call('verifyAppealClaim', { appealId: appeal.id });
}
export async function resolveAppeal(appeal, approve) {
  return call('resolveAppeal', { appealId: appeal.id, approve: !!approve });
}

// Community mutations are server-side to protect counters and reputation.
export async function post({ text, topic }) {
  return call('createCommunityPost', { text, topic });
}
export function listenPosts(cb) {
  const q = query(collection(db, 'community'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function getMyLike(postId, uid) {
  const snap = await getDoc(doc(db, 'community', postId, 'likes', uid));
  return snap.exists();
}
export async function likePost(id) {
  return call('likeCommunityPost', { postId: id });
}
