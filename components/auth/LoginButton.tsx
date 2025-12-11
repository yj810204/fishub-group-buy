'use client';

import React from 'react';
import { Button, Badge } from 'react-bootstrap';
import { signOut } from '@/lib/firebase/auth';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const LoginButton: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (loading) {
    return <Button disabled>로딩 중...</Button>;
  }

  if (user) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Badge bg="primary">{user.displayName}님</Badge>
        <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-1"></i>
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <Link href="/login">
      <Button variant="primary">
        <i className="bi bi-box-arrow-in-right me-2"></i>
        로그인
      </Button>
    </Link>
  );
};

