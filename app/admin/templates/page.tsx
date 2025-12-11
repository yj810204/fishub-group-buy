'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Table, Button, Spinner, Alert, Modal, Form, Badge } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProductInfoTemplate, ProductInfoField } from '@/types';

export default function TemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ProductInfoTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProductInfoTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<ProductInfoField[]>([]);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'textarea' | 'number' | 'date'>('text');

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user)) {
        router.push('/');
        return;
      }
      loadTemplates();
    }
  }, [user, authLoading, router]);

  const loadTemplates = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const templatesQuery = query(
        collection(db, 'productInfoTemplates'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(templatesQuery);
      const templatesData: ProductInfoTemplate[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        templatesData.push({
          id: doc.id,
          name: data.name,
          fields: data.fields || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        });
      });

      setTemplates(templatesData);
    } catch (error) {
      console.error('템플릿 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setFields([]);
    setShowModal(true);
  };

  const handleEdit = (template: ProductInfoTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setFields([...template.fields].sort((a, b) => a.order - b.order));
    setShowModal(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!db || !user) return;

    // 간단한 확인을 위해 경고만 표시
    if (!confirm('이 템플릿을 삭제하시겠습니까? 이 템플릿을 사용하는 제품이 있을 수 있습니다.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'productInfoTemplates', templateId));
      alert('템플릿이 삭제되었습니다.');
      loadTemplates();
    } catch (error) {
      console.error('템플릿 삭제 오류:', error);
      alert('템플릿 삭제에 실패했습니다.');
    }
  };

  const handleAddField = () => {
    if (!fieldLabel.trim()) {
      alert('필드 라벨을 입력해주세요.');
      return;
    }

    const newField: ProductInfoField = {
      label: fieldLabel,
      type: fieldType,
      order: fields.length,
    };

    setFields([...fields, newField]);
    setFieldLabel('');
    setFieldType('text');
  };

  const handleEditField = (index: number) => {
    const field = fields[index];
    setEditingFieldIndex(index);
    setFieldLabel(field.label);
    setFieldType(field.type);
  };

  const handleUpdateField = () => {
    if (editingFieldIndex === null || !fieldLabel.trim()) {
      return;
    }

    const updatedFields = [...fields];
    updatedFields[editingFieldIndex] = {
      ...updatedFields[editingFieldIndex],
      label: fieldLabel,
      type: fieldType,
    };

    setFields(updatedFields);
    setEditingFieldIndex(null);
    setFieldLabel('');
    setFieldType('text');
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = fields
      .filter((_, i) => i !== index)
      .map((field, i) => ({ ...field, order: i }));
    setFields(updatedFields);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const updatedFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updatedFields[index], updatedFields[newIndex]] = [
      updatedFields[newIndex],
      updatedFields[index],
    ];

    // order 재설정
    updatedFields.forEach((field, i) => {
      field.order = i;
    });

    setFields(updatedFields);
  };

  const handleSaveTemplate = async () => {
    if (!db || !user) return;

    if (!templateName.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }

    if (fields.length === 0) {
      alert('최소 하나의 필드를 추가해주세요.');
      return;
    }

    try {
      const templateData: any = {
        name: templateName,
        fields: fields,
        createdAt: editingTemplate ? editingTemplate.createdAt : serverTimestamp(),
        createdBy: editingTemplate ? editingTemplate.createdBy : user.uid,
      };

      if (editingTemplate) {
        await updateDoc(doc(db, 'productInfoTemplates', editingTemplate.id), templateData);
        alert('템플릿이 수정되었습니다.');
      } else {
        await addDoc(collection(db, 'productInfoTemplates'), templateData);
        alert('템플릿이 생성되었습니다.');
      }

      setShowModal(false);
      loadTemplates();
    } catch (error) {
      console.error('템플릿 저장 오류:', error);
      alert('템플릿 저장에 실패했습니다.');
    }
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

  if (!user || !isAdmin(user.email)) {
    return (
      <Container>
        <Alert variant="danger">
          <Alert.Heading>접근 권한이 없습니다</Alert.Heading>
          <p>관리자만 접근할 수 있는 페이지입니다.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i className="bi bi-file-earmark-text me-2"></i>
          상품정보 제공고시 템플릿 관리
        </h1>
        <div>
          <Link href="/admin" className="me-2">
            <Button variant="outline-secondary">
              <i className="bi bi-arrow-left me-2"></i>
              대시보드로
            </Button>
          </Link>
          <Button variant="primary" onClick={handleCreateNew}>
            <i className="bi bi-plus-circle me-2"></i>
            새 템플릿 만들기
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading>템플릿이 없습니다</Alert.Heading>
          <p>새 템플릿을 만들어 상품정보 제공고시 항목을 관리하세요.</p>
        </Alert>
      ) : (
        <Row>
          {templates.map((template) => (
            <Col key={template.id} md={6} lg={4} className="mb-4">
              <Card>
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{template.name}</h5>
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEdit(template)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted small mb-2">
                    필드 수: <strong>{template.fields.length}개</strong>
                  </p>
                  <div className="small">
                    {template.fields
                      .sort((a, b) => a.order - b.order)
                      .slice(0, 5)
                      .map((field, index) => (
                        <Badge key={index} bg="secondary" className="me-1 mb-1">
                          {field.label}
                        </Badge>
                      ))}
                    {template.fields.length > 5 && (
                      <Badge bg="light" text="dark" className="me-1 mb-1">
                        +{template.fields.length - 5}
                      </Badge>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 템플릿 편집 모달 */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTemplate ? '템플릿 수정' : '새 템플릿 만들기'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>템플릿 이름</Form.Label>
            <Form.Control
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="예: 식품류, 전자제품류"
            />
          </Form.Group>

          <div className="mb-3">
            <h5>필드 관리</h5>
            <div className="d-flex gap-2 mb-2">
              <Form.Control
                type="text"
                placeholder="필드 라벨 (예: 제품명)"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                style={{ flex: 2 }}
              />
              <Form.Select
                value={fieldType}
                onChange={(e) =>
                  setFieldType(e.target.value as 'text' | 'textarea' | 'number' | 'date')
                }
                style={{ flex: 1 }}
              >
                <option value="text">텍스트</option>
                <option value="textarea">여러 줄 텍스트</option>
                <option value="number">숫자</option>
                <option value="date">날짜</option>
              </Form.Select>
              {editingFieldIndex === null ? (
                <Button variant="primary" onClick={handleAddField}>
                  추가
                </Button>
              ) : (
                <>
                  <Button variant="success" onClick={handleUpdateField}>
                    수정
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingFieldIndex(null);
                      setFieldLabel('');
                      setFieldType('text');
                    }}
                  >
                    취소
                  </Button>
                </>
              )}
            </div>

            {fields.length > 0 && (
              <Table responsive size="sm">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>순서</th>
                    <th>라벨</th>
                    <th>타입</th>
                    <th style={{ width: '200px', minWidth: '200px' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {fields
                    .sort((a, b) => a.order - b.order)
                    .map((field, index) => (
                      <tr key={index}>
                        <td>{field.order + 1}</td>
                        <td>{field.label}</td>
                        <td>
                          <Badge bg="info">
                            {field.type === 'text'
                              ? '텍스트'
                              : field.type === 'textarea'
                              ? '여러 줄'
                              : field.type === 'number'
                              ? '숫자'
                              : '날짜'}
                          </Badge>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm" style={{ whiteSpace: 'nowrap' }}>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleMoveField(index, 'up')}
                              disabled={index === 0}
                            >
                              <i className="bi bi-arrow-up"></i>
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleMoveField(index, 'down')}
                              disabled={index === fields.length - 1}
                            >
                              <i className="bi bi-arrow-down"></i>
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditField(index)}
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              수정
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleRemoveField(index)}
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSaveTemplate}>
            저장
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

