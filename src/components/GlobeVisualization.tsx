// src/components/GlobeVisualization.tsx
"use client"; // Mark as a Client Component

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import dynamic from 'next/dynamic';

// Dynamically import react-globe.gl to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

const GlobeVisualization = () => {
  const globeEl = useRef<GlobeMethods>();
  const [globeReady, setGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock data for arcs (connections)
  const arcsData = useMemo(() => {
    const N = 20; // Number of arcs
    return [...Array(N).keys()].map(() => ({
      startLat: (Math.random() - 0.5) * 180,
      startLng: (Math.random() - 0.5) * 360,
      endLat: (Math.random() - 0.5) * 180,
      endLng: (Math.random() - 0.5) * 360,
      color: [['#008080', '#005f5f'], ['#367588', '#2a5a6a'], ['#87CEEB', '#6a9fb1']][Math.floor(Math.random() * 3)] // Teal/Blue shades
    }));
  }, []);

  // Mock data for points (locations)
  const pointsData = useMemo(() => {
     const N = 50; // Number of points
     return [...Array(N).keys()].map(() => ({
       lat: (Math.random() - 0.5) * 180,
       lng: (Math.random() - 0.5) * 360,
       size: Math.random() / 3 + 0.1, // Smaller points
       color: ['#008080', '#367588', '#87CEEB'][Math.floor(Math.random() * 3)] // Teal/Blue shades
     }));
   }, []);


  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set globe controls and auto-rotate
  useEffect(() => {
    if (globeReady && globeEl.current) {
      const controls = globeEl.current.controls();
      controls.enableZoom = true; // Enable zoom
      controls.enableRotate = true; // Enable manual rotation
      controls.autoRotate = true; // Enable auto-rotation
      controls.autoRotateSpeed = 0.6; // Adjust speed as needed
      controls.minDistance = 200; // Prevent zooming too close
      controls.maxDistance = 600; // Prevent zooming too far
      globeEl.current.pointOfView({ altitude: 2.5 }); // Initial camera altitude
    }
  }, [globeReady]);

  return (
     // Ensure the container has defined dimensions and relative positioning
     <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '0.75rem' }}>
       {/* Conditionally render Globe only when dimensions are set */}
       {dimensions.width > 0 && dimensions.height > 0 && (
         <Globe
           ref={globeEl}
           width={dimensions.width}
           height={dimensions.height}
           globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
           backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
           backgroundColor="rgba(0,0,0,0)" // Transparent background
           arcsData={arcsData}
           arcColor="color"
           arcDashLength={() => Math.random()}
           arcDashGap={() => Math.random()}
           arcDashAnimateTime={() => Math.random() * 4000 + 500}
           arcStroke={0.5}
           pointsData={pointsData}
           pointAltitude="size"
           pointColor="color"
           onGlobeReady={() => setGlobeReady(true)}
         />
       )}
       {!globeReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/30 text-muted-foreground">
              Loading Globe...
          </div>
        )}
     </div>
   );
};

export default GlobeVisualization;
