import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();

// 관리자가 사용자를 삭제하는 Cloud Function
export const deleteUser = onCall(
  {
    region: 'us-central1', // 리전 명시
    cors: [
      'https://fishub-group-qpk1wdo11-jeong-youngnams-projects.vercel.app',
      /https:\/\/.*\.vercel\.app/,
      /https:\/\/.*\.firebaseapp\.com/,
      /https:\/\/.*\.web\.app/,
    ],
  },
  async (request) => {
  // 인증 확인
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      '인증이 필요합니다.'
    );
  }

  // 관리자 확인 (이메일 기반)
  const adminEmail = 'yj63486202@gmail.com';
  if (request.auth.token.email !== adminEmail) {
    throw new HttpsError(
      'permission-denied',
      '관리자만 사용자를 삭제할 수 있습니다.'
    );
  }

  const {uid} = request.data as {uid: string};

  if (!uid) {
    throw new HttpsError(
      'invalid-argument',
      '사용자 UID가 필요합니다.'
    );
  }

  try {
    // Firebase Authentication에서 사용자 삭제 (사용자가 존재하는 경우에만)
    try {
      await admin.auth().deleteUser(uid);
      console.log(`Firebase Auth에서 사용자 ${uid} 삭제 완료`);
    } catch (authError: unknown) {
      // 사용자가 Firebase Auth에 없을 수 있음 (관리자가 추가한 사용자 등)
      const error = authError as {code?: string; message?: string};
      if (error.code === 'auth/user-not-found') {
        console.log(`Firebase Auth에 사용자 ${uid}가 없습니다. Firestore만 삭제합니다.`);
      } else {
        // 다른 오류는 다시 throw
        throw authError;
      }
    }

    // Firestore에서 사용자 문서 삭제
    try {
      await admin.firestore().collection('users').doc(uid).delete();
      console.log(`Firestore에서 사용자 ${uid} 삭제 완료`);
    } catch (firestoreError: unknown) {
      console.error('Firestore 삭제 오류:', firestoreError);
      const error = firestoreError as {message?: string};
      // Firestore 삭제 실패는 무시하지 않고 오류로 처리
      throw new HttpsError(
        'internal',
        'Firestore에서 사용자 삭제에 실패했습니다.',
        error.message || '알 수 없는 오류'
      );
    }

    return {success: true, message: '사용자가 성공적으로 삭제되었습니다.'};
  } catch (error: unknown) {
    console.error('사용자 삭제 오류:', error);
    // 이미 HttpsError인 경우 그대로 throw
    if (error instanceof HttpsError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    throw new HttpsError(
      'internal',
      '사용자 삭제에 실패했습니다.',
      errorMessage
    );
  }
});
