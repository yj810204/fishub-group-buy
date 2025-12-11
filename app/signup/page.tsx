'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/components/auth/AuthContext';
import { loadSiteSettings } from '@/lib/siteSettings';
import { SiteSettings } from '@/types';

export default function SignupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
    loadSiteSettings().then(setSiteSettings);
  }, [user, authLoading, router]);

  const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!db) return false;

    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(usersQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('이메일 중복 확인 오류:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.displayName.trim() || !formData.password) {
      setError('필수 항목을 모두 입력해주세요.');
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

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    if (!auth || !db) {
      setError('Firebase가 초기화되지 않았습니다.');
      return;
    }

    try {
      setLoading(true);

      // 이메일 중복 확인
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setError('이미 등록된 이메일입니다.');
        setLoading(false);
        return;
      }

      // Firebase Auth에 계정 생성
      const credential = await createUserWithEmailAndPassword(
        auth,
        formData.email.toLowerCase().trim(),
        formData.password
      );

      // Firestore에 사용자 정보 저장 (UID를 문서 ID로 사용)
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email: formData.email.toLowerCase().trim(),
        displayName: formData.displayName.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        provider: 'email',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 성공 메시지 표시 후 홈으로 이동
      alert('회원가입이 완료되었습니다.');
      router.push('/');
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('이미 등록된 이메일입니다.');
      } else if (error.code === 'auth/weak-password') {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
      } else if (error.code === 'auth/invalid-email') {
        setError('올바른 이메일 형식이 아닙니다.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('이메일/비밀번호 인증이 활성화되지 않았습니다. 관리자에게 문의하세요.');
      } else {
        setError(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
      }
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

  if (user) {
    return null; // 이미 로그인된 경우 리다이렉트
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Card style={{ width: '100%', maxWidth: '500px' }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <h2 className="mb-3">회원가입</h2>
            <p className="text-muted">
              {siteSettings?.siteName || '공동구매 플랫폼'}에 가입하세요
            </p>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>
                <strong>이메일</strong> <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@email.com"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <strong>이름</strong> <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="홍길동"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <strong>비밀번호</strong> <span className="text-danger">*</span>
              </Form.Label>
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
              <Form.Text className="text-muted">비밀번호는 최소 6자 이상이어야 합니다.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <strong>비밀번호 확인</strong> <span className="text-danger">*</span>
              </Form.Label>
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

            <Form.Group className="mb-4">
              <Form.Label>
                <strong>전화번호</strong>
              </Form.Label>
              <Form.Control
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="010-1234-5678"
              />
              <Form.Text className="text-muted">선택 입력 항목입니다.</Form.Text>
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              size="lg"
              className="w-100 mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  가입 중...
                </>
              ) : (
                <>
                  <i className="bi bi-person-plus me-2"></i>
                  회원가입
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-muted small mb-0">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-decoration-none">
                  로그인
                </Link>
              </p>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

