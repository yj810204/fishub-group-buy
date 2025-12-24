'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { useAuth } from '../auth/AuthContext';

export const BottomNavigation: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  const navItems = [
    {
      href: '/',
      icon: 'bi-house',
      label: '홈',
    },
    {
      href: '/products',
      icon: 'bi-grid',
      label: '상품목록',
    },
    {
      href: user ? '/my' : '/signup',
      icon: user ? 'bi-person-circle' : 'bi-person-plus',
      label: user ? '마이페이지' : '회원가입',
    },
  ];

  return (
    <nav
      className="fixed-bottom bg-white border-top"
      style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Container
        style={{
          height: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="text-decoration-none d-flex flex-column align-items-center justify-content-center"
              style={{
                flex: 1,
                height: '100%',
                color: active ? '#0d6efd' : '#6c757d',
                transition: 'color 0.2s ease-in-out',
                paddingTop: '8px',
                paddingBottom: '8px',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = '#0d6efd';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = '#6c757d';
                }
              }}
            >
              <i
                className={`bi ${item.icon}`}
                style={{
                  fontSize: '24px',
                  marginBottom: '4px',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: active ? '600' : '400',
                }}
              >
                {item.label}
              </span>
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '40px',
                    height: '3px',
                    backgroundColor: '#0d6efd',
                    borderRadius: '0 0 3px 3px',
                  }}
                />
              )}
            </Link>
          );
        })}
      </Container>
    </nav>
  );
};

