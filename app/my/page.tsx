'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { useAuth } from '@/components/auth/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order } from '@/types';
import Link from 'next/link';

export default function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadOrders();
    }
  }, [user, authLoading, router]);

  const loadOrders = async () => {
    if (!user || !db) return;

    try {
      setLoading(true);
      // Firestore 인덱스 오류 방지: userId로만 필터링하고 클라이언트에서 정렬
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(ordersQuery);
      const ordersData: Order[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ordersData.push({
          id: doc.id,
          productId: data.productId,
          userId: data.userId,
          participantCount: data.participantCount,
          finalPrice: data.finalPrice,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      // 클라이언트에서 날짜순 정렬
      ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setOrders(ordersData);
    } catch (error) {
      console.error('주문 로드 오류:', error);
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

  const handleCancelOrder = async (order: Order) => {
    if (!db || !user) return;

    if (!confirm('정말 이 주문을 취소하시겠습니까?')) {
      return;
    }

    setCancellingOrderId(order.id);

    try {
      // 주문 상태를 'cancelled'로 변경
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'cancelled',
      });

      // 제품의 참여 인원 감소
      const productRef = doc(db, 'products', order.productId);
      await updateDoc(productRef, {
        currentParticipants: increment(-1),
      });

      // 주문 목록 새로고침
      await loadOrders();
      alert('주문이 취소되었습니다.');
    } catch (error) {
      console.error('주문 취소 오류:', error);
      alert('주문 취소 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setCancellingOrderId(null);
    }
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

  if (!user) {
    return null; // 리다이렉트 중
  }

  return (
    <div>
      <h1 className="mb-4">마이페이지</h1>

      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">사용자 정보</h5>
          <p className="mb-1">
            <strong>이름:</strong> {user.displayName}
          </p>
          <p className="mb-1">
            <strong>이메일:</strong> {user.email}
          </p>
          <p className="mb-0">
            <strong>로그인 방법:</strong>{' '}
            {user.provider === 'google' ? 'Google' : 'Kakao'}
          </p>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <h5 className="mb-3">내 주문 내역</h5>
          {orders.length === 0 ? (
            <Alert variant="info">
              주문 내역이 없습니다.{' '}
              <Link href="/products">제품 둘러보기</Link>
            </Alert>
          ) : (
            <Table responsive>
              <thead>
                <tr>
                  <th>주문 ID</th>
                  <th>참여 인원</th>
                  <th>최종 가격</th>
                  <th>상태</th>
                  <th>주문 일시</th>
                  <th>상세</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id.substring(0, 8)}...</td>
                    <td>{order.participantCount}명</td>
                    <td>{order.finalPrice.toLocaleString()}원</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>
                      {order.createdAt.toLocaleDateString('ko-KR')}{' '}
                      {order.createdAt.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <Link href={`/products/${order.productId}`}>
                        <i className="bi bi-arrow-right-circle"></i>
                      </Link>
                    </td>
                    <td>
                      {order.status === 'pending' ? (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleCancelOrder(order)}
                          disabled={cancellingOrderId === order.id}
                        >
                          {cancellingOrderId === order.id ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              취소 중...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-x-circle me-1"></i>
                              취소
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

