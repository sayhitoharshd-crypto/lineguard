// Run once from a trusted environment after authenticating with Application Default Credentials.
// Example: gcloud auth application-default login && node scripts/migrate-private-report-fields.js
// This moves reporter UIDs to private records, deletes legacy public UPI/UID fields, and moves voter/like UID maps to private per-user subdocuments.
const admin = require('../functions/node_modules/firebase-admin');
admin.initializeApp({ projectId: 'lineguard-68bb0' });
const db = admin.firestore();

(async () => {
  const reports = await db.collection('reports').get();
  let migrated = 0;
  for (const reportDoc of reports.docs) {
    const data = reportDoc.data();
    const privateData = {};
    if (data.reporter) privateData.reporterUid = data.reporter;
    if (typeof data.lat === 'number') privateData.lat = data.lat;
    if (typeof data.lng === 'number') privateData.lng = data.lng;
    const batch = db.batch();
    if (Object.keys(privateData).length) {
      batch.set(db.doc(`privateReports/${reportDoc.id}`), privateData, { merge: true });
    }
    const publicPatch = {};
    ['reporter', 'reporterUpi', 'confirmedBy', 'votedBy', 'lat', 'lng'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) publicPatch[field] = admin.firestore.FieldValue.delete();
    });
    if (data.votedBy && typeof data.votedBy === 'object') {
      for (const [uid, value] of Object.entries(data.votedBy)) {
        if (['yes', 'no'].includes(value)) {
          batch.set(reportDoc.ref.collection('votes').doc(uid), { value, migrated: true });
        }
      }
    }
    if (data.status === 'guilty' && !data.appealStatus) publicPatch.appealStatus = 'open';
    if (Object.keys(publicPatch).length) batch.update(reportDoc.ref, publicPatch);
    await batch.commit();
    if (Object.keys(privateData).length || Object.keys(publicPatch).length) migrated += 1;
  }
  const posts = await db.collection('community').get();
  let migratedPosts = 0;
  for (const postDoc of posts.docs) {
    const data = postDoc.data();
    const batch = db.batch();
    if (Array.isArray(data.likedBy)) {
      for (const uid of data.likedBy) batch.set(postDoc.ref.collection('likes').doc(uid), { migrated: true });
    }
    const patch = {};
    ['uid', 'likedBy'].forEach((field) => { if (Object.prototype.hasOwnProperty.call(data, field)) patch[field] = admin.firestore.FieldValue.delete(); });
    if (Object.keys(patch).length) batch.update(postDoc.ref, patch);
    await batch.commit();
    if (Object.keys(patch).length) migratedPosts += 1;
  }
  process.stdout.write(`Scanned ${reports.size} reports (${migrated} migrated) and ${posts.size} community posts (${migratedPosts} migrated).\n`);
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
