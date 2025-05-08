// src/components/DynamicGlobeClient.tsx
"use client"; // This component MUST be a Client Component

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the GlobeVisualization component itself
const GlobeVisualization = dynamic(() => import('@/components/GlobeVisualization'), {
  ssr: false, // SSR must be false for libraries interacting with window/document
  loading: () => <div className="w-full h-full bg-secondary/20 rounded-xl flex items-center justify-center text-muted-foreground animate-pulse">Loading Globe...</div>
});

const DynamicGlobeClient: React.FC = () => {
  // This wrapper simply renders the dynamically imported component
  return <GlobeVisualization />;
};

export default DynamicGlobeClient;
