'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { setInitialPassword, signInWithEmail } from '@/lib/firebase/auth';
import { useAuth } from '@/components/auth/AuthContext';

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
    }
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

