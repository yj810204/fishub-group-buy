'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, Card, Badge, Spinner, Alert, Button, Table } from 'react-bootstrap';
import { useAuth } from '@/components/auth/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, Product } from '@/types';
import Link from 'next/link';
import { formatDiscountRate } from '@/lib/discount';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (params.id && typeof params.id === 'string' && user) {
      loadOrderData(params.id);
    }
  }, [params.id, user, authLoading, router]);

  const loadOrderData = async (orderId: string) => {
    if (!db || !user) {
      setError('Firebase가 초기화되지 않았습니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 주문 정보 가져오기
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        setError('주문을 찾을 수 없습니다.');
        return;
      }

      const orderData = orderDoc.data();
      
      // 본인의 주문인지 확인
      if (orderData.userId !== user.uid) {
        setError('접근 권한이 없습니다.');
        return;
      }

      const orderObj: Order = {
        id: orderDoc.id,
        productId: orderData.productId,
        userId: orderData.userId,
        participantCount: orderData.participantCount || 0,
        quantity: orderData.quantity || 1,
        finalPrice: orderData.finalPrice,
        totalPrice: orderData.totalPrice || (orderData.finalPrice * (orderData.quantity || 1)),
        status: orderData.status,
        createdAt: orderData.createdAt?.toDate() || new Date(),
      };
      setOrder(orderObj);

      // 제품 정보 가져오기
      const productDoc = await getDoc(doc(db, 'products', orderData.productId));
      if (productDoc.exists()) {
        const productData = productDoc.data();
        const productObj: Product = {
          id: productDoc.id,
          name: productData.name,
          description: productData.description,
          basePrice: productData.basePrice,
          discountTiers: productData.discountTiers,
          currentParticipants: productData.currentParticipants || 0,
          currentQuantity: productData.currentQuantity || 0,
          status: productData.status,
          createdAt: productData.createdAt?.toDate() || new Date(),
          createdBy: productData.createdBy,
          imageUrl: productData.imageUrl,
          imageUrls: productData.imageUrls || (productData.imageUrl ? [productData.imageUrl] : undefined),
          startDate: productData.startDate?.toDate(),
          endDate: productData.endDate?.toDate(),
          productInfoTemplateId: productData.productInfoTemplateId,
          productInfoData: productData.productInfoData,
        };
        setProduct(productObj);
      }
    } catch (error) {
      console.error('주문 정보 로드 오류:', error);
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge bg="warning">대기 중</Badge>;
      case 'confirmed':
        return <Badge bg="success">확정</Badge>;
      case 'cancelled':
        return <Badge bg="danger">취소됨</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // 할인율 계산 (finalPrice와 basePrice 비교)
  const calculateOrderDiscountRate = () => {
    if (!product || !order) return 0;
    
    // finalPrice와 basePrice를 비교하여 할인율 역산
    const discountAmount = product.basePrice - order.finalPrice;
    const discountRate = discountAmount / product.basePrice;
    
    return discountRate;
  };

  if (authLoading || loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </Spinner>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Container>
        <Alert variant="danger">
          <Alert.Heading>오류</Alert.Heading>
          <p>{error || '주문을 찾을 수 없습니다.'}</p>
          <Link href="/my">
            <Button variant="primary">마이페이지로 돌아가기</Button>
          </Link>
        </Alert>
      </Container>
    );
  }

  const discountRate = calculateOrderDiscountRate();
  const discountAmount = product ? product.basePrice * discountRate : 0;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>주문 상세</h1>
        <Link href="/my">
          <Button variant="outline-secondary">
            <i className="bi bi-arrow-left me-2"></i>
            마이페이지로 돌아가기
          </Button>
        </Link>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">주문 정보</h5>
          <Table bordered>
            <tbody>
              <tr>
                <th style={{ width: '150px' }}>주문 ID</th>
                <td>{order.id}</td>
              </tr>
              <tr>
                <th>주문 상태</th>
                <td>{getStatusBadge(order.status)}</td>
              </tr>
              <tr>
                <th>주문 일시</th>
                <td>
                  {order.createdAt.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {product && (
        <>
          <Card className="mb-4">
            <Card.Body>
              <h5 className="mb-3">제품 정보</h5>
              <div className="d-flex gap-3 mb-3">
                {product.imageUrls?.[0] || product.imageUrl ? (
                  <img
                    src={product.imageUrls?.[0] || product.imageUrl}
                    alt={product.name}
                    style={{
                      width: '150px',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '150px',
                      height: '150px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                    }}
                  >
                    <i className="bi bi-image fs-1"></i>
                  </div>
                )}
                <div>
                  <h4>{product.name}</h4>
                  <p className="text-muted">{product.description}</p>
                  <Link href={`/products/${product.id}`}>
                    <Button variant="outline-primary" size="sm">
                      제품 상세 보기
                    </Button>
                  </Link>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Body>
              <h5 className="mb-3">주문 내역</h5>
              <Table bordered>
                <tbody>
                  <tr>
                    <th style={{ width: '150px' }}>참여 수량</th>
                    <td>{order.quantity}개</td>
                  </tr>
                  <tr>
                    <th>기본 가격</th>
                    <td>{product.basePrice.toLocaleString()}원</td>
                  </tr>
                  {discountRate > 0 && (
                    <>
                      <tr>
                        <th>할인율</th>
                        <td>
                          <Badge bg="danger">{formatDiscountRate(discountRate)} 할인</Badge>
                        </td>
                      </tr>
                      <tr>
                        <th>할인 금액</th>
                        <td className="text-danger">
                          -{discountAmount.toLocaleString()}원
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <th>단가</th>
                    <td>
                      <strong>{order.finalPrice.toLocaleString()}원</strong>
                    </td>
                  </tr>
                  <tr className="table-primary">
                    <th>총 가격</th>
                    <td>
                      <strong className="fs-5">
                        {order.totalPrice.toLocaleString()}원
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
}

