import { Product } from '@/types';

/**
 * 현재 시간이 공동구매 기간 내에 있는지 확인
 * @param product 제품 정보
 * @returns 기간 내 여부
 */
export const isWithinPeriod = (product: Product): boolean => {
  const now = new Date();
  
  // 기간이 설정되지 않은 경우 true 반환 (하위 호환성)
  if (!product.startDate && !product.endDate) {
    return true;
  }

  const startDate = product.startDate ? new Date(product.startDate) : null;
  const endDate = product.endDate ? new Date(product.endDate) : null;

  // 시작일이 있고 현재 시간이 시작일 이전이면 false
  if (startDate && now < startDate) {
    return false;
  }

  // 종료일이 있고 현재 시간이 종료일 이후이면 false
  if (endDate && now > endDate) {
    return false;
  }

  return true;
};

/**
 * 공동구매 시작 전인지 확인
 * @param product 제품 정보
 * @returns 시작 전 여부
 */
export const isBeforeStart = (product: Product): boolean => {
  if (!product.startDate) return false;
  const now = new Date();
  const startDate = new Date(product.startDate);
  return now < startDate;
};

/**
 * 공동구매 종료 후인지 확인
 * @param product 제품 정보
 * @returns 종료 후 여부
 */
export const isAfterEnd = (product: Product): boolean => {
  if (!product.endDate) return false;
  const now = new Date();
  const endDate = new Date(product.endDate);
  return now > endDate;
};

/**
 * 공동구매 시작까지 남은 시간을 반환
 * @param product 제품 정보
 * @returns 남은 시간 문자열 (예: "2일 3시간")
 */
export const getTimeUntilStart = (product: Product): string | null => {
  if (!product.startDate) return null;
  const now = new Date();
  const startDate = new Date(product.startDate);
  
  if (now >= startDate) return null;

  const diff = startDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}일 ${hours}시간`;
  } else if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else {
    return `${minutes}분`;
  }
};

/**
 * 공동구매 종료까지 남은 시간을 반환
 * @param product 제품 정보
 * @returns 남은 시간 문자열 (예: "2일 3시간")
 */
export const getTimeUntilEnd = (product: Product): string | null => {
  if (!product.endDate) return null;
  const now = new Date();
  const endDate = new Date(product.endDate);
  
  if (now >= endDate) return null;

  const diff = endDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}일 ${hours}시간`;
  } else if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else {
    return `${minutes}분`;
  }
};

/**
 * 제품의 구매 기간 상태를 반환
 * @param product 제품 정보
 * @returns 'upcoming' | 'active' | 'ended'
 */
export const getProductStatus = (product: Product): 'upcoming' | 'active' | 'ended' => {
  const now = new Date();
  
  // 기간이 설정되지 않은 경우 'active' 반환 (하위 호환성)
  if (!product.startDate && !product.endDate) {
    return 'active';
  }

  const startDate = product.startDate ? new Date(product.startDate) : null;
  const endDate = product.endDate ? new Date(product.endDate) : null;

  // 시작일이 있고 현재 시간이 시작일 이전이면 'upcoming'
  if (startDate && now < startDate) {
    return 'upcoming';
  }

  // 종료일이 있고 현재 시간이 종료일 이후이면 'ended'
  if (endDate && now > endDate) {
    return 'ended';
  }

  return 'active';
};
