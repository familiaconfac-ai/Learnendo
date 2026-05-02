import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SavedBattleTemplate } from '../components/LiveClasses/Battle/battleTypes';
import { getSavedBattleTemplateLanguage } from '../components/LiveClasses/Battle/battleUtils';

export type BattleTemplateVisibility = 'private' | 'teachers';

export interface StoredBattleTemplate extends SavedBattleTemplate {
  createdBy: string;
  createdByName: string;
  visibility: BattleTemplateVisibility;
  updatedAt: number;
}

function normalizeStoredTemplateLanguage(template: StoredBattleTemplate): StoredBattleTemplate {
  return {
    ...template,
    language: getSavedBattleTemplateLanguage(template),
    createdByName: template.createdByName?.trim() || 'Professor',
    visibility: template.visibility === 'private' ? 'private' : 'teachers',
  };
}

function battleTemplatesCollection() {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  return collection(db, 'battleTemplates');
}

function battleTemplateDoc(templateId: string) {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  return doc(db, 'battleTemplates', templateId);
}

export async function saveBattleTemplateToLibrary(
  ownerUid: string,
  ownerName: string,
  template: SavedBattleTemplate,
  visibility: BattleTemplateVisibility = 'teachers',
): Promise<StoredBattleTemplate> {
  if (!ownerUid) {
    throw new Error('User must be authenticated to save battle templates');
  }

  const storedTemplate: StoredBattleTemplate = {
    ...template,
    language: getSavedBattleTemplateLanguage(template),
    createdBy: ownerUid,
    createdByName: ownerName.trim() || 'Professor',
    visibility,
    updatedAt: Date.now(),
  };

  await setDoc(battleTemplateDoc(template.id), storedTemplate);
  return normalizeStoredTemplateLanguage(storedTemplate);
}

export async function listBattleTemplatesByOwner(ownerUid: string): Promise<StoredBattleTemplate[]> {
  if (!ownerUid) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      battleTemplatesCollection(),
      where('createdBy', '==', ownerUid),
    ),
  );

  return snapshot.docs
    .map((entry) => normalizeStoredTemplateLanguage(entry.data() as StoredBattleTemplate))
    .sort((left, right) => {
      const leftStamp = typeof left.updatedAt === 'number' ? left.updatedAt : Date.parse(left.createdAt);
      const rightStamp = typeof right.updatedAt === 'number' ? right.updatedAt : Date.parse(right.createdAt);
      return rightStamp - leftStamp;
    });
}

export async function listBattleTemplatesForTeachersLibrary(ownerUid: string): Promise<StoredBattleTemplate[]> {
  if (!ownerUid) {
    return [];
  }

  const [ownSnapshot, sharedSnapshot] = await Promise.all([
    getDocs(
      query(
        battleTemplatesCollection(),
        where('createdBy', '==', ownerUid),
      ),
    ),
    getDocs(
      query(
        battleTemplatesCollection(),
        where('visibility', '==', 'teachers'),
      ),
    ),
  ]);

  const merged = new Map<string, StoredBattleTemplate>();

  for (const entry of [...sharedSnapshot.docs, ...ownSnapshot.docs]) {
    const template = normalizeStoredTemplateLanguage(entry.data() as StoredBattleTemplate);
    merged.set(template.id, template);
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftStamp = typeof left.updatedAt === 'number' ? left.updatedAt : Date.parse(left.createdAt);
    const rightStamp = typeof right.updatedAt === 'number' ? right.updatedAt : Date.parse(right.createdAt);
    return rightStamp - leftStamp;
  });
}

export async function deleteBattleTemplateFromLibrary(templateId: string): Promise<void> {
  if (!templateId) {
    return;
  }

  await deleteDoc(battleTemplateDoc(templateId));
}
