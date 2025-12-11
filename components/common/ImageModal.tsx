'use client';

import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface ImageModalProps {
  show: boolean;
  onHide: () => void;
  imageUrl: string;
  imageIndex: number;
  totalImages: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  show,
  onHide,
  imageUrl,
  imageIndex,
  totalImages,
  onPrevious,
  onNext,
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          이미지 {imageIndex + 1} / {totalImages}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center p-0">
        <img
          src={imageUrl}
          alt={`이미지 ${imageIndex + 1}`}
          className="img-fluid"
          style={{ maxHeight: '70vh', width: 'auto' }}
        />
      </Modal.Body>
      {totalImages > 1 && (
        <Modal.Footer className="justify-content-between">
          <Button
            variant="outline-secondary"
            onClick={onPrevious}
            disabled={imageIndex === 0}
          >
            <i className="bi bi-chevron-left me-1"></i>
            이전
          </Button>
          <Button variant="secondary" onClick={onHide}>
            닫기
          </Button>
          <Button
            variant="outline-secondary"
            onClick={onNext}
            disabled={imageIndex === totalImages - 1}
          >
            다음
            <i className="bi bi-chevron-right ms-1"></i>
          </Button>
        </Modal.Footer>
      )}
      {totalImages === 1 && (
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            닫기
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

