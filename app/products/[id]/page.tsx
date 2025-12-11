'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product } from '@/types';
import { ProductDetail } from '@/components/products/ProductDetail';
import { Spinner, Alert, Button } from 'react-bootstrap';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      loadProduct(params.id);
    }
  }, [params.id]);

  const loadProduct = async (productId: string) => {
    if (!db) {
      setError('Firebase가 초기화되지 않았습니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const productDoc = await getDoc(doc(db, 'products', productId));

      if (!productDoc.exists()) {
        setError('제품을 찾을 수 없습니다.');
        return;
      }

      const data = productDoc.data();
      setProduct({
        id: productDoc.id,
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

  if (error || !product) {
    return (
      <Alert variant="danger">
        <Alert.Heading>오류</Alert.Heading>
        <p>{error || '제품을 찾을 수 없습니다.'}</p>
        <Button onClick={() => router.push('/products')}>
          제품 목록으로 돌아가기
        </Button>
      </Alert>
    );
  }

  return <ProductDetail product={product} />;
}

