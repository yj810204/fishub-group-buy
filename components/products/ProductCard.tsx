'use client';

import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import Link from 'next/link';
import { Product } from '@/types';
import { calculateFinalPrice, formatDiscountRate, calculateDiscountRate } from '@/lib/discount';
import { getProductStatus } from '@/lib/product';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const discountRate = calculateDiscountRate(
    product.currentParticipants,
    product.discountTiers
  );
  const finalPrice = calculateFinalPrice(
    product.basePrice,
    product.currentParticipants,
    product.discountTiers
  );

  const getStatusBadge = () => {
    const periodStatus = getProductStatus(product);
    
    // 기간 상태가 active일 때는 제품 상태 배지 표시 안 함 (중복 방지)
    if (periodStatus === 'active') {
      return null;
    }
    
    // 구매기간 이전이나 이후일 때는 제품 상태 배지만 표시
    switch (product.status) {
      case 'active':
        return <Badge bg="success">진행 중</Badge>;
      case 'completed':
        return <Badge bg="secondary">완료</Badge>;
      case 'cancelled':
        return <Badge bg="danger">취소됨</Badge>;
      default:
        return null;
    }
  };

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
        return <Badge bg="info">{periodText}</Badge>;
      case 'active':
        return <Badge bg="success">{periodText}</Badge>;
      case 'ended':
        return <Badge bg="secondary">{periodText}</Badge>;
      default:
        return null;
    }
  };

  const getPeriodText = () => {
    const hasPeriod = product.startDate || product.endDate;
    if (!hasPeriod) return null;

    const startDate = product.startDate ? formatDateTime(product.startDate) : '';
    const endDate = product.endDate ? formatDateTime(product.endDate) : '';
    
    if (startDate && endDate) {
      return `${startDate} ~ ${endDate}`;
    } else if (startDate) {
      return `${startDate}부터`;
    } else if (endDate) {
      return `~ ${endDate}`;
    }
    return null;
  };

  const displayImage = product.imageUrls?.[0] || product.imageUrl;

  return (
    <Card className="h-100 shadow-sm">
      {displayImage && (
        <Card.Img
          variant="top"
          src={displayImage}
          alt={product.name}
          style={{ height: '200px', objectFit: 'cover' }}
        />
      )}
      <Card.Body className="d-flex flex-column">
        <div className="mb-2">
          {(() => {
            const statusBadge = getStatusBadge();
            const periodBadge = getPeriodBadge();
            return (
              <>
                {statusBadge}
                {periodBadge && (
                  <span className={statusBadge ? 'ms-2' : ''}>
                    {periodBadge}
                  </span>
                )}
              </>
            );
          })()}
        </div>
        <Card.Title>{product.name}</Card.Title>
        <Card.Text 
          className="text-muted small flex-grow-1"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.4',
            minHeight: '2.8em'
          }}
        >
          {product.description}
        </Card.Text>
        <div className="mt-auto">
          <div className="mb-2">
            <span className="text-decoration-line-through text-muted me-2">
              {product.basePrice.toLocaleString()}원
            </span>
            {discountRate > 0 && (
              <Badge bg="danger" className="me-2">
                {formatDiscountRate(discountRate)} 할인
              </Badge>
            )}
          </div>
          <div className="h5 mb-2 text-primary">
            {finalPrice.toLocaleString()}원
          </div>
          {getPeriodText() && (
            <div className="text-muted small mb-2">
              <i className="bi bi-calendar3 me-1"></i>
              {getPeriodText()}
            </div>
          )}
          <div className="text-muted small mb-3">
            현재 참여 인원: <strong>{product.currentParticipants}명</strong>
          </div>
          <Link href={`/products/${product.id}`} className="w-100">
            <Button
              variant="primary"
              className="w-100"
              disabled={product.status !== 'active'}
            >
              {product.status === 'active' ? '자세히 보기' : '종료됨'}
            </Button>
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
};

