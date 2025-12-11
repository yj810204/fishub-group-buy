import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import { SiteSettings } from '@/types';

/**
 * 사이트 설정을 Firestore에서 로드
 * @returns 사이트 설정 또는 기본값
 */
export const loadSiteSettings = async (): Promise<SiteSettings | null> => {
  if (!db) return null;

  try {
    const settingsDoc = await getDoc(doc(db, 'siteSettings', 'main'));
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return {
        id: settingsDoc.id,
        siteName: data.siteName || '공동구매 플랫폼',
        logoUrl: data.logoUrl || undefined,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy || '',
      };
    }
    
    return null;
  } catch (error) {
    console.error('사이트 설정 로드 오류:', error);
    return null;
  }
};

