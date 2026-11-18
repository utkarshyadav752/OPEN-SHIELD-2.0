import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer,
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  if (!auth.currentUser) return;
  try {
    await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

export { onAuthStateChanged, type User };

export interface SavedAuditDoc {
  id: string;
  ownerUid: string;
  domain: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issuesFound: number;
  summary: string;
  status: 'active' | 'archived';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface SavedUserReviewDoc {
  id: string;
  ownerUid: string;
  authorName: string;
  rating: number;
  comment: string;
  status: 'published' | 'archived';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

export async function saveUserAuditToFirestore(input: {
  domain: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issuesFound: number;
  summary: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in with Google to save audits.');

  const auditId = sanitizeId(`audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `users/${user.uid}/audits/${auditId}`;

  const payload = {
    ownerUid: user.uid.slice(0, 128),
    domain: input.domain.trim().slice(0, 160) || 'unknown.example',
    grade: ['A', 'B', 'C', 'D', 'F'].includes(input.grade) ? input.grade : 'C',
    issuesFound: Math.max(0, Math.min(500, Math.round(input.issuesFound))),
    summary: input.summary.trim().slice(0, 500) || 'OpenShield page audit completed.',
    status: 'active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'users', user.uid, 'audits', auditId), payload);
    return auditId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserAuditFromFirestore(auditId: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/audits/${auditId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'audits', auditId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveUserReviewToFirestore(input: {
  rating: number;
  comment: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in with Google to post a review.');

  const reviewId = sanitizeId(`rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `users/${user.uid}/reviews/${reviewId}`;

  const authorName = (user.displayName || 'Verified Chrome User').trim().slice(0, 80);
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const comment = input.comment.trim().slice(0, 600);
  if (!comment) throw new Error('Review comment cannot be empty.');

  const payload = {
    ownerUid: user.uid.slice(0, 128),
    authorName,
    rating,
    comment,
    status: 'published' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'users', user.uid, 'reviews', reviewId), payload);
    return reviewId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserReviewInFirestore(
  reviewId: string,
  input: { rating: number; comment: string }
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in with Google.');
  const path = `users/${user.uid}/reviews/${reviewId}`;
  const authorName = (user.displayName || 'Verified Chrome User').trim().slice(0, 80);
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const comment = input.comment.trim().slice(0, 600);

  try {
    await updateDoc(doc(db, 'users', user.uid, 'reviews', reviewId), {
      authorName,
      rating,
      comment,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserReviewFromFirestore(reviewId: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserAudits(
  userId: string,
  onData: (audits: SavedAuditDoc[]) => void
) {
  const path = `users/${userId}/audits`;
  return onSnapshot(
    collection(db, 'users', userId, 'audits'),
    (snapshot) => {
      const items: SavedAuditDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedAuditDoc, 'id'>)
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToUserReviews(
  userId: string,
  onData: (reviews: SavedUserReviewDoc[]) => void
) {
  const path = `users/${userId}/reviews`;
  return onSnapshot(
    collection(db, 'users', userId, 'reviews'),
    (snapshot) => {
      const items: SavedUserReviewDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedUserReviewDoc, 'id'>)
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
