/**
 * 관리자 권한 관련 유틸리티 함수
 */

// 최고관리자 이메일 목록
const ADMIN_EMAILS = ['yj63486202@gmail.com'];

/**
 * 이메일이 최고관리자인지 확인
 * @param email 사용자 이메일
 * @returns 최고관리자 여부
 */
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * 관리자 권한이 필요한 작업인지 확인
 * @param email 사용자 이메일
 * @returns 관리자 권한 여부
 */
export const hasAdminAccess = (email: string | null | undefined): boolean => {
  return isAdmin(email);
};

