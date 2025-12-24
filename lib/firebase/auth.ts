import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth, db, getMissingEnvVars } from './config';
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
import { User } from '@/types';

const googleProvider = new GoogleAuthProvider();

// Google 로그인
export const signInWithGoogle = async (): Promise<User> => {
  if (!auth || !db) {
    const missingVars = getMissingEnvVars();
    if (missingVars.length > 0) {
      throw new Error(
        `Firebase가 초기화되지 않았습니다. 환경 변수가 설정되지 않았습니다.\n` +
        `누락된 변수: ${missingVars.join(', ')}\n` +
        `프로젝트 루트에 .env.local 파일을 생성하고 Firebase 설정 정보를 추가하세요.\n` +
        `자세한 내용은 FIREBASE_SETUP.md 파일을 참조하세요.`
      );
    }
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
      updatedAt: serverTimestamp(),
    };

    // undefined가 아닌 경우에만 필드 추가
    if (existingData.phoneNumber !== undefined) {
      userData.phoneNumber = existingData.phoneNumber;
    }
    if (existingData.blockedUntil !== undefined) {
      userData.blockedUntil = existingData.blockedUntil;
    }
    if (existingData.blockedReason !== undefined) {
      userData.blockedReason = existingData.blockedReason;
    }
    if (existingData.blockedBy !== undefined) {
      userData.blockedBy = existingData.blockedBy;
    }

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
    // 원본 오류의 code를 유지하면서 메시지만 변경
    if (error.code === 'auth/user-not-found') {
      error.message = '등록되지 않은 이메일입니다.';
      throw error;
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      // 최신 Firebase SDK에서는 auth/invalid-credential로 통합됨
      error.message = '비밀번호가 올바르지 않습니다.';
      throw error;
    } else if (error.code === 'auth/invalid-email') {
      error.message = '올바른 이메일 형식이 아닙니다.';
      throw error;
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
    // Firebase Auth에 이미 계정이 있는지 먼저 확인
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email.toLowerCase().trim());
      // Firebase Auth에 계정이 있으면 탈퇴한 사용자로 처리
      if (signInMethods.length > 0) {
        throw new Error('탈퇴한 이메일 주소는 재가입할 수 없습니다.');
      }
    } catch (checkError: any) {
      // 탈퇴한 사용자 오류는 그대로 전달
      if (checkError.message === '탈퇴한 이메일 주소는 재가입할 수 없습니다.') {
        throw checkError;
      }
      // 기타 오류는 무시하고 계속 진행
      console.warn('로그인 방법 확인 실패, 계속 진행:', checkError);
    }

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

    // 기존 문서의 모든 데이터를 보존하면서 UID만 업데이트
    const updatedUserData = {
      ...userData,
      uid: credential.user.uid,
      provider: 'email',
      updatedAt: serverTimestamp(),
    };

    // 문서 ID가 Firebase Auth UID와 다른 경우 새 문서로 이동
    if (userDoc.id !== credential.user.uid) {
      // 새 문서 생성 (Firebase Auth UID를 문서 ID로 사용)
      // 현재 사용자는 자신의 문서를 생성할 수 있음
      await setDoc(doc(db, 'users', credential.user.uid), updatedUserData);
      
      // 기존 문서 삭제 시도
      // Firestore 규칙에서 자신의 이메일과 일치하는 문서는 삭제 가능하도록 허용
      try {
        await deleteDoc(userDoc.ref);
        console.log('기존 문서 삭제 성공');
      } catch (deleteError: any) {
        // 권한 오류인 경우, 기존 문서에 표시를 남겨서 관리자가 나중에 정리할 수 있도록 함
        console.warn('기존 문서 삭제 실패:', deleteError);
        // 기존 문서에 삭제 표시를 남김 (선택사항)
        try {
          await setDoc(
            userDoc.ref,
            {
              _migrated: true,
              _migratedTo: credential.user.uid,
              _migratedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (markError) {
          console.warn('기존 문서 마킹 실패:', markError);
        }
      }
    } else {
      // 같은 문서 ID면 업데이트만
      await setDoc(userDoc.ref, updatedUserData, { merge: true });
    }
  } catch (error: any) {
    console.error('비밀번호 설정 오류:', error);
    if (error.code === 'auth/email-already-in-use') {
      // Firebase Auth에 계정이 있는 경우는 항상 탈퇴한 사용자로 처리
      // (Firestore에 사용자가 있어도 Firebase Auth에 계정이 있으면 탈퇴한 사용자)
      throw new Error('탈퇴한 이메일 주소는 재가입할 수 없습니다.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
    }
    // 이미 "탈퇴한 이메일 주소는 재가입할 수 없습니다." 오류인 경우 그대로 전달
    if (error.message === '탈퇴한 이메일 주소는 재가입할 수 없습니다.') {
      throw error;
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

