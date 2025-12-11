'use client';

import React from 'react';
import { Button } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { isAdmin } from '@/lib/admin';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="jumbotron bg-light p-5 rounded mb-5">
        <h1 className="display-4">공동구매 플랫폼에 오신 것을 환영합니다!</h1>
        <p className="lead">
          더 많은 사람이 함께 구매할수록 더 저렴한 가격으로 제품을 구매할 수
          있습니다.
        </p>
        <hr className="my-4" />
        <p>
          구간별 할인 정책으로 인원이 많아질수록 더 큰 할인을 받을 수 있습니다.
        </p>
        {!user ? (
          <p className="lead">
            <Link href="/login">
              <Button variant="primary" size="lg">
                <i className="bi bi-box-arrow-in-right me-2"></i>
                로그인하고 시작하기
              </Button>
            </Link>
          </p>
        ) : (
          <div className="lead d-flex gap-2 flex-wrap justify-content-center">
            <Link href="/products">
              <Button variant="primary" size="lg">
                <i className="bi bi-grid me-2"></i>
                상품 둘러보기
              </Button>
            </Link>
            <Link href="/my">
              <Button variant="outline-primary" size="lg">
                <i className="bi bi-person-circle me-2"></i>
                마이페이지
              </Button>
            </Link>
            {isAdmin(user) && (
              <Link href="/admin">
                <Button variant="success" size="lg">
                  <i className="bi bi-speedometer2 me-2"></i>
                  관리자 대시보드
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-people-fill text-primary me-2"></i>
                함께 구매하기
              </h5>
              <p className="card-text">
                여러 사람이 함께 구매하면 더 저렴한 가격으로 제품을 구매할 수
                있습니다.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-percent text-success me-2"></i>
                구간별 할인
              </h5>
              <p className="card-text">
                참여 인원에 따라 자동으로 할인율이 적용되어 최적의 가격을
                제공합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-lightning-charge text-warning me-2"></i>
                실시간 업데이트
              </h5>
              <p className="card-text">
                참여 인원이 실시간으로 업데이트되어 현재 할인율을 바로 확인할
                수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
