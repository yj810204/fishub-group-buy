'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '@/components/auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function NewUserPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user.email)) {
        router.push('/');
        return;
      }
    }
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

    if (!db || !user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!formData.email.trim() || !formData.displayName.trim()) {
      setError('이메일과 이름은 필수 입력 항목입니다.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // 이메일 중복 확인
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setError('이미 등록된 이메일입니다.');
        setSaving(false);
        return;
      }

      // Firestore에 사용자 문서 생성
      // 문서 ID는 자동 생성되고, 이를 UID로 사용
      const userRef = await addDoc(collection(db, 'users'), {
        email: formData.email.toLowerCase().trim(),
        displayName: formData.displayName.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        provider: 'email', // 관리자가 추가한 회원은 이메일 로그인
        status: 'active',
        createdAt: new Date(),
      });

      // 성공 메시지 표시 후 목록으로 이동
      alert('회원이 추가되었습니다.');
      router.push('/admin/users');
    } catch (error) {
      console.error('회원 추가 오류:', error);
      setError('회원 추가에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </Spinner>
      </Container>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            variant="link"
            className="text-decoration-none p-0"
            onClick={() => router.push('/admin/users')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            회원 목록으로
          </Button>
          <h1 className="mt-2">회원 추가</h1>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>
                <strong>이메일</strong> <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@email.com"
                required
              />
              <Form.Text className="text-muted">
                추후 SNS 로그인 시 이 이메일로 연동됩니다.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <strong>이름</strong> <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="홍길동"
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>
                <strong>전화번호</strong>
              </Form.Label>
              <Form.Control
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="010-1234-5678"
              />
              <Form.Text className="text-muted">선택 입력 항목입니다.</Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="outline-secondary"
                onClick={() => router.push('/admin/users')}
                disabled={saving}
              >
                취소
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    저장
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

