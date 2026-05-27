import { Footer } from '@/app/components/Footer';
import { A8ProductAd } from '@/app/components/A8ProductAd';
import { FloatingAdBanner } from '@/app/components/FloatingAdBanner';
import { PromoBar } from '@/app/components/PromoBar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PromoBar />
      {children}
      <A8ProductAd />
      <FloatingAdBanner />
      <Footer />
    </>
  );
}
