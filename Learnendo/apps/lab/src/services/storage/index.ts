/**
 * Storage adapter singleton.
 *
 * All app code reads/writes data through the adapter returned by getStorage().
 * To migrate from localStorage to Firebase, call setStorage() once at boot:
 *
 *   // Example (future Firebase build):
 *   import { setStorage } from './services/storage';
 *   import { FirebaseLabAdapter } from './services/storage/FirebaseAdapter';
 *   setStorage(new FirebaseLabAdapter(db, currentUser.uid));
 */
import type { ILabStorage } from './ILabStorage';
import { LocalStorageAdapter } from './LocalStorageAdapter';

let _adapter: ILabStorage = new LocalStorageAdapter();

/** Returns the active storage adapter (localStorage by default). */
export function getStorage(): ILabStorage {
  return _adapter;
}

/**
 * Replace the active adapter at runtime.
 * Call once during app initialisation, before any component renders.
 */
export function setStorage(adapter: ILabStorage): void {
  _adapter = adapter;
}

export type { ILabStorage };
export { LocalStorageAdapter };
