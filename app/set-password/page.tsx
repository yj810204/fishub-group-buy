'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { setInitialPassword, signInWithEmail } from '@/lib/firebase/auth';
import { useAuth } from '@/components/auth/AuthContext';
import { auth, db } from '@/lib/firebase/config';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!email) {
      router.push('/login');
      return;
    }

    // 이미 로그인되어 있고 비밀번호가 설정된 경우 홈으로 리다이렉트
    if (user && !authLoading) {
      router.push('/');
      return;
    }

    // 탈퇴한 사용자 체크 (Firebase Auth에만 있고 Firestore에 없는 경우)
    const checkDeletedUser = async () => {
      if (!auth || !db) return;

      try {
        // Firestore에서 이메일 확인
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', email.toLowerCase().trim())
        );
        const querySnapshot = await getDocs(usersQuery);
        
        // Firestore에 없으면 Firebase Auth 확인
        if (querySnapshot.empty) {
          const signInMethods = await fetchSignInMethodsForEmail(auth, email.toLowerCase().trim());
          // Firebase Auth에만 있고 Firestore에 없는 경우 (탈퇴한 사용자)
          if (signInMethods.length > 0) {
            setError('탈퇴한 이메일 주소는 재가입할 수 없습니다.');
          }
        }
      } catch (error) {
        // 오류 발생 시 무시 (일반적인 경우)
        console.warn('탈퇴한 사용자 확인 실패:', error);
      }
    };

    checkDeletedUser();
  }, [email, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.password || !formData.confirmPassword) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);

      // 비밀번호 설정
      await setInitialPassword(email, formData.password);

      // 비밀번호 설정 후 자동 로그인
      await signInWithEmail(email, formData.password);

      // 성공 메시지 표시 후 홈으로 이동
      alert('비밀번호가 설정되었습니다. 로그인되었습니다.');
      router.push('/');
    } catch (error: any) {
      console.error('비밀번호 설정 오류:', error);
      setError(error.message || '비밀번호 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </Spinner>
      </Container>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Card style={{ width: '100%', maxWidth: '400px' }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <h2 className="mb-3">비밀번호 설정</h2>
            <p className="text-muted">
              {email} 계정의 비밀번호를 설정해주세요
            </p>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>비밀번호</Form.Label>
              <Form.Control
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="최소 6자 이상"
                required
                minLength={6}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>비밀번호 확인</Form.Label>
              <Form.Control
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="비밀번호를 다시 입력하세요"
                required
                minLength={6}
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              size="lg"
              className="w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  처리 중...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  비밀번호 설정 및 로그인
                </>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </Spinner>
      </Container>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}

