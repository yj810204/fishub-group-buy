/**
 * 관리자 권한 관련 유틸리티 함수
 */

import { User } from '@/types';

// 최고관리자 이메일 목록
const ADMIN_EMAILS = ['yj63486202@gmail.com'];

/**
 * 이메일이 최고관리자인지 확인 (하드코딩된 이메일 목록)
 * @param email 사용자 이메일
 * @returns 최고관리자 여부
 */
export const isAdminByEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * 사용자가 최고관리자인지 확인 (Firestore의 isAdmin 필드 또는 이메일 확인)
 * @param user 사용자 객체 또는 이메일
 * @returns 최고관리자 여부
 */
export const isAdmin = (user: User | string | null | undefined): boolean => {
  if (!user) return false;
  
  // User 객체인 경우
  if (typeof user === 'object' && 'isAdmin' in user) {
    if (user.isAdmin === true) return true;
    // isAdmin이 false이거나 undefined인 경우 이메일로 확인
    if (user.email) {
      return isAdminByEmail(user.email);
    }
    return false;
  }
  
  // 문자열(이메일)인 경우
  if (typeof user === 'string') {
    return isAdminByEmail(user);
  }
  
  return false;
};

/**
 * 관리자 권한이 필요한 작업인지 확인
 * @param user 사용자 객체 또는 이메일
 * @returns 관리자 권한 여부
 */
export const hasAdminAccess = (user: User | string | null | undefined): boolean => {
  return isAdmin(user);
};

