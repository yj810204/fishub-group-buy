import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Vercel 배포 권장 (Next.js 최적화 및 CORS 문제 해결)
  images: {
    unoptimized: true, // 이미지 최적화 비활성화 (선택사항)
  },
};

export default nextConfig;
