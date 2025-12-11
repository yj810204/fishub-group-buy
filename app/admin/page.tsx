'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, User, Order } from '@/types';
import { getProductStatus } from '@/lib/product';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
  });
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user)) {
        router.push('/');
        return;
      }
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  const loadDashboardData = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 통계 데이터 로드
      const [usersSnapshot, productsSnapshot, ordersSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
      ]);

      const users: User[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          provider: data.provider,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      const products: Product[] = [];
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          discountTiers: data.discountTiers,
          currentParticipants: data.currentParticipants || 0,
          currentQuantity: data.currentQuantity || 0,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : undefined),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          productInfoTemplateId: data.productInfoTemplateId,
          productInfoData: data.productInfoData,
        });
      });

      const orders: Order[] = [];
      ordersSnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          productId: data.productId,
          userId: data.userId,
          participantCount: data.participantCount || 0,
          quantity: data.quantity || 1,
          finalPrice: data.finalPrice,
          totalPrice: data.totalPrice || (data.finalPrice * (data.quantity || 1)),
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      // 통계 계산
      setStats({
        totalUsers: users.length,
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.status === 'active').length,
        totalOrders: orders.length,
      });

      // 최근 데이터 정렬
      const sortedProducts = [...products]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
      const sortedUsers = [...users]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
      const sortedOrders = [...orders]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

      setRecentProducts(sortedProducts);
      setRecentUsers(sortedUsers);
      setRecentOrders(sortedOrders);
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductStatusChange = async (productId: string, newStatus: 'active' | 'completed' | 'cancelled') => {
    if (!db) return;

    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { status: newStatus });
      alert('상태가 변경되었습니다.');
      loadDashboardData();
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!db) return;
    if (!confirm('정말 이 제품을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'products', productId));
      alert('제품이 삭제되었습니다.');
      loadDashboardData();
    } catch (error) {
      console.error('제품 삭제 오류:', error);
      alert('제품 삭제에 실패했습니다.');
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

  if (!user || !isAdmin(user.email)) {
    return (
      <Container>
        <Alert variant="danger">
          <Alert.Heading>접근 권한이 없습니다</Alert.Heading>
          <p>관리자만 접근할 수 있는 페이지입니다.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i className="bi bi-speedometer2 me-2"></i>
          대시보드
        </h1>
        <div>
          <Link href="/admin/settings" className="me-2">
            <Button variant="outline-secondary">
              <i className="bi bi-gear me-2"></i>
              사이트 설정
            </Button>
          </Link>
          <Link href="/admin/users" className="me-2">
            <Button variant="outline-info">
              <i className="bi bi-people me-2"></i>
              회원 관리
            </Button>
          </Link>
          <Link href="/admin/templates" className="me-2">
            <Button variant="outline-primary">
              <i className="bi bi-file-earmark-text me-2"></i>
              템플릿 관리
            </Button>
          </Link>
          <Link href="/admin/products" className="me-2">
            <Button variant="outline-success">
              <i className="bi bi-box-seam me-2"></i>
              상품 관리
            </Button>
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{stats.totalUsers}</h3>
              <p className="text-muted mb-0">전체 회원</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{stats.totalProducts}</h3>
              <p className="text-muted mb-0">전체 제품</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{stats.activeProducts}</h3>
              <p className="text-muted mb-0">진행 중인 제품</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{stats.totalOrders}</h3>
              <p className="text-muted mb-0">전체 주문</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* 최근 제품 */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">최근 제품</h5>
            </Card.Header>
            <Card.Body>
              {recentProducts.length === 0 ? (
                <p className="text-muted">제품이 없습니다.</p>
              ) : (
                <Table responsive size="sm">
                  <thead>
                    <tr>
                      <th>제품명</th>
                      <th>상태</th>
                      <th>참여</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <Link href={`/products/${product.id}`} className="text-decoration-none">
                            {product.name}
                          </Link>
                        </td>
                        <td>
                          {(() => {
                            const periodStatus = getProductStatus(product);
                            // 구매기간 이전이나 이후일 때는 제품 상태 배지 표시 안 함 (진행중 배지 제외)
                            if (periodStatus === 'active' && product.status === 'active') {
                              return <Badge bg="success">진행 중</Badge>;
                            }
                            if (product.status === 'completed') {
                              return <Badge bg="secondary">완료</Badge>;
                            }
                            if (product.status === 'cancelled') {
                              return <Badge bg="danger">취소</Badge>;
                            }
                            return null;
                          })()}
                          {(() => {
                            const periodStatus = getProductStatus(product);
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
                                return <Badge bg="info" className="ms-2">{periodText}</Badge>;
                              case 'active':
                                return <Badge bg="success" className="ms-2">{periodText}</Badge>;
                              case 'ended':
                                return <Badge bg="secondary" className="ms-2">{periodText}</Badge>;
                              default:
                                return null;
                            }
                          })()}
                        </td>
                        <td>
                          {product.currentQuantity || 0}개
                          {product.currentParticipants > 0 && (
                            <span className="ms-1 text-muted small">
                              ({product.currentParticipants}명)
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Link href={`/products/${product.id}/edit`}>
                              <Button variant="outline-primary" size="sm">
                                수정
                              </Button>
                            </Link>
                            {product.status === 'active' && (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleProductStatusChange(product.id, 'completed')
                                }
                              >
                                완료
                              </Button>
                            )}
                            {product.status === 'completed' && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() =>
                                  handleProductStatusChange(product.id, 'active')
                                }
                              >
                                재개
                              </Button>
                            )}
                            {product.status === 'cancelled' && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() =>
                                  handleProductStatusChange(product.id, 'active')
                                }
                              >
                                재개
                              </Button>
                            )}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* 최근 회원 */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">최근 회원</h5>
            </Card.Header>
            <Card.Body>
              {recentUsers.length === 0 ? (
                <p className="text-muted">회원이 없습니다.</p>
              ) : (
                <Table responsive size="sm">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>이메일</th>
                      <th>가입일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.uid}>
                        <td>{user.displayName}</td>
                        <td>{user.email}</td>
                        <td>
                          {user.createdAt.toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 최근 주문 */}
      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">최근 주문</h5>
            </Card.Header>
            <Card.Body>
              {recentOrders.length === 0 ? (
                <p className="text-muted">주문이 없습니다.</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>주문 ID</th>
                      <th>제품</th>
                      <th>참여 수량</th>
                      <th>단가</th>
                      <th>총 가격</th>
                      <th>상태</th>
                      <th>주문 일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id.substring(0, 8)}...</td>
                        <td>
                          <Link
                            href={`/products/${order.productId}`}
                            className="text-decoration-none"
                          >
                            제품 보기
                          </Link>
                        </td>
                        <td>{order.quantity}개</td>
                        <td>{order.finalPrice.toLocaleString()}원</td>
                        <td>{order.totalPrice.toLocaleString()}원</td>
                        <td>
                          {order.status === 'pending' && (
                            <Badge bg="warning">대기 중</Badge>
                          )}
                          {order.status === 'confirmed' && (
                            <Badge bg="success">확정</Badge>
                          )}
                          {order.status === 'cancelled' && (
                            <Badge bg="danger">취소됨</Badge>
                          )}
                        </td>
                        <td>
                          {order.createdAt.toLocaleDateString('ko-KR')}{' '}
                          {order.createdAt.toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

