  'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, ProgressBar } from 'react-bootstrap';
import { ImageModal } from '@/components/common/ImageModal';
import { Product, Order } from '@/types';
import { useAuth } from '@/components/auth/AuthContext';
import {
  calculateFinalPrice,
  formatDiscountRate,
  calculateDiscountRate,
  getParticipantsUntilNextTier,
} from '@/lib/discount';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import Link from 'next/link';
import { ProductInfoTemplate } from '@/types';
import { Table } from 'react-bootstrap';
import {
  isWithinPeriod,
  isBeforeStart,
  isAfterEnd,
  getTimeUntilStart,
  getTimeUntilEnd,
  getProductStatus,
} from '@/lib/product';
import { isUserBlocked } from '@/lib/user';

interface ProductDetailProps {
  product: Product;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ product }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [currentParticipants, setCurrentParticipants] = useState(
    product.currentParticipants
  );
  const [hasParticipated, setHasParticipated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [productInfoTemplate, setProductInfoTemplate] = useState<ProductInfoTemplate | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);

  useEffect(() => {
    if (!db) return;

    // 실시간으로 참여 인원 업데이트
    const productRef = doc(db, 'products', product.id);
    const unsubscribe = onSnapshot(productRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentParticipants(data.currentParticipants || 0);
      }
    });

    // 사용자가 이미 참여했는지 확인
    if (user) {
      checkParticipation();
    }

    // 상품정보 제공고시 템플릿 로드
    if (product.productInfoTemplateId) {
      loadProductInfoTemplate(product.productInfoTemplateId);
    }

    return () => unsubscribe();
  }, [product.id, product.productInfoTemplateId, user, db]);

  // 실시간 남은 시간 업데이트
  useEffect(() => {
    if (!product.endDate) {
      setTimeRemaining(null);
      setIsTimeExpired(false);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(product.endDate!);
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(null);
        setIsTimeExpired(true);
        return;
      }

      setIsTimeExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}일 ${hours}시간 ${minutes}분 ${seconds}초`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}시간 ${minutes}분 ${seconds}초`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}분 ${seconds}초`);
      } else {
        setTimeRemaining(`${seconds}초`);
      }
    };

    // 즉시 실행
    updateTimeRemaining();

    // 1초마다 업데이트
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [product.endDate]);

  const loadProductInfoTemplate = async (templateId: string) => {
    if (!db) return;

    try {
      const templateDoc = await getDoc(doc(db, 'productInfoTemplates', templateId));
      if (templateDoc.exists()) {
        const data = templateDoc.data();
        setProductInfoTemplate({
          id: templateDoc.id,
          name: data.name,
          fields: data.fields || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        });
      }
    } catch (error) {
      console.error('템플릿 로드 오류:', error);
    }
  };

  const checkParticipation = async () => {
    if (!user || !db) return;

    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('productId', '==', product.id),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(ordersQuery);
      const hasOrder = !querySnapshot.empty;
      setHasParticipated(hasOrder);
      if (hasOrder && !querySnapshot.empty) {
        // 취소되지 않은 주문 찾기
        const activeOrder = querySnapshot.docs.find(
          (doc) => doc.data().status !== 'cancelled'
        );
        if (activeOrder) {
          setOrderId(activeOrder.id);
        } else {
          setOrderId(null);
        }
      } else {
        setOrderId(null);
      }
    } catch (error) {
      console.error('참여 확인 오류:', error);
    }
  };

  const handleParticipate = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (product.status !== 'active') {
      setError('이 제품은 더 이상 참여할 수 없습니다.');
      return;
    }

    // 기간 확인
    if (!isWithinPeriod(product) || isTimeExpired) {
      if (isBeforeStart(product)) {
        const timeUntil = getTimeUntilStart(product);
        setError(
          timeUntil
            ? `공동구매가 아직 시작되지 않았습니다. (${timeUntil} 후 시작)`
            : '공동구매가 아직 시작되지 않았습니다.'
        );
      } else if (isAfterEnd(product) || isTimeExpired) {
        setError('공동구매 기간이 종료되었습니다.');
      } else {
        setError('현재 공동구매 참여 기간이 아닙니다.');
      }
      return;
    }

    if (hasParticipated) {
      setError('이미 참여하신 제품입니다.');
      return;
    }

    if (!db) {
      setError('Firebase가 초기화되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 할인 계산
      const discountRate = calculateDiscountRate(
        currentParticipants,
        product.discountTiers
      );
      const finalPrice = calculateFinalPrice(
        product.basePrice,
        currentParticipants,
        product.discountTiers
      );

      // 주문 생성
      const orderData: Omit<Order, 'id' | 'createdAt'> & {
        createdAt: any;
      } = {
        productId: product.id,
        userId: user.uid,
        participantCount: currentParticipants + 1,
        finalPrice,
        status: 'pending',
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'orders'), orderData);

      // 제품의 참여 인원 증가
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        currentParticipants: increment(1),
      });

      setHasParticipated(true);
      // 새로 생성된 주문 ID 저장
      const newOrderQuery = query(
        collection(db, 'orders'),
        where('productId', '==', product.id),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const newOrderSnapshot = await getDocs(newOrderQuery);
      if (!newOrderSnapshot.empty) {
        setOrderId(newOrderSnapshot.docs[0].id);
      }
      alert('공동구매에 참여하셨습니다!');
    } catch (error) {
      console.error('참여 오류:', error);
      setError('참여 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !db || !orderId) {
      setError('취소할 수 없습니다.');
      return;
    }

    if (!confirm('정말 공동구매 참여를 취소하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 주문 상태를 'cancelled'로 변경
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'cancelled',
      });

      // 제품의 참여 인원 감소
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        currentParticipants: increment(-1),
      });

      setHasParticipated(false);
      setOrderId(null);
      alert('공동구매 참여가 취소되었습니다.');
    } catch (error) {
      console.error('취소 오류:', error);
      setError('취소 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const discountRate = calculateDiscountRate(
    currentParticipants,
    product.discountTiers
  );
  const finalPrice = calculateFinalPrice(
    product.basePrice,
    currentParticipants,
    product.discountTiers
  );
  const participantsUntilNextTier = getParticipantsUntilNextTier(
    currentParticipants,
    product.discountTiers
  );

  // 최대 할인 구간 찾기
  const maxTier = [...product.discountTiers].sort(
    (a, b) => b.max - a.max
  )[0];
  const maxDiscountRate = maxTier ? maxTier.discount : 0;

  const periodStatus = getProductStatus(product);

  const formatDateTime = (date: Date | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getPeriodBadge = () => {
    const hasPeriod = product.startDate || product.endDate;
    if (!hasPeriod) return null;

    const periodText = (() => {
      switch (periodStatus) {
        case 'upcoming':
          return '구매기간 이전';
        case 'active':
          return '진행중';
        case 'ended':
          return '구매기간 이후';
        default:
          return null;
      }
    })();

    if (!periodText) return null;

    switch (periodStatus) {
      case 'upcoming':
        return <Badge bg="info" className="me-2">{periodText}</Badge>;
      case 'active':
        return <Badge bg="success" className="me-2">{periodText}</Badge>;
      case 'ended':
        return <Badge bg="secondary" className="me-2">{periodText}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-3">
        {/* 제품 상태 배지: 기간 상태가 active일 때는 제품 상태 배지 표시 안 함 (중복 방지) */}
        {periodStatus !== 'active' && product.status === 'active' && (
          <Badge bg="success" className="me-2">
            진행 중
          </Badge>
        )}
        {product.status === 'completed' && (
          <Badge bg="secondary" className="me-2">
            완료
          </Badge>
        )}
        {product.status === 'cancelled' && (
          <Badge bg="danger" className="me-2">
            취소됨
          </Badge>
        )}
        {getPeriodBadge()}
      </div>

      <h1 className="mb-4">{product.name}</h1>

      {/* 제품 사진 섹션 */}
      {(product.imageUrls && product.imageUrls.length > 0) || product.imageUrl ? (
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">제품 사진</h5>
            <div className="row g-3">
              {(product.imageUrls || (product.imageUrl ? [product.imageUrl] : [])).map(
                (imageUrl, index) => (
                  <div key={index} className="col-md-4 col-sm-6 col-12">
                    <div
                      className="position-relative"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setShowImageModal(true);
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={`${product.name} ${index + 1}`}
                        className="img-fluid rounded shadow-sm w-100"
                        style={{
                          height: '250px',
                          objectFit: 'cover',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                      <div className="position-absolute top-0 start-0 m-2">
                        <Badge bg="dark" style={{ opacity: 0.8 }}>
                          {index + 1} / {(product.imageUrls || [product.imageUrl]).length}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </Card.Body>
        </Card>
      ) : null}

      {/* 제품 설명 섹션 */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">제품 설명</h5>
          <p className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>
            {product.description}
          </p>
        </Card.Body>
      </Card>

      {/* 상품정보 제공고시 섹션 */}
      {product.productInfoTemplateId && product.productInfoData && productInfoTemplate && (
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">상품정보 제공고시</h5>
            <div className="table-responsive">
              <Table bordered>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>항목</th>
                    <th>내용</th>
                  </tr>
                </thead>
                <tbody>
                  {productInfoTemplate.fields
                    .sort((a, b) => a.order - b.order)
                    .map((field, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{field.label}</strong>
                        </td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>
                          {product.productInfoData?.[field.label] || '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* 공동구매 기간 정보 */}
      {(product.startDate || product.endDate) && (
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">공동구매 기간</h5>
            <div className="mb-2">
              {product.startDate && (
                <p className="mb-1">
                  <strong>시작일:</strong>{' '}
                  {new Date(product.startDate).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              {product.endDate && (
                <p className="mb-1">
                  <strong>종료일:</strong>{' '}
                  {new Date(product.endDate).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
            {isBeforeStart(product) && (
              <Alert variant="info" className="mb-0">
                <i className="bi bi-clock me-2"></i>
                공동구매가 아직 시작되지 않았습니다.{' '}
                {getTimeUntilStart(product) && (
                  <strong>({getTimeUntilStart(product)} 후 시작)</strong>
                )}
              </Alert>
            )}
            {isAfterEnd(product) && (
              <Alert variant="warning" className="mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                공동구매 기간이 종료되었습니다.
              </Alert>
            )}
            {isWithinPeriod(product) && product.endDate && (
              <Alert variant="success" className="mb-0">
                <i className="bi bi-check-circle me-2"></i>
                공동구매 진행 중입니다.{' '}
                {timeRemaining && (
                  <strong>({timeRemaining} 남음)</strong>
                )}
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}

      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">가격 정보</h5>
          <div className="mb-2">
            <span className="text-decoration-line-through text-muted me-2">
              시작가: {product.basePrice.toLocaleString()}원
            </span>
            {discountRate > 0 && (
              <Badge bg="danger">{formatDiscountRate(discountRate)} 할인</Badge>
            )}
          </div>
          <div className="h3 text-primary mb-3">
            현재가: {finalPrice.toLocaleString()}원
          </div>
          <div className="text-muted mb-3">
            현재 참여 인원: <strong>{currentParticipants}명</strong>
          </div>

          {participantsUntilNextTier !== null && (
            <Alert variant="info" className="mb-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>{participantsUntilNextTier}명</strong>이 더 참여하면 다음
              할인 구간에 도달합니다!
            </Alert>
          )}

          {maxDiscountRate > discountRate && (
            <div className="mb-3">
              <small className="text-muted">최대 할인율: </small>
              <Badge bg="warning" text="dark">
                {formatDiscountRate(maxDiscountRate)}
              </Badge>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">할인 구간</h5>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>참여 인원</th>
                  <th>할인율</th>
                  <th>최종 가격</th>
                </tr>
              </thead>
              <tbody>
                {product.discountTiers
                  .sort((a, b) => a.min - b.min)
                  .map((tier, index) => {
                    const tierPrice = calculateFinalPrice(
                      product.basePrice,
                      tier.min,
                      [tier]
                    );
                    const isCurrentTier =
                      currentParticipants >= tier.min &&
                      currentParticipants <= tier.max;
                    return (
                      <tr
                        key={index}
                        className={isCurrentTier ? 'table-success' : ''}
                      >
                        <td>
                          {tier.min}명 ~ {tier.max}명
                        </td>
                        <td>
                          <Badge bg="danger">
                            {formatDiscountRate(tier.discount)}
                          </Badge>
                        </td>
                        <td>
                          <strong>{tierPrice.toLocaleString()}원</strong>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {/* 수정 버튼 (작성자 또는 관리자만) */}
      {user && (product.createdBy === user.uid || isAdmin(user)) && (
        <div className="mb-3">
          <Link href={`/products/${product.id}/edit`}>
            <Button variant="outline-primary">
              <i className="bi bi-pencil me-2"></i>
              제품 수정
            </Button>
          </Link>
        </div>
      )}

      {/* 하단 고정 패널 */}
      {product.status === 'active' && (
        <div
          className="position-fixed bottom-0 start-0 end-0 p-3 bg-white border-top shadow-lg"
          style={{ zIndex: 1050 }}
        >
          <div className="container">
            <div className="d-grid gap-2">
              {hasParticipated && orderId ? (
                <>
                  <Alert variant="success" className="mb-0">
                    <i className="bi bi-check-circle me-2"></i>
                    이미 참여하신 제품입니다.
                  </Alert>
                  <Button
                    variant="outline-danger"
                    size="lg"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        처리 중...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-x-circle me-2"></i>
                        참여 취소하기
                      </>
                    )}
                  </Button>
                </>
              ) : !isWithinPeriod(product) || isTimeExpired ? (
                <Alert variant="warning" className="mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {isBeforeStart(product)
                    ? '공동구매가 아직 시작되지 않았습니다.'
                    : '공동구매 기간이 종료되었습니다.'}
                </Alert>
              ) : user && isUserBlocked(user) ? (
                <Alert variant="danger" className="mb-0">
                  <i className="bi bi-ban me-2"></i>
                  차단된 회원은 공동구매에 참여할 수 없습니다.
                </Alert>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleParticipate}
                  disabled={loading || isTimeExpired || (user ? isUserBlocked(user) : false)}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      처리 중...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cart-plus me-2"></i>
                      공동구매 참여하기
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 하단 패널 공간 확보 */}
      {product.status === 'active' && <div style={{ height: '120px' }}></div>}

      {/* 이미지 모달 */}
      {(product.imageUrls && product.imageUrls.length > 0) || product.imageUrl ? (
        <ImageModal
          show={showImageModal}
          onHide={() => setShowImageModal(false)}
          imageUrl={
            (product.imageUrls || (product.imageUrl ? [product.imageUrl] : []))[
              selectedImageIndex
            ]
          }
          imageIndex={selectedImageIndex}
          totalImages={
            (product.imageUrls || (product.imageUrl ? [product.imageUrl] : [])).length
          }
          onPrevious={() => {
            if (selectedImageIndex > 0) {
              setSelectedImageIndex(selectedImageIndex - 1);
            }
          }}
          onNext={() => {
            const total =
              (product.imageUrls || (product.imageUrl ? [product.imageUrl] : [])).length;
            if (selectedImageIndex < total - 1) {
              setSelectedImageIndex(selectedImageIndex + 1);
            }
          }}
        />
      ) : null}
    </div>
  );
};

