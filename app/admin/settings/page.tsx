'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '@/components/auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SiteSettings } from '@/types';
import { uploadImage } from '@/lib/firebase/storage';

export default function SiteSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    siteName: '공동구매 플랫폼',
    logoUrl: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user)) {
        router.push('/');
        return;
      }
      loadSettings();
    }
  }, [user, authLoading, router]);

  const loadSettings = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'siteSettings', 'main'));
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setFormData({
          siteName: data.siteName || '공동구매 플랫폼',
          logoUrl: data.logoUrl || '',
        });
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
    } catch (error) {
      console.error('설정 로드 오류:', error);
      setError('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Firebase Storage에 업로드
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const imagePath = `site/logo/${timestamp}_${sanitizedFileName}`;
      const logoUrl = await uploadImage(file, imagePath);

      setFormData((prev) => ({ ...prev, logoUrl }));
    } catch (error) {
      console.error('로고 업로드 오류:', error);
      setError('로고 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!db || !user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!formData.siteName.trim()) {
      setError('사이트 이름을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const settingsData: any = {
        siteName: formData.siteName.trim(),
        updatedAt: new Date(),
        updatedBy: user.uid,
      };

      // logoUrl이 있을 때만 추가 (undefined 방지)
      if (formData.logoUrl && formData.logoUrl.trim()) {
        settingsData.logoUrl = formData.logoUrl.trim();
      }

      await setDoc(doc(db, 'siteSettings', 'main'), settingsData);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('설정 저장 오류:', error);
      setError('설정 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
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
        <h1>
          <i className="bi bi-gear me-2"></i>
          사이트 설정
        </h1>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
          설정이 저장되었습니다.
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label>
                <strong>사이트 이름</strong>
              </Form.Label>
              <Form.Control
                type="text"
                name="siteName"
                value={formData.siteName}
                onChange={handleInputChange}
                placeholder="공동구매 플랫폼"
                required
              />
              <Form.Text className="text-muted">
                네비게이션 바에 표시될 사이트 이름입니다.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>
                <strong>사이트 로고</strong>
              </Form.Label>
              {logoPreview && (
                <div className="mb-3">
                  <img
                    src={logoPreview}
                    alt="로고 미리보기"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '100px',
                      objectFit: 'contain',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      padding: '8px',
                    }}
                  />
                  <div className="mt-2">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={removeLogo}
                      disabled={uploading}
                    >
                      <i className="bi bi-trash me-1"></i>
                      로고 삭제
                    </Button>
                  </div>
                </div>
              )}
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={uploading}
              />
              <Form.Text className="text-muted">
                권장 크기: 200x100px 이하, 최대 5MB (PNG, JPG, GIF, WebP)
              </Form.Text>
              {uploading && (
                <div className="mt-2">
                  <Spinner size="sm" animation="border" className="me-2" />
                  <span className="text-muted">업로드 중...</span>
                </div>
              )}
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="outline-secondary"
                onClick={() => router.push('/admin')}
                disabled={saving}
              >
                취소
              </Button>
              <Button variant="primary" type="submit" disabled={saving || uploading}>
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

