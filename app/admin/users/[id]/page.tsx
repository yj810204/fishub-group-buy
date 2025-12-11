'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Spinner, Badge, Table, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import { doc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/config';
import { User, Order } from '@/types';
import { isUserBlocked, getBlockStatus } from '@/lib/user';

export default function UserDetailPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
  });

  const [blockData, setBlockData] = useState({
    blockType: 'permanent' as 'temporary' | 'permanent',
    blockedUntil: '',
    blockedReason: '',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || !isAdmin(currentUser.email)) {
        router.push('/');
        return;
      }
      loadUserData();
    }
  }, [userId, currentUser, authLoading, router]);

  const loadUserData = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        setError('회원을 찾을 수 없습니다.');
        return;
      }

      const data = userDoc.data();
      const userData: User = {
        uid: userDoc.id,
        email: data.email,
        displayName: data.displayName,
        provider: data.provider,
        createdAt: data.createdAt?.toDate() || new Date(),
        status: data.status || 'active',
        phoneNumber: data.phoneNumber,
        blockedUntil: data.blockedUntil?.toDate(),
        blockedReason: data.blockedReason,
        blockedBy: data.blockedBy,
        updatedAt: data.updatedAt?.toDate(),
      };

      setUser(userData);
      setFormData({
        displayName: userData.displayName,
        phoneNumber: userData.phoneNumber || '',
      });

      // 주문 내역 로드 (인덱스 오류 방지를 위해 클라이언트 사이드 정렬)
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersList: Order[] = [];
      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        ordersList.push({
          id: doc.id,
          productId: orderData.productId,
          userId: orderData.userId,
          participantCount: orderData.participantCount,
          finalPrice: orderData.finalPrice,
          status: orderData.status,
          createdAt: orderData.createdAt?.toDate() || new Date(),
        });
      });
      // 클라이언트 사이드에서 정렬 후 최근 10개만
      ordersList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setOrders(ordersList.slice(0, 10));
    } catch (error) {
      console.error('회원 정보 로드 오류:', error);
      setError('회원 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!db || !currentUser || !user) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        updatedAt: new Date(),
      });

      setSuccess(true);
      setShowEditModal(false);
      loadUserData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('회원 정보 수정 오류:', error);
      setError('회원 정보 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!db || !currentUser || !user) {
      return;
    }

    if (blockData.blockType === 'temporary' && !blockData.blockedUntil) {
      setError('차단 종료일을 선택해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updateData: any = {
        status: 'blocked',
        blockedReason: blockData.blockedReason.trim() || null,
        blockedBy: currentUser.uid,
        updatedAt: new Date(),
      };

      if (blockData.blockType === 'temporary') {
        updateData.blockedUntil = new Date(blockData.blockedUntil);
      } else {
        updateData.blockedUntil = null;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);

      setSuccess(true);
      setShowBlockModal(false);
      setBlockData({
        blockType: 'permanent',
        blockedUntil: '',
        blockedReason: '',
      });
      loadUserData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('회원 차단 오류:', error);
      setError('회원 차단에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async () => {
    if (!db || !currentUser || !user) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await updateDoc(doc(db, 'users', user.uid), {
        status: 'active',
        blockedUntil: null,
        blockedReason: null,
        blockedBy: null,
        updatedAt: new Date(),
      });

      setSuccess(true);
      loadUserData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('차단 해제 오류:', error);
      setError('차단 해제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!db || !currentUser || !user || !app) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Cloud Function을 통해 Firebase Authentication과 Firestore에서 모두 삭제
      try {
        const functions = getFunctions(app, 'us-central1'); // 리전 명시
        const deleteUserFunction = httpsCallable(functions, 'deleteUser', {
          timeout: 60000, // 60초 타임아웃
        });
        const result = await deleteUserFunction({ uid: user.uid });
        console.log('회원 삭제 성공:', result.data);
      } catch (functionError: any) {
        // Cloud Function이 배포되지 않았거나 실패한 경우, Firestore만 삭제
        console.warn('Cloud Function 호출 실패, Firestore만 삭제:', functionError);
        
        // CORS 오류나 네트워크 오류인 경우 Firestore만 삭제
        const isCorsError = functionError.message?.includes('CORS') || 
                           functionError.code === 'functions/unavailable' ||
                           functionError.code === 'functions/not-found' ||
                           functionError.message?.includes('Failed to fetch') ||
                           functionError.message?.includes('ERR_FAILED');
        
        if (isCorsError) {
          // CORS 오류인 경우 Firestore만 삭제
          await deleteDoc(doc(db, 'users', user.uid));
          setError('CORS 오류로 인해 Firestore에서만 삭제되었습니다. Firebase Authentication에서도 삭제하려면 프로덕션 환경에서 시도하거나, Firebase Console에서 직접 삭제해주세요.');
        } else {
          // 다른 오류는 다시 throw
          throw functionError;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/users');
      }, 1000);
    } catch (error: any) {
      console.error('회원 삭제 오류:', error);
      if (error.message) {
        setError(error.message);
      } else {
        setError('회원 삭제에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </Spinner>
      </Container>
    );
  }

  if (!currentUser || !isAdmin(currentUser.email) || !user) {
    return null;
  }

  const isBlocked = isUserBlocked(user);
  const isUserAdmin = isAdmin(user.email);

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/admin/users" className="text-decoration-none">
            <i className="bi bi-arrow-left me-2"></i>
            회원 목록으로
          </Link>
          <h1 className="mt-2">회원 상세 정보</h1>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
          변경사항이 저장되었습니다.
        </Alert>
      )}

      <div className="row">
        <div className="col-md-8">
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">기본 정보</h5>
            </Card.Header>
            <Card.Body>
              <Table borderless>
                <tbody>
                  <tr>
                    <th style={{ width: '150px' }}>이름</th>
                    <td>{user.displayName}</td>
                  </tr>
                  <tr>
                    <th>이메일</th>
                    <td>{user.email}</td>
                  </tr>
                  <tr>
                    <th>전화번호</th>
                    <td>{user.phoneNumber || '-'}</td>
                  </tr>
                  <tr>
                    <th>상태</th>
                    <td>
                      {isBlocked ? (
                        <Badge bg="danger">{getBlockStatus(user)}</Badge>
                      ) : (
                        <Badge bg="success">정상</Badge>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>로그인 제공자</th>
                    <td>
                      {user.provider === 'google' ? (
                        <Badge bg="primary">Google</Badge>
                      ) : user.provider === 'email' ? (
                        <Badge bg="info">이메일</Badge>
                      ) : (
                        <Badge bg="warning">Kakao</Badge>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>가입일</th>
                    <td>
                      {user.createdAt.toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                  {isBlocked && user.blockedReason && (
                    <tr>
                      <th>차단 사유</th>
                      <td>{user.blockedReason}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <div className="d-flex gap-2 flex-wrap">
                <Button
                  variant="outline-primary"
                  onClick={() => setShowEditModal(true)}
                >
                  <i className="bi bi-pencil me-2"></i>
                  수정
                </Button>
                {!isUserAdmin && (
                  <>
                    {isBlocked ? (
                      <Button variant="success" onClick={handleUnblock} disabled={saving}>
                        <i className="bi bi-check-circle me-2"></i>
                        차단 해제
                      </Button>
                    ) : (
                      <Button variant="danger" onClick={() => setShowBlockModal(true)}>
                        <i className="bi bi-ban me-2"></i>
                        차단
                      </Button>
                    )}
                    <Button variant="outline-danger" onClick={() => setShowDeleteModal(true)} disabled={saving}>
                      <i className="bi bi-trash me-2"></i>
                      삭제
                    </Button>
                  </>
                )}
                {isUserAdmin && (
                  <Alert variant="info" className="mb-0">
                    <i className="bi bi-shield-check me-2"></i>
                    관리자는 차단할 수 없습니다.
                  </Alert>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">주문 내역 (최근 10개)</h5>
            </Card.Header>
            <Card.Body>
              {orders.length === 0 ? (
                <p className="text-muted">주문 내역이 없습니다.</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>주문 ID</th>
                      <th>상태</th>
                      <th>참여 인원</th>
                      <th>최종 가격</th>
                      <th>주문일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/products/${order.productId}`}>
                            {order.id.substring(0, 8)}...
                          </Link>
                        </td>
                        <td>
                          {order.status === 'pending' && (
                            <Badge bg="warning">대기</Badge>
                          )}
                          {order.status === 'confirmed' && (
                            <Badge bg="success">확정</Badge>
                          )}
                          {order.status === 'cancelled' && (
                            <Badge bg="danger">취소</Badge>
                          )}
                        </td>
                        <td>{order.participantCount}명</td>
                        <td>{order.finalPrice.toLocaleString()}원</td>
                        <td>
                          {order.createdAt.toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* 수정 모달 */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>회원 정보 수정</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>이름</Form.Label>
              <Form.Control
                type="text"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>전화번호</Form.Label>
              <Form.Control
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="010-1234-5678"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={handleEdit} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 차단 모달 */}
      <Modal show={showBlockModal} onHide={() => setShowBlockModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>회원 차단</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>차단 유형</Form.Label>
              <Form.Select
                value={blockData.blockType}
                onChange={(e) =>
                  setBlockData({
                    ...blockData,
                    blockType: e.target.value as 'temporary' | 'permanent',
                  })
                }
              >
                <option value="temporary">기간 차단</option>
                <option value="permanent">영구 차단</option>
              </Form.Select>
            </Form.Group>
            {blockData.blockType === 'temporary' && (
              <Form.Group className="mb-3">
                <Form.Label>차단 종료일</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={blockData.blockedUntil}
                  onChange={(e) =>
                    setBlockData({ ...blockData, blockedUntil: e.target.value })
                  }
                  required={blockData.blockType === 'temporary'}
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>차단 사유</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={blockData.blockedReason}
                onChange={(e) =>
                  setBlockData({ ...blockData, blockedReason: e.target.value })
                }
                placeholder="차단 사유를 입력하세요 (선택사항)"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBlockModal(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={handleBlock} disabled={saving}>
            {saving ? '처리 중...' : '차단'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>회원 삭제</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>정말로 이 회원을 삭제하시겠습니까?</p>
          <p className="text-danger small">
            <strong>경고:</strong> 이 작업은 되돌릴 수 없습니다. 회원의 모든 데이터가 삭제됩니다.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>
            {saving ? '삭제 중...' : '삭제'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

