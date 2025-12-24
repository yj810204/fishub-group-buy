import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 앱 초기화 (이미 초기화된 경우 재초기화 방지)
// 환경 변수가 없으면 빌드 시 오류를 방지하기 위해 조건부 초기화
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// 환경 변수 검증 함수
const validateFirebaseConfig = (): string[] => {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.storageBucket) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!firebaseConfig.messagingSenderId) missing.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!firebaseConfig.appId) missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  return missing;
};

if (typeof window !== 'undefined') {
  const missingVars = validateFirebaseConfig();
  if (missingVars.length > 0) {
    console.error('Firebase 환경 변수가 설정되지 않았습니다. 누락된 변수:', missingVars.join(', '));
    console.error('프로젝트 루트에 .env.local 파일을 생성하고 Firebase 설정 정보를 추가하세요.');
    console.error('자세한 내용은 FIREBASE_SETUP.md 파일을 참조하세요.');
  } else if (firebaseConfig.apiKey) {
    // 클라이언트 사이드에서만 초기화
    try {
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      // Firebase 서비스 초기화
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (error) {
      console.error('Firebase 초기화 오류:', error);
    }
  }
}

// 환경 변수 검증 함수 (외부에서 사용 가능)
export const getMissingEnvVars = (): string[] => {
  return validateFirebaseConfig();
};

export { auth, db, storage, app };
export default app;

