'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap';
import { LoginButton } from '../auth/LoginButton';
import { useAuth } from '../auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import { loadSiteSettings } from '@/lib/siteSettings';
import { SiteSettings } from '@/types';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const isHomePage = pathname === '/';

  useEffect(() => {
    loadSiteSettings().then(setSiteSettings);
  }, []);

  const siteName = siteSettings?.siteName || '공동구매 플랫폼';
  const logoUrl = siteSettings?.logoUrl;

  return (
    <BootstrapNavbar 
      bg="light" 
      className="shadow-sm fixed-top"
      style={{ zIndex: 1001 }}
    >
      <Container>
        <div className="d-flex align-items-center">
          {!isHomePage && (
            <Button
              variant="link"
              className="p-0 me-2 text-decoration-none"
              onClick={() => router.back()}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '24px',
                lineHeight: '1',
                color: '#000',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-chevron-left"></i>
            </Button>
          )}
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
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          {user && isAdmin(user) && (
            <Nav.Link as={Link} href="/admin" className="d-none d-md-block text-decoration-none">
              <i className="bi bi-speedometer2 me-1"></i>
              대시보드
            </Nav.Link>
          )}
          <LoginButton />
        </div>
      </Container>
    </BootstrapNavbar>
  );
};

