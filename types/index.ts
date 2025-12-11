// 배송지 타입
export interface ShippingAddress {
  recipientName: string; // 수령인 이름
  phoneNumber: string; // 전화번호
  postalCode: string; // 우편번호
  address: string; // 기본주소
  detailAddress: string; // 상세주소
  deliveryMemo?: string; // 배송 메모 (선택사항)
}

// 사용자 타입
export interface User {
  uid: string;
  email: string;
  displayName: string;
  provider: 'google' | 'kakao' | 'email';
  createdAt: Date;
  status?: 'active' | 'blocked'; // 기본값: 'active'
  phoneNumber?: string;
  blockedUntil?: Date; // 기간 차단 종료일, 없으면 영구 차단
  blockedReason?: string; // 차단 사유
  blockedBy?: string; // 차단한 관리자 UID
  updatedAt?: Date;
  isAdmin?: boolean; // 최고관리자 여부
  shippingAddress?: ShippingAddress; // 배송지 정보
}

// 할인 구간 타입
export interface DiscountTier {
  min: number;
  max: number;
  discount: number; // 할인율 (0.05 = 5%)
}

// 상품정보 제공고시 필드 타입
export interface ProductInfoField {
  label: string; // 항목명 (예: "제품명", "식품의 유형")
  type: 'text' | 'textarea' | 'number' | 'date';
  order: number; // 표시 순서
}

// 상품정보 제공고시 템플릿 타입
export interface ProductInfoTemplate {
  id: string;
  name: string; // 템플릿 이름 (예: "식품류", "전자제품류")
  fields: ProductInfoField[];
  createdAt: Date;
  createdBy: string; // 관리자 UID
}

// 제품 타입
export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number; // 시작가
  discountTiers: DiscountTier[];
  currentParticipants: number; // 현재 참여 인원
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  createdBy: string; // user uid
  imageUrl?: string; // 단일 이미지 (하위 호환성)
  imageUrls?: string[]; // 여러 이미지
  startDate?: Date; // 공동구매 시작일
  endDate?: Date; // 공동구매 종료일
  productInfoTemplateId?: string; // 선택한 템플릿 ID
  productInfoData?: Record<string, string>; // { "제품명": "손질먹태채", ... }
}

// 주문 타입
export interface Order {
  id: string;
  productId: string;
  userId: string;
  participantCount: number; // 참여 시점의 인원 수
  finalPrice: number; // 할인 적용된 최종 가격
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
}

// 사이트 설정 타입
export interface SiteSettings {
  id: string;
  logoUrl?: string; // 사이트 로고 이미지 URL
  siteName: string; // 사이트 이름
  updatedAt: Date;
  updatedBy: string; // 관리자 UID
}

