'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Table, Badge, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/types';
import { isUserBlocked, getBlockStatus } from '@/lib/user';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user.email)) {
        router.push('/');
        return;
      }
      loadUsers();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const loadUsers = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(usersQuery);

      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          provider: data.provider,
          createdAt: data.createdAt?.toDate() || new Date(),
          status: data.status || 'active',
          phoneNumber: data.phoneNumber,
          blockedUntil: data.blockedUntil?.toDate(),
          blockedReason: data.blockedReason,
          blockedBy: data.blockedBy,
          updatedAt: data.updatedAt?.toDate(),
        });
      });

      setUsers(usersList);
    } catch (error) {
      console.error('회원 목록 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // 검색 필터
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.displayName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }

    // 상태 필터
    if (statusFilter === 'active') {
      filtered = filtered.filter((u) => !isUserBlocked(u));
    } else if (statusFilter === 'blocked') {
      filtered = filtered.filter((u) => isUserBlocked(u));
    }

    setFilteredUsers(filtered);
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
          <i className="bi bi-people me-2"></i>
          회원 관리
        </h1>
        <Link href="/admin/users/new">
          <Button variant="primary">
            <i className="bi bi-person-plus me-2"></i>
            회원 추가
          </Button>
        </Link>
      </div>

      <Card>
        <Card.Body>
          <div className="mb-3 d-flex gap-2">
            <InputGroup style={{ maxWidth: '400px' }}>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="이름 또는 이메일 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Form.Select
              style={{ maxWidth: '200px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked')}
            >
              <option value="all">전체</option>
              <option value="active">정상</option>
              <option value="blocked">차단</option>
            </Form.Select>
          </div>

          <Table responsive striped hover>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>전화번호</th>
                <th>상태</th>
                <th>가입일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    {searchTerm || statusFilter !== 'all'
                      ? '검색 결과가 없습니다.'
                      : '등록된 회원이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.displayName}</td>
                    <td>{user.email}</td>
                    <td>{user.phoneNumber || '-'}</td>
                    <td>
                      {isUserBlocked(user) ? (
                        <Badge bg="danger">{getBlockStatus(user)}</Badge>
                      ) : (
                        <Badge bg="success">정상</Badge>
                      )}
                    </td>
                    <td>
                      {user.createdAt.toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </td>
                    <td>
                      <Link href={`/admin/users/${user.uid}`}>
                        <Button variant="outline-primary" size="sm">
                          <i className="bi bi-eye me-1"></i>
                          상세보기
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

