'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Badge, Spinner, Alert, Button, Modal, Form } from 'react-bootstrap';
import { useAuth } from '@/components/auth/AuthContext';
import { changePassword } from '@/lib/firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  serverTimestamp,
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    phoneNumber: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadOrders();
      // 회원정보 변경 모달 열 때 현재 정보로 초기화
      setEditFormData({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
        newPassword: '',
        confirmPassword: '',
      });
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
          <p className="mb-1">
            <strong>로그인 방법:</strong>{' '}
            {user.provider === 'google' 
              ? 'Google' 
              : user.provider === 'email' 
              ? '이메일' 
              : 'Kakao'}
          </p>
          <div className="d-flex gap-2 mt-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => {
                setEditFormData({
                  displayName: user.displayName || '',
                  phoneNumber: user.phoneNumber || '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setEditError(null);
                setShowEditModal(true);
              }}
            >
              <i className="bi bi-pencil me-1"></i>
              회원정보 변경
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
            >
              <i className="bi bi-trash me-1"></i>
              탈퇴
            </Button>
          </div>
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

      {/* 회원정보 변경 모달 */}
      <Modal show={showEditModal} onHide={() => {
        setShowEditModal(false);
        setEditError(null);
        setEditFormData({
          displayName: user?.displayName || '',
          phoneNumber: user?.phoneNumber || '',
          newPassword: '',
          confirmPassword: '',
        });
      }}>
        <Modal.Header closeButton>
          <Modal.Title>회원정보 변경</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && (
            <Alert variant="danger" dismissible onClose={() => setEditError(null)}>
              {editError}
            </Alert>
          )}
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              setEditError(null);

              if (!editFormData.displayName.trim()) {
                setEditError('이름을 입력해주세요.');
                return;
              }

              // 비밀번호 변경이 요청된 경우 검증
              if (editFormData.newPassword || editFormData.confirmPassword) {
                if (editFormData.newPassword.length < 6) {
                  setEditError('비밀번호는 최소 6자 이상이어야 합니다.');
                  return;
                }

                if (editFormData.newPassword !== editFormData.confirmPassword) {
                  setEditError('새 비밀번호가 일치하지 않습니다.');
                  return;
                }
              }

              if (!db || !user) {
                setEditError('Firebase가 초기화되지 않았습니다.');
                return;
              }

              try {
                setSaving(true);

                // Firestore 사용자 정보 업데이트
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                  displayName: editFormData.displayName.trim(),
                  phoneNumber: editFormData.phoneNumber.trim() || null,
                  updatedAt: serverTimestamp(),
                });

                // 비밀번호 변경이 요청된 경우 (이메일 로그인 사용자만)
                if (user.provider === 'email' && editFormData.newPassword) {
                  await changePassword(editFormData.newPassword);
                }

                alert('회원정보가 변경되었습니다.');
                setShowEditModal(false);
                setEditFormData({
                  displayName: editFormData.displayName.trim(),
                  phoneNumber: editFormData.phoneNumber.trim(),
                  newPassword: '',
                  confirmPassword: '',
                });
                // 페이지 새로고침하여 변경된 정보 반영
                window.location.reload();
              } catch (error: any) {
                console.error('회원정보 변경 오류:', error);
                setEditError(error.message || '회원정보 변경에 실패했습니다.');
              } finally {
                setSaving(false);
              }
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label>이메일</Form.Label>
              <Form.Control
                type="email"
                value={user?.email || ''}
                disabled
                readOnly
              />
              <Form.Text className="text-muted">
                이메일은 변경할 수 없습니다.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>이름 <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                value={editFormData.displayName}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    displayName: e.target.value,
                  })
                }
                placeholder="이름을 입력하세요"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>전화번호</Form.Label>
              <Form.Control
                type="tel"
                value={editFormData.phoneNumber}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    phoneNumber: e.target.value,
                  })
                }
                placeholder="전화번호를 입력하세요 (선택사항)"
              />
            </Form.Group>

            {user?.provider === 'email' && (
              <>
                <hr />
                <h6 className="mb-3">비밀번호 변경</h6>
                <Form.Group className="mb-3">
                  <Form.Label>새 비밀번호</Form.Label>
                  <Form.Control
                    type="password"
                    value={editFormData.newPassword}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="변경하지 않으려면 비워두세요 (최소 6자 이상)"
                    minLength={6}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>새 비밀번호 확인</Form.Label>
                  <Form.Control
                    type="password"
                    value={editFormData.confirmPassword}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="비밀번호를 다시 입력하세요"
                    minLength={6}
                  />
                </Form.Group>
              </>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditError(null);
                  setEditFormData({
                    displayName: user?.displayName || '',
                    phoneNumber: user?.phoneNumber || '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
              >
                취소
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* 탈퇴 확인 모달 */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>회원 탈퇴</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>주의:</strong> 탈퇴하시면 모든 회원정보와 주문 내역이 삭제되며, 복구할 수 없습니다.
            <br />
            정말 탈퇴하시겠습니까?
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            취소
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!db || !user) {
                return;
              }

              if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                return;
              }

              try {
                setDeleting(true);

                // Firestore에서 사용자 삭제
                const userRef = doc(db, 'users', user.uid);
                await deleteDoc(userRef);

                alert('탈퇴가 완료되었습니다.');
                // 로그아웃 후 홈으로 이동
                const { signOut } = await import('@/lib/firebase/auth');
                await signOut();
                router.push('/');
              } catch (error: any) {
                console.error('탈퇴 오류:', error);
                alert('탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.');
              } finally {
                setDeleting(false);
                setShowDeleteModal(false);
              }
            }}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                처리 중...
              </>
            ) : (
              '탈퇴하기'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

