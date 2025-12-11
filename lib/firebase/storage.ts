import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * 이미지 파일을 Firebase Storage에 업로드
 * @param file 업로드할 파일
 * @param path 저장 경로 (예: 'products/image.jpg')
 * @returns 다운로드 URL
 */
export const uploadImage = async (
  file: File,
  path: string
): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    // 파일 참조 생성
    const storageRef = ref(storage, path);
    
    // 파일 업로드
    await uploadBytes(storageRef, file);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    throw error;
  }
};

/**
 * Firebase Storage에서 이미지 삭제
 * @param path 삭제할 파일 경로
 */
export const deleteImage = async (path: string): Promise<void> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    throw error;
  }
};

/**
 * 제품 이미지 업로드 경로 생성
 * @param userId 사용자 ID
 * @param productId 제품 ID (선택사항, 새 제품이면 생성)
 * @param fileName 파일명
 * @returns 저장 경로
 */
export const getProductImagePath = (
  userId: string,
  productId: string | null,
  fileName: string
): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileId = productId || `temp_${timestamp}`;
  return `products/${userId}/${fileId}/${timestamp}_${sanitizedFileName}`;
};

