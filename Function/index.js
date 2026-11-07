const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
admin.initializeApp();
const db = admin.firestore();
const { FieldValue } = admin.firestore;
const REGION = 'asia-south1';

function requireUser(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}
async function requireStaff(request) {
  const uid = requireUser(request);
  const staff = await db.doc(`staff/${uid}`).get();
  if (!staff.exists) throw new HttpsError('permission-denied', 'Staff access required.');
  return uid;
}
function cleanText(value, max, field) {
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new HttpsError('invalid-argument', `${field} is invalid.`);
  }
  return value.trim();
}

// Create the initial profile from verified Firebase Auth claims, never client-supplied counters/name.
exports.ensureProfile = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const userRef = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      tx.create(userRef, {
        rep: 100, reports: 0, confirmed: 0, dismissed: 0, posts: 0,
        // Keep public community posts pseudonymous by default, even for Google accounts.
        name: 'Anonymous', createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
  return { ok: true };
});
async function applyRep(uid, delta, why, extra = {}) {
  if (!uid) return;
  const userRef = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return;
    tx.update(userRef, { rep: FieldValue.increment(delta), ...extra });
    tx.set(userRef.collection('repLog').doc(), { delta, why, at: FieldValue.serverTimestamp() });
  });
}
async function refreshShameboard(subjectKey) {
  if (!subjectKey) return;
  // Subject references stay in privateReports, never on public report documents.
  const privateMatches = await db.collection('privateReports').where('subjectKey', '==', subjectKey).get();
  const reviewed = await Promise.all(privateMatches.docs.map(async (privateDoc) => {
    const report = await db.doc(`reports/${privateDoc.id}`).get();
    return report.exists && report.data().status === 'guilty' ? report : null;
  }));
  const matches = reviewed.filter(Boolean);
  const boardId = crypto.createHash('sha256').update(subjectKey).digest('hex').slice(0, 20);
  const ref = db.doc(`shameboard/${boardId}`);
  if (matches.length < 2) {
    await ref.delete().catch(() => {});
    return;
  }
  await ref.set({
    label: `Repeat finding #${boardId.slice(0, 6).toUpperCase()}`,
    verifiedCount: matches.length,
    identityStatus: 'withheld',
    identityPublished: false,
    reportIds: matches.map((d) => d.id),
    reportLocations: matches.map((d) => ({ reportId: d.id, locationName: d.data().locationName || 'Location not provided' })),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

exports.createReport = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const d = request.data || {};
  const locationName = cleanText(d.locationName, 160, 'Location');
  if (!locationName) throw new HttpsError('invalid-argument', 'Location is required.');
  const note = cleanText(d.note || '', 200, 'Description');
  const mediaType = ['none', 'photo', 'video'].includes(d.mediaType) ? d.mediaType : 'none';
  const userRef = db.doc(`users/${uid}`);
  const privateRef = db.collection('privateReports').doc();
  const reportRef = db.collection('reports').doc(privateRef.id);
  const mediaURL = typeof d.mediaURL === 'string' ? d.mediaURL : null;
  if (mediaURL) {
    const expectedPrefix = `https://firebasestorage.googleapis.com/v0/b/lineguard-68bb0.firebasestorage.app/o/evidence%2F${uid}%2F`;
    if (!mediaURL.startsWith(expectedPrefix)) throw new HttpsError('invalid-argument', 'Evidence must be uploaded to your own LineGuard storage folder.');
  }
  if ((mediaType === 'none') !== !mediaURL) throw new HttpsError('invalid-argument', 'Evidence type and file do not match.');
  const report = {
    locationName,
    address: cleanText(d.address || locationName, 240, 'Address'),
    mediaURL,
    mediaType,
    note,
    status: 'pending',
    votes: { yes: 0, no: 0 },
    createdAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Create your profile before reporting.');
    if ((userSnap.data().rep || 0) < 50) throw new HttpsError('failed-precondition', 'Your reputation is too low to submit a report.');
    tx.create(reportRef, report);
    tx.create(privateRef, { reporterUid: uid, lat: typeof d.lat === 'number' ? d.lat : null, lng: typeof d.lng === 'number' ? d.lng : null });
    tx.update(userRef, { reports: FieldValue.increment(1) });
  });
  return { reportId: reportRef.id };
});

exports.castVote = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const { reportId, value } = request.data || {};
  if (!['yes', 'no'].includes(value) || typeof reportId !== 'string') throw new HttpsError('invalid-argument', 'Invalid vote.');
  const reportRef = db.doc(`reports/${reportId}`);
  const voteRef = reportRef.collection('votes').doc(uid);
  await db.runTransaction(async (tx) => {
    const [reportSnap, voteSnap] = await Promise.all([tx.get(reportRef), tx.get(voteRef)]);
    if (!reportSnap.exists || reportSnap.data().status !== 'pending') throw new HttpsError('failed-precondition', 'This report is not open for voting.');
    if (voteSnap.exists) throw new HttpsError('already-exists', 'You have already voted on this video.');
    tx.create(voteRef, { value, createdAt: FieldValue.serverTimestamp() });
    tx.update(reportRef, { [`votes.${value}`]: FieldValue.increment(1) });
  });
  return { ok: true };
});

exports.markGuilty = onCall({ region: REGION }, async (request) => {
  const staffUid = await requireStaff(request);
  const { reportId } = request.data || {};
  const subjectKey = cleanText(request.data?.subjectKey || '', 64, 'Subject reference');
  if (subjectKey && !/^[a-zA-Z0-9_-]{4,64}$/.test(subjectKey)) throw new HttpsError('invalid-argument', 'Use a non-identifying subject reference (4–64 letters, numbers, _ or -).');
  if (typeof reportId !== 'string') throw new HttpsError('invalid-argument', 'Report ID required.');
  const reportRef = db.doc(`reports/${reportId}`);
  const privateRef = db.doc(`privateReports/${reportId}`);
  let reporterUid = null;
  await db.runTransaction(async (tx) => {
    const [reportSnap, privateSnap] = await Promise.all([tx.get(reportRef), tx.get(privateRef)]);
    if (!reportSnap.exists || reportSnap.data().status !== 'pending') throw new HttpsError('failed-precondition', 'Report is no longer pending.');
    reporterUid = privateSnap.exists ? privateSnap.data().reporterUid : null;
    tx.update(reportRef, { status: 'guilty', verifiedAt: FieldValue.serverTimestamp(), appealStatus: 'open', appealOpenedAt: FieldValue.serverTimestamp() });
    if (subjectKey) tx.set(privateRef, { subjectKey }, { merge: true });
    tx.set(privateRef, { reviewedBy: staffUid, reviewedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  if (reporterUid) await applyRep(reporterUid, 10, 'Report confirmed after staff review', { confirmed: FieldValue.increment(1) });
  if (subjectKey) await refreshShameboard(subjectKey);
  return { ok: true };
});

exports.dismissReport = onCall({ region: REGION }, async (request) => {
  const staffUid = await requireStaff(request);
  const reportId = request.data?.reportId;
  if (typeof reportId !== 'string') throw new HttpsError('invalid-argument', 'Report ID required.');
  const reportRef = db.doc(`reports/${reportId}`);
  const privateRef = db.doc(`privateReports/${reportId}`);
  let reporterUid = null;
  await db.runTransaction(async (tx) => {
    const [reportSnap, privateSnap] = await Promise.all([tx.get(reportRef), tx.get(privateRef)]);
    if (!reportSnap.exists || reportSnap.data().status !== 'pending') throw new HttpsError('failed-precondition', 'Report is no longer pending.');
    reporterUid = privateSnap.exists ? privateSnap.data().reporterUid : null;
    tx.update(reportRef, { status: 'dismissed', reviewedAt: FieldValue.serverTimestamp() });
    tx.set(privateRef, { reviewedBy: staffUid, reviewedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  if (reporterUid) await applyRep(reporterUid, -20, 'Report dismissed after staff review', { dismissed: FieldValue.increment(1) });
  return { ok: true };
});

exports.fileAppeal = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const { reportId } = request.data || {};
  if (typeof reportId !== 'string' || !reportId) throw new HttpsError('invalid-argument', 'Report ID required.');
  const reason = cleanText(request.data?.reason || '', 600, 'Appeal reason');
  const contact = cleanText(request.data?.contact || '', 120, 'Contact');
  if (!reason) throw new HttpsError('invalid-argument', 'Please explain your appeal.');
  const reportRef = db.doc(`reports/${reportId}`);
  const appealRef = db.doc(`appeals/${reportId}_${uid}`);
  await db.runTransaction(async (tx) => {
    const [report, existing] = await Promise.all([tx.get(reportRef), tx.get(appealRef)]);
    if (!report.exists || report.data().status !== 'guilty' || report.data().appealStatus !== 'open') throw new HttpsError('failed-precondition', 'This finding is not currently open for appeal.');
    if (existing.exists) throw new HttpsError('already-exists', 'You already submitted an appeal for this report.');
    tx.create(appealRef, { reportId, uid, reason, contact, claimantIdentityVerified: false, status: 'pending', createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

exports.verifyAppealClaim = onCall({ region: REGION }, async (request) => {
  const staffUid = await requireStaff(request);
  const appealId = request.data?.appealId;
  if (typeof appealId !== 'string') throw new HttpsError('invalid-argument', 'Appeal ID required.');
  const appealRef = db.doc(`appeals/${appealId}`);
  const appealSnap = await appealRef.get();
  if (!appealSnap.exists || appealSnap.data().status !== 'pending') throw new HttpsError('failed-precondition', 'Appeal is no longer pending.');
  await appealRef.update({ claimantIdentityVerified: true, identityVerifiedBy: staffUid, identityVerifiedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

exports.resolveAppeal = onCall({ region: REGION }, async (request) => {
  const staffUid = await requireStaff(request);
  const { appealId, approve } = request.data || {};
  if (typeof appealId !== 'string' || typeof approve !== 'boolean') throw new HttpsError('invalid-argument', 'Invalid appeal decision.');
  const appealRef = db.doc(`appeals/${appealId}`);
  let reportId = null;
  let subjectKey = null;
  await db.runTransaction(async (tx) => {
    const appealSnap = await tx.get(appealRef);
    if (!appealSnap.exists || appealSnap.data().status !== 'pending') throw new HttpsError('failed-precondition', 'Appeal is no longer pending.');
    const a = appealSnap.data();
    if (!a.claimantIdentityVerified) throw new HttpsError('failed-precondition', 'Verify the claimant’s identity before deciding this appeal.');
    reportId = a.reportId;
    const reportRef = db.doc(`reports/${reportId}`);
    const privateRef = db.doc(`privateReports/${reportId}`);
    const [reportSnap, privateSnap] = await Promise.all([tx.get(reportRef), tx.get(privateRef)]);
    if (!reportSnap.exists || reportSnap.data().status !== 'guilty') throw new HttpsError('failed-precondition', 'This finding has already changed.');
    subjectKey = privateSnap.exists ? privateSnap.data().subjectKey : null;
    tx.update(appealRef, { status: approve ? 'approved' : 'rejected', reviewedBy: staffUid, reviewedAt: FieldValue.serverTimestamp() });
    tx.update(reportRef, { status: approve ? 'removed' : 'guilty', appealStatus: 'resolved', appealResolvedAt: FieldValue.serverTimestamp() });
  });
  if (subjectKey) await refreshShameboard(subjectKey);
  return { ok: true };
});

exports.createCommunityPost = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const text = cleanText(request.data?.text || '', 300, 'Post');
  const topic = cleanText(request.data?.topic || 'General', 30, 'Topic');
  if (!['RTO', 'Railway', 'Airport', 'Hospital', 'Mall', 'Police', 'General'].includes(topic)) throw new HttpsError('invalid-argument', 'Invalid community topic.');
  if (!text) throw new HttpsError('invalid-argument', 'Post cannot be empty.');
  const postRef = db.collection('community').doc();
  await db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Profile not found.');
    const trustedName = cleanText(userSnap.data().name || 'Anonymous', 40, 'Profile name');
    tx.create(postRef, { name: trustedName, text, topic, likes: 0, createdAt: FieldValue.serverTimestamp() });
    tx.update(userRef, { posts: FieldValue.increment(1), rep: FieldValue.increment(2) });
    tx.set(userRef.collection('repLog').doc(), { delta: 2, why: 'Community post', at: FieldValue.serverTimestamp() });
  });
  return { postId: postRef.id };
});

exports.likeCommunityPost = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const postId = request.data?.postId;
  if (typeof postId !== 'string') throw new HttpsError('invalid-argument', 'Post ID required.');
  const postRef = db.doc(`community/${postId}`);
  const likeRef = postRef.collection('likes').doc(uid);
  await db.runTransaction(async (tx) => {
    const [snap, likeSnap] = await Promise.all([tx.get(postRef), tx.get(likeRef)]);
    if (!snap.exists) throw new HttpsError('not-found', 'Post not found.');
    if (likeSnap.exists) throw new HttpsError('already-exists', 'Already liked.');
    tx.create(likeRef, { createdAt: FieldValue.serverTimestamp() });
    tx.update(postRef, { likes: FieldValue.increment(1) });
  });
  return { ok: true };
});
