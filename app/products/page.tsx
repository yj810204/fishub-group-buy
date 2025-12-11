'use client';

import React, { useEffect, useState } from 'react';
import { Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product } from '@/types';
import { ProductCard } from '@/components/products/ProductCard';
import { useAuth } from '@/components/auth/AuthContext';
import Link from 'next/link';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    if (!db) {
      setError('Firebase가 초기화되지 않았습니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Firestore 인덱스 오류 방지: 먼저 status로 필터링한 후 클라이언트에서 정렬
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'active')
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

      // 클라이언트에서 날짜순 정렬
      productsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setProducts(productsData);
    } catch (error) {
      console.error('제품 로드 오류:', error);
      setError('제품을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>오류</Alert.Heading>
        <p>{error}</p>
        <Button onClick={loadProducts}>다시 시도</Button>
      </Alert>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>제품 목록</h1>
        {user && (
          <Link href="/products/new">
            <Button variant="primary">
              <i className="bi bi-plus-circle me-2"></i>
              제품 등록
            </Button>
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading>제품이 없습니다</Alert.Heading>
          <p>현재 진행 중인 공동구매 제품이 없습니다.</p>
          {user && (
            <Link href="/products/new">
              <Button variant="primary">
                첫 번째 제품 등록하기
              </Button>
            </Link>
          )}
        </Alert>
      ) : (
        <Row>
          {products.map((product) => (
            <Col key={product.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
              <ProductCard product={product} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

