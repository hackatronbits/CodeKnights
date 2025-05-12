import { getFirebaseServices } from '@/lib/firebase';
import { doc } from 'firebase/firestore';

export function getUserDocRef(uid: string) {
  const { db } = getFirebaseServices();
  if (!db) throw new Error('Firestore is not initialized');
  return doc(db, 'users', uid);
}
