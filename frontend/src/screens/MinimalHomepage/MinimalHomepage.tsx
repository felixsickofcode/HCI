import React from 'react';
import { Header, Footer } from '../../components/layout';
import { HeroSection } from './sections/HeroSection';
import { EditorialPhilosophySection } from './sections/EditorialPhilosophySection';
import { CorePillarsSection } from './sections/CorePillarsSection';
import { CuratedReadingsSection } from './sections/CuratedReadingsSection';
import { CallToActionSection } from './sections/CallToActionSection';

export const MinimalHomepage: React.FC = () => {
  return (
    <div className="bg-paper-texture font-body text-on-surface antialiased min-h-screen flex flex-col">
      <Header />
      <main className="w-full pt-20 flex-1 flex flex-col">
        <HeroSection />
        <EditorialPhilosophySection />
        <CorePillarsSection />
        <CuratedReadingsSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
};
