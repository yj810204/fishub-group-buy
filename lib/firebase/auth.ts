import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './config';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import { User } from '@/types';

const googleProvider = new GoogleAuthProvider();

// Google 로그인
export const signInWithGoogle = async (): Promise<User> => {
  if (!auth || !db) {
    throw new Error('Firebase가 초기화되지 않았습니다. 환경 변수를 확인해주세요.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Firestore에 사용자 정보 저장/업데이트
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    const existingData = userSnap.exists() ? userSnap.data() : {};
    const userData: any = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || existingData.displayName || '',
      provider: 'google',
      createdAt: userSnap.exists() ? existingData.createdAt : serverTimestamp(),
      status: existingData.status || 'active',
      phoneNumber: existingData.phoneNumber,
      blockedUntil: existingData.blockedUntil,
      blockedReason: existingData.blockedReason,
      blockedBy: existingData.blockedBy,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, userData, { merge: true });
    } catch (setDocError) {
      // Firestore 저장 실패는 로그만 남기고 계속 진행
      // (이미 Firebase Auth에는 로그인되어 있음)
      console.warn('Firestore 사용자 정보 저장 실패 (로그인은 성공):', setDocError);
    }

    const returnData: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || existingData.displayName || '',
      provider: 'google',
      createdAt: userSnap.exists()
        ? existingData.createdAt?.toDate() || new Date()
        : new Date(),
      status: existingData.status || 'active',
      phoneNumber: existingData.phoneNumber,
      blockedUntil: existingData.blockedUntil?.toDate(),
      blockedReason: existingData.blockedReason,
      blockedBy: existingData.blockedBy,
      updatedAt: new Date(),
    };

    return returnData;
  } catch (error) {
    console.error('Google 로그인 오류:', error);
    throw error;
  }
};

// Kakao 로그인 (Firebase Custom Auth 사용)
// 참고: Kakao는 Firebase에서 직접 지원하지 않으므로 Custom Token을 사용해야 합니다.
// 여기서는 기본 구조만 제공하고, 실제 구현은 Kakao SDK와 Firebase Admin SDK가 필요합니다.
export const signInWithKakao = async (): Promise<User> => {
  // TODO: Kakao 로그인 구현
  // 1. Kakao SDK로 로그인
  // 2. Kakao Access Token 획득
  // 3. 백엔드에서 Firebase Custom Token 생성
  // 4. signInWithCustomToken으로 로그인
  throw new Error('Kakao 로그인은 아직 구현되지 않았습니다.');
};

// 로그아웃
export const signOut = async (): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('로그아웃 오류:', error);
    throw error;
  }
};

// 이메일/비밀번호 로그인
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  if (!auth || !db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;

    // Firestore에서 사용자 정보 확인
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Firestore에 사용자 정보가 없으면 생성
      const userData: any = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.email?.split('@')[0] || '',
        provider: 'email',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, userData);
    } else {
      // 기존 사용자 정보 업데이트
      const existingData = userSnap.data();
      await setDoc(
        userRef,
        {
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 최신 사용자 정보 가져오기
    const updatedSnap = await getDoc(userRef);
    const userData = updatedSnap.data()!;

    return {
      uid: firebaseUser.uid,
      email: userData.email,
      displayName: userData.displayName,
      provider: userData.provider || 'email',
      createdAt: userData.createdAt?.toDate() || new Date(),
      status: userData.status || 'active',
      phoneNumber: userData.phoneNumber,
      blockedUntil: userData.blockedUntil?.toDate(),
      blockedReason: userData.blockedReason,
      blockedBy: userData.blockedBy,
      updatedAt: userData.updatedAt?.toDate(),
    };
  } catch (error: any) {
    console.error('이메일 로그인 오류:', error);
    if (error.code === 'auth/user-not-found') {
      throw new Error('등록되지 않은 이메일입니다.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('비밀번호가 올바르지 않습니다.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('올바른 이메일 형식이 아닙니다.');
    }
    throw error;
  }
};

// 비밀번호 설정 (최초 로그인 시)
export const setInitialPassword = async (
  email: string,
  password: string
): Promise<void> => {
  if (!auth || !db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    // Firestore에서 이메일로 사용자 찾기
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase().trim())
    );
    const querySnapshot = await getDocs(usersQuery);

    if (querySnapshot.empty) {
      throw new Error('등록되지 않은 이메일입니다.');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Firebase Auth에 계정 생성
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.toLowerCase().trim(),
      password
    );

    // Firestore의 UID를 Firebase Auth UID로 업데이트
    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        uid: credential.user.uid,
        provider: 'email',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 기존 문서 삭제 (UID가 변경되었으므로)
    if (userDoc.id !== credential.user.uid) {
      await deleteDoc(userDoc.ref);
    }
  } catch (error: any) {
    console.error('비밀번호 설정 오류:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('이미 등록된 이메일입니다.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
    }
    throw error;
  }
};

// 비밀번호 변경
export const changePassword = async (newPassword: string): Promise<void> => {
  if (!auth || !auth.currentUser) {
    throw new Error('로그인이 필요합니다.');
  }

  try {
    await updatePassword(auth.currentUser, newPassword);
  } catch (error: any) {
    console.error('비밀번호 변경 오류:', error);
    if (error.code === 'auth/weak-password') {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
    }
    throw error;
  }
};

// 현재 사용자 정보 가져오기
export const getCurrentUser = (): FirebaseUser | null => {
  if (!auth) {
    return null;
  }
  return auth.currentUser;
};

