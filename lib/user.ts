import { User } from '@/types';

/**
 * 사용자가 차단되었는지 확인
 * @param user 사용자 정보
 * @returns 차단 여부
 */
export const isUserBlocked = (user: User): boolean => {
  if (user.status !== 'blocked') {
    return false;
  }

  // 기간 차단인 경우 종료일 확인
  if (user.blockedUntil) {
    const now = new Date();
    const blockedUntil = new Date(user.blockedUntil);
    
    // 차단 기간이 지났으면 차단 해제
    if (now > blockedUntil) {
      return false;
    }
    
    return true;
  }

  // 영구 차단
  return true;
};

/**
 * 차단 상태 텍스트 반환
 * @param user 사용자 정보
 * @returns 차단 상태 텍스트
 */
export const getBlockStatus = (user: User): string => {
  if (!isUserBlocked(user)) {
    return '정상';
  }

  if (user.blockedUntil) {
    const blockedUntil = new Date(user.blockedUntil);
    return `차단 (${blockedUntil.toLocaleString('ko-KR')}까지)`;
  }

  return '영구 차단';
};

