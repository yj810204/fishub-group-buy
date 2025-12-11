'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Form, Alert, Tabs, Tab, Spinner } from 'react-bootstrap';
import { signInWithGoogle, signInWithEmail } from '@/lib/firebase/auth';
import { useAuth } from '@/components/auth/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { loadSiteSettings } from '@/lib/siteSettings';
import { SiteSettings } from '@/types';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('email');
  const [emailFormData, setEmailFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    exists: boolean;
    provider: string | null;
    needsPassword: boolean;
  } | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
    loadSiteSettings().then(setSiteSettings);
  }, [user, loading, router]);

  // 이메일 입력 시 사용자 정보 확인
  const checkUserEmail = useCallback(
    async (email: string) => {
      if (!email || !email.includes('@') || !db) {
        setUserInfo(null);
        return;
      }

      setCheckingEmail(true);
      setError(null);

      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', email.toLowerCase().trim())
        );
        const querySnapshot = await getDocs(usersQuery);

        if (querySnapshot.empty) {
          setUserInfo({ exists: false, provider: null, needsPassword: false });
          setCheckingEmail(false);
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const provider = userData.provider || null;

        // Firebase Auth에 계정이 있는지 확인 (provider가 email인 경우)
        let needsPassword = false;
        if (provider === 'email') {
          // Firestore 데이터를 먼저 확인
          const hasValidUid = userData.uid && userData.uid !== '';
          const isSameId = userDoc.id === userData.uid;
          
          // 회원가입을 완료한 회원: 문서 ID와 UID가 같고, UID가 유효함
          // 이 경우 Firebase Auth에 계정이 있으므로 비밀번호 설정 불필요
          if (hasValidUid && isSameId) {
            needsPassword = false;
          } else {
            // 문서 ID와 UID가 다른 경우 또는 UID가 없는 경우
            // Firebase Auth에서 실제로 계정이 있는지 확인
            if (auth) {
              try {
                // Firebase Auth에서 이메일로 로그인 방법 확인
                const signInMethods = await fetchSignInMethodsForEmail(auth, email.toLowerCase().trim());
                
                // password 로그인 방법이 있으면 Firebase Auth에 계정이 있음
                // password 로그인 방법이 없으면 비밀번호 설정 필요
                needsPassword = !signInMethods.includes('password');
              } catch (error) {
                // fetchSignInMethodsForEmail 실패 시 Firestore 데이터 기반으로 판단
                console.warn('로그인 방법 확인 실패, Firestore 데이터 기반 판단:', error);
                // UID가 없거나 빈 문자열이면 관리자가 추가한 회원 (Firebase Auth에 계정 없음)
                // UID가 있지만 문서 ID와 다르면 관리자가 추가한 후 비밀번호를 설정하지 않은 회원
                needsPassword = !hasValidUid || (hasValidUid && !isSameId);
              }
            } else {
              // auth가 없으면 Firestore 데이터 기반으로 판단
              needsPassword = !hasValidUid || (hasValidUid && !isSameId);
            }
          }
        }

        setUserInfo({
          exists: true,
          provider,
          needsPassword,
        });
      } catch (error) {
        console.error('이메일 확인 오류:', error);
        setUserInfo(null);
      } finally {
        setCheckingEmail(false);
      }
    },
    []
  );

  // 이메일 입력 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (emailFormData.email) {
        checkUserEmail(emailFormData.email);
      } else {
        setUserInfo(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [emailFormData.email, checkUserEmail]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // 로그인 성공 시 AuthContext의 useEffect가 자동으로 리다이렉트하므로
      // 여기서는 리다이렉트하지 않음
    } catch (error: any) {
      // 사용자가 팝업을 닫은 경우 에러 메시지 표시 안 함
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup')
      ) {
        return;
      }
      console.error('로그인 실패:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userInfo || !userInfo.exists) {
      setError('등록되지 않은 이메일입니다.');
      return;
    }

    if (userInfo.provider !== 'email') {
      setError('이 이메일은 다른 로그인 방식을 사용합니다.');
      return;
    }

    // 비밀번호가 필요한 경우 비밀번호 설정 페이지로 이동
    if (userInfo.needsPassword) {
      router.push(`/set-password?email=${encodeURIComponent(emailFormData.email)}`);
      return;
    }

    // 비밀번호가 없으면 비밀번호 설정 페이지로
    if (!emailFormData.password) {
      router.push(`/set-password?email=${encodeURIComponent(emailFormData.email)}`);
      return;
    }

    setLoadingEmail(true);

    try {
      await signInWithEmail(emailFormData.email, emailFormData.password);
      router.push('/');
    } catch (error: any) {
      // signInWithEmail에서 이미 적절한 오류 메시지로 변환했으므로
      // error.message를 우선 사용
      if (error.code === 'auth/user-not-found') {
        // Firebase Auth에 계정이 없는 경우
        // 관리자가 추가한 회원일 수 있으므로 비밀번호 설정 페이지로 이동
        router.push(`/set-password?email=${encodeURIComponent(emailFormData.email)}`);
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        // 잘못된 자격증명인 경우 (비밀번호 오류)
        // needsPassword가 true이면 비밀번호 설정 페이지로, false이면 비밀번호 오류 메시지 표시
        if (userInfo?.needsPassword) {
          router.push(`/set-password?email=${encodeURIComponent(emailFormData.email)}`);
        } else {
          // signInWithEmail에서 변환된 오류 메시지 사용
          setError(error.message || '비밀번호가 올바르지 않습니다.');
        }
      } else {
        // 예상치 못한 오류만 콘솔에 표시
        console.error('이메일 로그인 오류:', error);
        // 기타 오류는 변환된 메시지 사용
        setError(error.message || '로그인에 실패했습니다.');
      }
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleSetPassword = () => {
    if (!emailFormData.email) {
      setError('이메일을 입력해주세요.');
      return;
    }
    router.push(`/set-password?email=${encodeURIComponent(emailFormData.email)}`);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">로딩 중...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (user) {
    return null; // 이미 로그인된 경우 리다이렉트
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Card style={{ width: '100%', maxWidth: '400px' }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <h2 className="mb-3">로그인</h2>
            <p className="text-muted">
              {siteSettings?.siteName || '공동구매 플랫폼'}에 오신 것을 환영합니다
            </p>
          </div>

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'email')} className="mb-3">
            <Tab eventKey="email" title="이메일 로그인">
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="mt-3">
                  {error}
                </Alert>
              )}
              {userInfo && !userInfo.exists && emailFormData.email && (
                <Alert variant="warning" className="mt-3">
                  등록되지 않은 이메일입니다.
                </Alert>
              )}
              {userInfo && userInfo.exists && userInfo.provider !== 'email' && (
                <Alert variant="warning" className="mt-3">
                  이 이메일은 {userInfo.provider === 'google' ? 'Google' : 'Kakao'} 로그인을 사용합니다.
                </Alert>
              )}
              <Form onSubmit={handleEmailLogin} className="mt-3">
                <Form.Group className="mb-3">
                  <Form.Label>이메일</Form.Label>
                  <Form.Control
                    type="email"
                    value={emailFormData.email}
                    onChange={(e) =>
                      setEmailFormData({ ...emailFormData, email: e.target.value })
                    }
                    placeholder="example@email.com"
                    required
                  />
                  {checkingEmail && (
                    <Form.Text className="text-muted">
                      <Spinner size="sm" animation="border" className="me-2" />
                      확인 중...
                    </Form.Text>
                  )}
                </Form.Group>
                {userInfo?.needsPassword ? (
                  <Alert variant="info" className="mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    최초 로그인 시 비밀번호를 설정해주세요.
                  </Alert>
                ) : (
                  <Form.Group className="mb-3">
                    <Form.Label>비밀번호</Form.Label>
                    <Form.Control
                      type="password"
                      value={emailFormData.password}
                      onChange={(e) =>
                        setEmailFormData({ ...emailFormData, password: e.target.value })
                      }
                      placeholder="비밀번호를 입력하세요"
                      required={!userInfo?.needsPassword}
                    />
                  </Form.Group>
                )}
                {userInfo?.needsPassword ? (
                  <Button
                    variant="primary"
                    type="button"
                    size="lg"
                    className="w-100"
                    onClick={handleSetPassword}
                  >
                    <i className="bi bi-key me-2"></i>
                    비밀번호 설정하기
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    className="w-100"
                    disabled={loadingEmail || checkingEmail || !userInfo?.exists}
                  >
                    {loadingEmail ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        로그인 중...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope me-2"></i>
                        이메일로 로그인
                      </>
                    )}
                  </Button>
                )}
              </Form>
            </Tab>
            <Tab eventKey="google" title="SNS 로그인">
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-100"
                  onClick={handleGoogleLogin}
                >
                  <i className="bi bi-google me-2"></i>
                  Google로 로그인
                </Button>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
}

