import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInAnonymously, linkWithCredential, EmailAuthProvider, getAuth, connectAuthEmulator } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, serverTimestamp, getFirestore, connectFirestoreEmulator, onSnapshot, terminate } from 'firebase/firestore';
import { auth, db, firebaseRuntimeConfig } from '../src/services/firebase';
import { createOrUpdateUserProfile, createStudentProfile, updateLastActive, updateStudyTime, updateAdaptiveDifficulty } from '../src/services/db';
import { mapUserAccountProfile, subscribeUserAccountProfile, updateUserLanguagePreferences, updateUserAccountRole, updateUserAssignedTeacher, updateUserAccountProfileDetails, type UserAccountProfile } from '../src/services/userRoles';
import { resolveRuntimeLanguageContext } from '../src/models/languageContext';
import { cacheUserBaseLanguage, readUserBaseLanguage } from '../src/utils/userLanguageStorage';
import { LanguagePreferencesSettings } from '../src/components/LanguagePreferencesSettings';

function profileWhen(uid: string, predicate: (profile: UserAccountProfile) => boolean = () => true) {
  return new Promise<UserAccountProfile>((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Profile snapshot timeout')); }, 15000);
    unsubscribe = subscribeUserAccountProfile(uid, null, profile => {
      if (predicate(profile)) { clearTimeout(timeout); unsubscribe(); resolve(profile); }
    }, error => { clearTimeout(timeout); unsubscribe(); reject(error); });
  });
}
const adminApp = initializeAdminApp({ projectId: firebaseRuntimeConfig.projectId }, 'phase2');
const adminDb = getAdminFirestore(adminApp);
const deviceB = initializeApp({ projectId: firebaseRuntimeConfig.projectId, apiKey: 'demo-key' }, 'device-B');
const authB = getAuth(deviceB);
connectAuthEmulator(authB, 'http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST, { disableWarnings: true });
const dbB = getFirestore(deviceB);
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
connectFirestoreEmulator(dbB, host, Number(port));
const password = 'demo-password-123';
const cache = new Map<string, string>([['learnendo_base_ui_lang', 'pt']]);
const storage = { getItem: (key: string) => cache.get(key) ?? null, setItem: (key: string, value: string) => { cache.set(key, value); } };
try {
  const invalidProfile = mapUserAccountProfile('old', { baseLanguage: 'he', learningLanguages: ['en', 'invalid'] });
  assert.equal(invalidProfile.baseLanguage, undefined); assert.equal(invalidProfile.learningLanguages, undefined);
  const a = (await createUserWithEmailAndPassword(auth, 'maria@example.test', password)).user;
  await createOrUpdateUserProfile(a);
  await createStudentProfile(a.uid, 'stale@example.test', 'Stale Name');
  let raw = (await getDocFromServer(doc(db, 'users', a.uid))).data()!;
  assert.equal(Object.hasOwn(raw, 'baseLanguage'), false);
  assert.equal(Object.hasOwn(raw, 'learningLanguages'), false);
  let profile = await profileWhen(a.uid);
  assert.equal(profile.baseLanguage, undefined);
  const bootstrap = resolveRuntimeLanguageContext({ uid: a.uid, profile, courseId: 'english', legacyBaseLanguage: 'pt' });
  assert.equal(bootstrap.baseLanguage, 'en'); assert.equal(bootstrap.suggestedBaseLanguage, 'pt');
  const setupHtml = renderToStaticMarkup(<LanguagePreferencesSettings profile={profile} suggestedBaseLanguage="pt" targetLanguage="en" uiLanguage="en" />);
  assert.match(setupHtml, /Which language should Learnendo use/);
  assert.equal((setupHtml.match(/type="radio"/g) ?? []).length, 3);
  assert.equal((setupHtml.match(/type="checkbox"/g) ?? []).length, 5);
  assert.match(setupHtml, /Confirm languages/);
  assert.equal(Object.hasOwn((await getDocFromServer(doc(db, 'users', a.uid))).data()!, 'baseLanguage'), false, 'rendering does not save bootstrap');
  await updateUserLanguagePreferences(a.uid, { baseLanguage: 'pt', learningLanguages: ['en', 'es'] }, a.uid);
  profile = await profileWhen(a.uid, value => value.baseLanguage === 'pt');
  assert.deepEqual(profile.learningLanguages, ['en', 'es']);
  cacheUserBaseLanguage(storage, a.uid, profile.baseLanguage!);
  const progressBefore = (await adminDb.doc(`progress/${a.uid}`).get()).data();
  await adminDb.doc(`users/${a.uid}`).set({ name: 'Maria', displayName: 'Maria Display', email: 'admin-defined@example.test', role: 'student', assignedTeacherUid: 'teacher', assignedTeacherName: 'Teacher', privateAdminField: 'preserve' }, { merge: true });
  for (const event of ['refresh', 'login helper', 'student helper']) {
    await createOrUpdateUserProfile(a);
    await createStudentProfile(a.uid, 'bad@example.test', 'Wrong');
    raw = (await getDocFromServer(doc(db, 'users', a.uid))).data()!;
    assert.equal(raw.baseLanguage, 'pt', event); assert.equal(raw.name, 'Maria'); assert.equal(raw.displayName, 'Maria Display');
    assert.equal(raw.email, 'admin-defined@example.test'); assert.equal(raw.privateAdminField, 'preserve');
    assert.equal(raw.assignedTeacherUid, 'teacher'); assert.deepEqual(raw.learningLanguages, ['en', 'es']);
  }
  // P0 real authentication switches, same browser cache, same application service.
  await signOut(auth);
  const b = (await createUserWithEmailAndPassword(auth, 'second@example.test', password)).user;
  await createOrUpdateUserProfile(b);
  await updateUserLanguagePreferences(b.uid, { baseLanguage: 'es', learningLanguages: ['el', 'he'] }, b.uid);
  for (const [account, email, expected] of [[b, 'second@example.test', 'es'], [a, 'maria@example.test', 'pt'], [b, 'second@example.test', 'es']] as const) {
    await signOut(auth); const login = await signInWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserProfile(login.user);
    const next = await profileWhen(account.uid, value => value.baseLanguage === expected);
    const resolved = resolveRuntimeLanguageContext({ uid: account.uid, profile: next, cachedBaseLanguage: readUserBaseLanguage(storage, account.uid), legacyBaseLanguage: 'pt', courseId: 'english' });
    assert.equal(resolved.baseLanguage, expected); cacheUserBaseLanguage(storage, account.uid, next.baseLanguage!);
  }
  console.log('P0 passed: real A/PT, B/ES and A/PT logins; profile preservation; old profile and explicit setup.');

  // Ordinary users cannot piggyback authorization or administrative changes on a language write.
  const ownRef = doc(db, 'users', b.uid);
  const personal = () => ({ baseLanguage: 'en', languagePreferencesVersion: 1, languagePreferencesUpdatedAt: serverTimestamp(), languagePreferencesUpdatedBy: b.uid });
  const observedPreferences: Array<string | undefined> = [];
  const stopObserving = subscribeUserAccountProfile(b.uid, null, next => observedPreferences.push(next.baseLanguage));
  for (const forbidden of ['role', 'name', 'displayName', 'email', 'assignedTeacherUid', 'assignedTeacherName', 'appAccessType', 'customAuthorization']) {
    await assert.rejects(updateDoc(ownRef, { ...personal(), [forbidden]: forbidden === 'role' ? 'admin' : 'forged' }), undefined, forbidden);
  }
  await profileWhen(b.uid, value => value.baseLanguage === 'es');
  stopObserving();
  assert.ok(observedPreferences.every(value => value === 'es'), 'denied optimistic writes must not enter the runtime/cache subscription');
  for (const invalid of ['el', 'he', null, 12]) await assert.rejects(updateDoc(ownRef, { ...personal(), baseLanguage: invalid }));
  for (const invalid of [['en', 'en'], ['xx'], 'en', ['en', 'pt', 'es', 'el', 'he', 'en']]) {
    await assert.rejects(updateDoc(ownRef, { ...personal(), learningLanguages: invalid }));
  }
  await assert.rejects(updateUserLanguagePreferences(a.uid, { baseLanguage: 'en' }, b.uid));
  await assert.rejects(deleteDoc(ownRef), undefined, 'delete/recreate must not bypass administrative ownership');
  await updateLastActive(b.uid); await updateStudyTime(b.uid, 5); await updateAdaptiveDifficulty(b.uid, 95);
  await setDoc(doc(db, 'users', b.uid, 'courseProgress', 'english_1'), { completedLessons: [1] });
  await setDoc(doc(db, 'users', b.uid, 'notificationSettings', 'preferences'), { enabled: false });
  const observedB = (await getDocFromServer(ownRef)).data()!;
  assert.equal(observedB.totalStudyTime, 5); assert.equal(observedB.difficultyLevel, 'hard');
  assert.equal(observedB.baseLanguage, 'es');

  // Another independently initialized Firebase client represents device B with no local preference cache.
  await signOut(auth); await signInWithEmailAndPassword(auth, 'maria@example.test', password);
  await updateUserLanguagePreferences(a.uid, { baseLanguage: 'es' }, a.uid);
  await signInWithEmailAndPassword(authB, 'maria@example.test', password);
  const fromDeviceB = mapUserAccountProfile(a.uid, (await getDocFromServer(doc(dbB, 'users', a.uid))).data());
  assert.equal(resolveRuntimeLanguageContext({ uid: a.uid, profile: fromDeviceB, courseId: 'spanish' }).baseLanguage, 'es');
  const synchronizedA = profileWhen(a.uid, next => next.baseLanguage === 'pt');
  await updateDoc(doc(dbB, 'users', a.uid), { baseLanguage: 'pt', languagePreferencesVersion: 1, languagePreferencesUpdatedAt: serverTimestamp(), languagePreferencesUpdatedBy: a.uid });
  const synced = await synchronizedA;
  assert.equal(resolveRuntimeLanguageContext({ uid: a.uid, profile: synced, cachedBaseLanguage: 'es', courseId: 'english' }).baseLanguage, 'pt');
  await signOut(authB);
  console.log('Cross-device passed: empty device cache, Firestore precedence, live profile subscription update.');

  // Administrative services update only their owned fields; preferences survive and can be explicitly edited.
  await signOut(auth);
  const administrator = (await createUserWithEmailAndPassword(auth, 'admin@example.test', password)).user;
  await createOrUpdateUserProfile(administrator);
  await adminDb.doc(`users/${administrator.uid}`).update({ role: 'admin' });
  await updateUserAccountProfileDetails(a.uid, { name: 'Maria Admin Edit', email: 'new-official@example.test' }, administrator.uid);
  await updateUserAccountRole(a.uid, 'teacher', administrator.uid);
  await updateUserAssignedTeacher(a.uid, 'teacher-2', 'Second teacher', administrator.uid);
  assert.equal((await getDocFromServer(doc(db, 'users', a.uid))).data()!.baseLanguage, 'pt');
  await updateUserLanguagePreferences(a.uid, { baseLanguage: 'es' }, administrator.uid);
  await signOut(auth); const loggedA = (await signInWithEmailAndPassword(auth, 'maria@example.test', password)).user;
  await createOrUpdateUserProfile(loggedA);
  raw = (await getDocFromServer(doc(db, 'users', a.uid))).data()!;
  assert.equal(raw.baseLanguage, 'es'); assert.equal(raw.name, 'Maria Admin Edit'); assert.equal(raw.role, 'teacher');
  assert.equal(raw.email, 'new-official@example.test'); assert.equal(raw.assignedTeacherUid, 'teacher-2');
  assert.equal(raw.languagePreferencesUpdatedBy, administrator.uid);
  assert.equal(Object.hasOwn((await adminDb.doc(`progress/${a.uid}`).get()).data()!, 'baseLanguage'), false);
  assert.equal(Object.hasOwn(progressBefore!, 'learningLanguages'), false);

  // Anonymous conversion preserves UID, confirmed preferences, and all existing profile fields.
  await signOut(auth);
  const guest = (await signInAnonymously(auth)).user;
  await createOrUpdateUserProfile(guest);
  await updateUserLanguagePreferences(guest.uid, { baseLanguage: 'pt', learningLanguages: ['he'] }, guest.uid);
  const converted = await linkWithCredential(guest, EmailAuthProvider.credential('converted@example.test', password));
  assert.equal(converted.user.uid, guest.uid);
  await createOrUpdateUserProfile(converted.user, 'converted@example.test');
  raw = (await getDocFromServer(doc(db, 'users', guest.uid))).data()!;
  assert.equal(raw.baseLanguage, 'pt'); assert.deepEqual(raw.learningLanguages, ['he']); assert.equal(raw.isAnonymous, false);
  console.log('Security/admin/conversion passed: field allowlists, valid locales, duplicate rejection, activity compatibility, unchanged administrative fields and anonymous UID.');
} finally {
  await signOut(auth); await signOut(authB); await terminate(db); await terminate(dbB); await deleteApp(deviceB); await deleteAdminApp(adminApp);
}
