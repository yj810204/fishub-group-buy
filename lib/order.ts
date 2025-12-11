import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Product, Order } from '@/types';
import { calculateFinalPrice } from './discount';

/**
 * 제품의 총 수량이 변경될 때, 해당 제품의 모든 pending 주문들의 가격을 재계산하여 업데이트합니다.
 * @param productId 제품 ID
 * @param currentQuantity 현재 총 수량
 * @param basePrice 제품 기본 가격
 * @param discountTiers 할인 구간 배열
 */
export const recalculatePendingOrders = async (
  productId: string,
  currentQuantity: number,
  basePrice: number,
  discountTiers: { min: number; max: number; discount: number }[]
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    // 해당 제품의 모든 pending 주문 조회
    const ordersQuery = query(
      collection(db, 'orders'),
      where('productId', '==', productId),
      where('status', '==', 'pending')
    );

    const ordersSnapshot = await getDocs(ordersQuery);

    if (ordersSnapshot.empty) {
      return; // 업데이트할 주문이 없음
    }

    // 현재 총 수량 기준으로 할인율 계산
    const newFinalPrice = calculateFinalPrice(basePrice, currentQuantity, discountTiers);

    // 배치 업데이트 사용 (성능 향상)
    const batch = writeBatch(db);
    let updateCount = 0;

    ordersSnapshot.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      const quantity = orderData.quantity || 1;
      const newTotalPrice = newFinalPrice * quantity;

      // 가격이 변경된 경우에만 업데이트
      if (orderData.finalPrice !== newFinalPrice || orderData.totalPrice !== newTotalPrice) {
        batch.update(orderDoc.ref, {
          finalPrice: newFinalPrice,
          totalPrice: newTotalPrice,
        });
        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`${updateCount}개의 pending 주문 가격이 업데이트되었습니다.`);
    }
  } catch (error) {
    console.error('주문 가격 재계산 오류:', error);
    throw error;
  }
};

