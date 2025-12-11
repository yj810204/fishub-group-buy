import { DiscountTier } from '@/types';

/**
 * 현재 참여 수량에 따른 할인율을 계산합니다.
 * @param totalQuantity 현재 총 참여 수량
 * @param discountTiers 할인 구간 배열
 * @returns 할인율 (0.05 = 5%)
 */
export const calculateDiscountRate = (
  totalQuantity: number,
  discountTiers: DiscountTier[]
): number => {
  // 할인 구간을 정렬 (min 기준 오름차순)
  const sortedTiers = [...discountTiers].sort((a, b) => a.min - b.min);

  // 현재 참여 수량이 속하는 할인 구간 찾기
  for (const tier of sortedTiers) {
    if (totalQuantity >= tier.min && totalQuantity <= tier.max) {
      return tier.discount;
    }
  }

  // 할인 구간에 해당하지 않으면 0% 할인
  return 0;
};

/**
 * 할인율을 적용한 최종 가격을 계산합니다.
 * @param basePrice 기본 가격
 * @param totalQuantity 현재 총 참여 수량
 * @param discountTiers 할인 구간 배열
 * @returns 할인 적용된 최종 가격 (단가)
 */
export const calculateFinalPrice = (
  basePrice: number,
  totalQuantity: number,
  discountTiers: DiscountTier[]
): number => {
  const discountRate = calculateDiscountRate(totalQuantity, discountTiers);
  const discountAmount = basePrice * discountRate;
  return Math.floor(basePrice - discountAmount);
};

/**
 * 할인율을 퍼센트 문자열로 변환합니다.
 * @param discountRate 할인율 (0.05 = 5%)
 * @returns 퍼센트 문자열 (예: "5%")
 */
export const formatDiscountRate = (discountRate: number): string => {
  return `${(discountRate * 100).toFixed(0)}%`;
};

/**
 * 다음 할인 구간까지 필요한 수량을 계산합니다.
 * @param totalQuantity 현재 총 참여 수량
 * @param discountTiers 할인 구간 배열
 * @returns 다음 구간까지 필요한 수량 (이미 최대 구간이면 null)
 */
export const getParticipantsUntilNextTier = (
  totalQuantity: number,
  discountTiers: DiscountTier[]
): number | null => {
  const sortedTiers = [...discountTiers].sort((a, b) => a.min - b.min);

  // 현재 구간 찾기
  let currentTierIndex = -1;
  for (let i = 0; i < sortedTiers.length; i++) {
    if (
      totalQuantity >= sortedTiers[i].min &&
      totalQuantity <= sortedTiers[i].max
    ) {
      currentTierIndex = i;
      break;
    }
  }

  // 다음 구간이 있는지 확인
  if (currentTierIndex >= 0 && currentTierIndex < sortedTiers.length - 1) {
    const nextTier = sortedTiers[currentTierIndex + 1];
    return nextTier.min - totalQuantity;
  }

  return null;
};

