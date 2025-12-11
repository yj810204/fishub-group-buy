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
import { Product } from '@/types';
import { getProductStatus } from '@/lib/product';

export default function AdminProductsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user)) {
        router.push('/');
        return;
      }
      loadProducts();
    }
  }, [user, authLoading, router]);

  const loadProducts = async () => {
    if (!db) {
      setError('Firebase가 초기화되지 않았습니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const productsQuery = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(productsQuery);
      const productsData: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          discountTiers: data.discountTiers,
          currentParticipants: data.currentParticipants || 0,
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

      setProducts(productsData);
    } catch (error) {
      console.error('제품 로드 오류:', error);
      setError('제품을 불러오는 중 오류가 발생했습니다.');
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
      loadProducts();
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
      loadProducts();
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

  if (!user || !isAdmin(user)) {
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
          <i className="bi bi-box-seam me-2"></i>
          상품 관리
        </h1>
        <div>
          <Link href="/admin">
            <Button variant="outline-secondary" className="me-2">
              <i className="bi bi-arrow-left me-2"></i>
              대시보드
            </Button>
          </Link>
          <Link href="/products/new">
            <Button variant="primary">
              <i className="bi bi-plus-circle me-2"></i>
              새 제품 등록
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0">등록된 상품 목록</h5>
        </Card.Header>
        <Card.Body>
          {products.length === 0 ? (
            <Alert variant="info">
              <Alert.Heading>상품이 없습니다</Alert.Heading>
              <p>등록된 상품이 없습니다. 새 제품을 등록해주세요.</p>
              <Link href="/products/new">
                <Button variant="primary">
                  첫 번째 제품 등록하기
                </Button>
              </Link>
            </Alert>
          ) : (
            <Table responsive>
              <thead>
                <tr>
                  <th>제품명</th>
                  <th>기본 가격</th>
                  <th>참여 인원</th>
                  <th>상태</th>
                  <th>등록일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link href={`/products/${product.id}`} className="text-decoration-none">
                        {product.name}
                      </Link>
                    </td>
                    <td>{product.basePrice.toLocaleString()}원</td>
                    <td>{product.currentParticipants}명</td>
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
                      {product.createdAt.toLocaleDateString('ko-KR')}
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Link href={`/products/${product.id}/edit`}>
                          <Button variant="outline-primary" size="sm">
                            <i className="bi bi-pencil me-1"></i>
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
                          <i className="bi bi-trash me-1"></i>
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
    </Container>
  );
}

