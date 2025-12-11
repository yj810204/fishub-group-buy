'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/types';
import { Modal, Button, Alert } from 'react-bootstrap';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShippingModal, setShowShippingModal] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser && db) {
        // Firestore에서 사용자 정보 가져오기
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userObj: User = {
              uid: userData.uid || firebaseUser.uid,
              email: userData.email,
              displayName: userData.displayName,
              provider: userData.provider,
              createdAt: userData.createdAt?.toDate() || new Date(),
              status: userData.status || 'active',
              phoneNumber: userData.phoneNumber,
              blockedUntil: userData.blockedUntil?.toDate(),
              blockedReason: userData.blockedReason,
              blockedBy: userData.blockedBy,
              updatedAt: userData.updatedAt?.toDate(),
              isAdmin: userData.isAdmin || false,
              shippingAddress: userData.shippingAddress,
            };
            setUser(userObj);

            // 배송지가 없으면 모달 표시 (한 번만)
            if (!userData.shippingAddress && !showShippingModal) {
              setShowShippingModal(true);
            }
          }
        } catch (error) {
          console.error('사용자 정보 가져오기 오류:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ShippingModal = () => {
    const handleRegister = () => {
      setShowShippingModal(false);
      if (typeof window !== 'undefined') {
        window.location.href = '/my/shipping';
      }
    };

    return (
      <Modal show={showShippingModal} onHide={() => setShowShippingModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>배송지 등록 필요</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>배송지 등록이 필요합니다.</strong>
            <br />
            공동구매에 참여하려면 배송지 정보를 등록해주세요.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowShippingModal(false)}>
            나중에
          </Button>
          <Button variant="primary" onClick={handleRegister}>
            배송지 등록하기
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
      <ShippingModal />
    </AuthContext.Provider>
  );
};

