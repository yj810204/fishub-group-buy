'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar as BootstrapNavbar, Nav, Container } from 'react-bootstrap';
import { LoginButton } from '../auth/LoginButton';
import { useAuth } from '../auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import { loadSiteSettings } from '@/lib/siteSettings';
import { SiteSettings } from '@/types';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const adminEmail = user?.email;
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    loadSiteSettings().then(setSiteSettings);
  }, []);

  const siteName = siteSettings?.siteName || '공동구매 플랫폼';
  const logoUrl = siteSettings?.logoUrl;

  return (
    <BootstrapNavbar bg="light" expand="lg" className="shadow-sm">
      <Container>
        <BootstrapNavbar.Brand as={Link} href="/" className="d-flex align-items-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteName}
              style={{
                height: '40px',
                maxWidth: '200px',
                objectFit: 'contain',
                marginRight: '8px',
              }}
            />
          ) : (
            <i className="bi bi-cart-check me-2"></i>
          )}
          {siteName}
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} href="/">
              <i className="bi bi-house me-1"></i>
              홈
            </Nav.Link>
            <Nav.Link as={Link} href="/products">
              <i className="bi bi-grid me-1"></i>
              상품 목록
            </Nav.Link>
          </Nav>
          <Nav>
            {!user && (
              <Nav.Link as={Link} href="/signup">
                <i className="bi bi-person-plus me-1"></i>
                회원가입
              </Nav.Link>
            )}
            {user && (
              <Nav.Link as={Link} href="/my">
                <i className="bi bi-person-circle me-1"></i>
                마이페이지
              </Nav.Link>
            )}
            {user && isAdmin(user) && (
              <Nav.Link as={Link} href="/admin">
                <i className="bi bi-speedometer2 me-1"></i>
                대시보드
              </Nav.Link>
            )}
            <LoginButton />
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

