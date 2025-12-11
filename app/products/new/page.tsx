'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Card, Alert, Badge } from 'react-bootstrap';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/components/auth/AuthContext';
import { DiscountTier, ProductInfoTemplate, ProductInfoField } from '@/types';
import { uploadImage, getProductImagePath } from '@/lib/firebase/storage';

export default function NewProductPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    startDate: '',
    endDate: '',
  });
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([
    { min: 1, max: 5, discount: 0.05 },
    { min: 6, max: 10, discount: 0.10 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<ProductInfoTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProductInfoTemplate | null>(null);
  const [productInfoData, setProductInfoData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && db) {
      loadTemplates();
    }
  }, [user, authLoading, router]);

  const loadTemplates = async () => {
    if (!db) return;

    try {
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
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);
    // 템플릿 변경 시 기존 데이터 초기화
    setProductInfoData({});
  };

  const handleProductInfoChange = (fieldLabel: string, value: string) => {
    setProductInfoData((prev) => ({
      ...prev,
      [fieldLabel]: value,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 여러 파일 처리
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const previews: string[] = [];

    // 파일 검증
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드할 수 있습니다.');
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('이미지 크기는 5MB 이하여야 합니다.');
        continue;
      }

      validFiles.push(file);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === validFiles.length) {
          setImagePreviews((prev) => [...prev, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    }

    if (validFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      const uploadPromises = validFiles.map(async (file) => {
        const imagePath = getProductImagePath(user.uid, null, file.name);
        return await uploadImage(file, imagePath);
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImageUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      setError('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setImageUrls((prev) => {
      const newUrls = [...prev];
      const [removed] = newUrls.splice(draggedIndex, 1);
      newUrls.splice(dropIndex, 0, removed);
      return newUrls;
    });

    setImagePreviews((prev) => {
      const newPreviews = [...prev];
      const [removed] = newPreviews.splice(draggedIndex, 1);
      newPreviews.splice(dropIndex, 0, removed);
      return newPreviews;
    });

    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDiscountTierChange = (
    index: number,
    field: keyof DiscountTier,
    value: string
  ) => {
    setDiscountTiers((prev) => {
      const newTiers = [...prev];
      newTiers[index] = {
        ...newTiers[index],
        [field]: field === 'discount' ? parseFloat(value) : parseInt(value, 10),
      };
      return newTiers;
    });
  };

  const addDiscountTier = () => {
    const lastTier = discountTiers[discountTiers.length - 1];
    setDiscountTiers([
      ...discountTiers,
      {
        min: lastTier ? lastTier.max + 1 : 1,
        max: lastTier ? lastTier.max + 5 : 5,
        discount: lastTier ? lastTier.discount + 0.05 : 0.15,
      },
    ]);
  };

  const removeDiscountTier = (index: number) => {
    setDiscountTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 유효성 검사
    if (!formData.name.trim()) {
      setError('제품명을 입력해주세요.');
      return;
    }

    if (!formData.description.trim()) {
      setError('제품 설명을 입력해주세요.');
      return;
    }

    const basePrice = parseFloat(formData.basePrice);
    if (isNaN(basePrice) || basePrice <= 0) {
      setError('올바른 시작가를 입력해주세요.');
      return;
    }

    if (discountTiers.length === 0) {
      setError('최소 하나의 할인 구간을 설정해주세요.');
      return;
    }

    // 날짜 유효성 검사
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        setError('종료일은 시작일보다 늦어야 합니다.');
        return;
      }
    }

    if (!db) {
      setError('Firebase가 초기화되지 않았습니다.');
      return;
    }

    setSubmitting(true);

    try {
      const productData: any = {
        name: formData.name,
        description: formData.description,
        basePrice,
        discountTiers,
        currentParticipants: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        imageUrls: imageUrls.length > 0 ? imageUrls : null,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : null, // 하위 호환성
      };

      // 날짜 추가
      if (formData.startDate) {
        productData.startDate = new Date(formData.startDate);
      }
      if (formData.endDate) {
        productData.endDate = new Date(formData.endDate);
      }

      // 상품정보 제공고시 추가
      if (selectedTemplateId && Object.keys(productInfoData).length > 0) {
        productData.productInfoTemplateId = selectedTemplateId;
        productData.productInfoData = productInfoData;
      }

      await addDoc(collection(db, 'products'), productData);

      alert('제품이 등록되었습니다!');
      router.push('/products');
    } catch (error) {
      console.error('제품 등록 오류:', error);
      setError('제품 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // 리다이렉트 중
  }

  return (
    <div>
      <h1 className="mb-4">새 제품 등록</h1>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>제품명 *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="제품명을 입력하세요"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>제품 설명 *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="제품에 대한 상세 설명을 입력하세요"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>시작가 (원) *</Form.Label>
              <Form.Control
                type="number"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleInputChange}
                required
                min="1"
                placeholder="10000"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>공동구매 기간 (선택사항)</Form.Label>
              <div className="row g-2">
                <div className="col-md-6">
                  <Form.Label className="small">시작일</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6">
                  <Form.Label className="small">종료일</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <Form.Text className="text-muted">
                기간을 설정하면 해당 기간 동안만 공동구매 참여가 가능합니다.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>제품 이미지 (선택사항, 여러 장 가능)</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                ref={fileInputRef}
                multiple
              />
              <Form.Text className="text-muted">
                이미지 파일을 선택하세요 (최대 5MB, 여러 장 선택 가능). JPG, PNG, GIF 형식을 지원합니다.
              </Form.Text>
              {uploading && (
                <div className="mt-2">
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">업로드 중...</span>
                  </div>
                  <span className="text-muted">이미지 업로드 중...</span>
                </div>
              )}
              {imagePreviews.length > 0 && (
                <div className="mt-3">
                  <div className="row g-2">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className="col-md-3 col-sm-4 col-6"
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        style={{
                          cursor: 'move',
                          opacity: draggedIndex === index ? 0.5 : 1,
                        }}
                      >
                        <div className="position-relative">
                          <img
                            src={preview}
                            alt={`미리보기 ${index + 1}`}
                            className="img-thumbnail w-100"
                            style={{
                              height: '150px',
                              objectFit: 'cover',
                              pointerEvents: 'none',
                            }}
                            draggable={false}
                          />
                          <div className="position-absolute top-0 start-0 m-1">
                            <Badge
                              bg="primary"
                              style={{
                                fontSize: '0.7rem',
                                cursor: 'grab',
                              }}
                            >
                              <i className="bi bi-grip-vertical me-1"></i>
                              {index + 1}
                            </Badge>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            className="position-absolute top-0 end-0 m-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            style={{ zIndex: 10 }}
                            title="삭제"
                          >
                            <i className="bi bi-x"></i>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Form.Text className="text-muted small mt-2">
                    <i className="bi bi-info-circle me-1"></i>
                    이미지를 드래그하여 순서를 변경할 수 있습니다.
                  </Form.Text>
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>상품정보 제공고시 템플릿 (선택사항)</Form.Label>
              <Form.Select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">템플릿 선택 안 함</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                템플릿을 선택하면 상품정보 제공고시 항목을 입력할 수 있습니다.
              </Form.Text>

              {selectedTemplate && (
                <div className="mt-3 border p-3 rounded">
                  <h6 className="mb-3">상품정보 제공고시</h6>
                  {selectedTemplate.fields
                    .sort((a, b) => a.order - b.order)
                    .map((field, index) => (
                      <Form.Group key={index} className="mb-3">
                        <Form.Label>{field.label}</Form.Label>
                        {field.type === 'textarea' ? (
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={productInfoData[field.label] || ''}
                            onChange={(e) =>
                              handleProductInfoChange(field.label, e.target.value)
                            }
                            placeholder={`${field.label}을(를) 입력하세요`}
                          />
                        ) : field.type === 'number' ? (
                          <Form.Control
                            type="number"
                            value={productInfoData[field.label] || ''}
                            onChange={(e) =>
                              handleProductInfoChange(field.label, e.target.value)
                            }
                            placeholder={`${field.label}을(를) 입력하세요`}
                          />
                        ) : field.type === 'date' ? (
                          <Form.Control
                            type="date"
                            value={productInfoData[field.label] || ''}
                            onChange={(e) =>
                              handleProductInfoChange(field.label, e.target.value)
                            }
                          />
                        ) : (
                          <Form.Control
                            type="text"
                            value={productInfoData[field.label] || ''}
                            onChange={(e) =>
                              handleProductInfoChange(field.label, e.target.value)
                            }
                            placeholder={`${field.label}을(를) 입력하세요`}
                          />
                        )}
                      </Form.Group>
                    ))}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Form.Label className="mb-0">할인 구간 *</Form.Label>
                <Button
                  type="button"
                  variant="outline-primary"
                  size="sm"
                  onClick={addDiscountTier}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  구간 추가
                </Button>
              </div>

              {discountTiers.map((tier, index) => (
                <div key={index} className="border p-3 mb-2 rounded">
                  <div className="row g-3">
                    <div className="col-md-3">
                      <Form.Label>최소 인원</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={tier.min}
                        onChange={(e) =>
                          handleDiscountTierChange(index, 'min', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <Form.Label>최대 인원</Form.Label>
                      <Form.Control
                        type="number"
                        min={tier.min}
                        value={tier.max}
                        onChange={(e) =>
                          handleDiscountTierChange(index, 'max', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <Form.Label>할인율 (0.05 = 5%)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={tier.discount}
                        onChange={(e) =>
                          handleDiscountTierChange(
                            index,
                            'discount',
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                      {discountTiers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline-danger"
                          onClick={() => removeDiscountTier(index)}
                          className="w-100"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-muted small">
                    예: {tier.min}명~{tier.max}명 참여 시{' '}
                    {(tier.discount * 100).toFixed(0)}% 할인
                  </div>
                </div>
              ))}
            </Form.Group>

            <div className="d-grid gap-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    등록 중...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    제품 등록
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => router.back()}
              >
                취소
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

