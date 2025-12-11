'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '@/components/auth/AuthContext';
import { ShippingAddress } from '@/types';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Script from 'next/script';

export default function ShippingAddressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ShippingAddress>({
    recipientName: '',
    phoneNumber: '',
    postalCode: '',
    address: '',
    detailAddress: '',
    deliveryMemo: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadShippingAddress();
    }
  }, [user, authLoading, router]);

  const loadShippingAddress = async () => {
    if (!user || !db) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.shippingAddress) {
          setFormData(userData.shippingAddress);
        }
      }
    } catch (error) {
      console.error('배송지 로드 오류:', error);
      setError('배송지 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.recipientName.trim()) {
      setError('수령인 이름을 입력해주세요.');
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError('전화번호를 입력해주세요.');
      return;
    }

    if (!formData.postalCode.trim()) {
      setError('우편번호를 입력해주세요.');
      return;
    }

    if (!formData.address.trim()) {
      setError('주소를 입력해주세요.');
      return;
    }

    if (!formData.detailAddress.trim()) {
      setError('상세주소를 입력해주세요.');
      return;
    }

    if (!db || !user) {
      setError('Firebase가 초기화되지 않았습니다.');
      return;
    }

    try {
      setSaving(true);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        shippingAddress: {
          recipientName: formData.recipientName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          postalCode: formData.postalCode.trim(),
          address: formData.address.trim(),
          detailAddress: formData.detailAddress.trim(),
          deliveryMemo: formData.deliveryMemo?.trim() || null,
        },
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/my');
      }, 1500);
    } catch (error: any) {
      console.error('배송지 저장 오류:', error);
      setError('배송지 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchAddress = () => {
    // 다음 우편번호 서비스 API 사용
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setFormData({
          ...formData,
          postalCode: data.zonecode,
          address: data.address,
        });
      },
    }).open();
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

  if (!user) {
    return null; // 리다이렉트 중
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      <Container>
        <h1 className="mb-4">배송지 등록</h1>

      <Card>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              배송지가 저장되었습니다. 마이페이지로 이동합니다...
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>
                수령인 이름 <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.recipientName}
                onChange={(e) =>
                  setFormData({ ...formData, recipientName: e.target.value })
                }
                placeholder="수령인 이름을 입력하세요"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                전화번호 <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="010-1234-5678"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                우편번호 <span className="text-danger">*</span>
              </Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  placeholder="우편번호"
                  required
                  readOnly
                  className="flex-grow-1"
                />
                <Button
                  variant="primary"
                  onClick={handleSearchAddress}
                  type="button"
                  style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
                >
                  <i className="bi bi-search me-1"></i>
                  주소 검색
                </Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                기본주소 <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="기본주소"
                required
                readOnly
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                상세주소 <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.detailAddress}
                onChange={(e) =>
                  setFormData({ ...formData, detailAddress: e.target.value })
                }
                placeholder="상세주소를 입력하세요"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>배송 메모 (선택사항)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.deliveryMemo || ''}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryMemo: e.target.value })
                }
                placeholder="배송 시 요청사항을 입력하세요"
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push('/my')}
                disabled={saving}
              >
                취소
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      </Container>
    </>
  );
}

