"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";

const demoResponses = [
  { 
    icon: "/outlook-icon.png", 
    title: "Emails", 
    details: "Multiple emails received, including one from Councilmember Shadlee; Subject Line: 'More units needed'." 
  },
  { 
    icon: "/calendar-icon.jpg", 
    title: "Calendar", 
    details: "Upcoming CEQA hearing scheduled regarding the project's planning application." 
  },
  { 
    icon: "/application-icon.png", 
    title: "Planning Application", 
    details: "Application details for a 34-unit multifamily apartment project under review." 
  },
  { 
    icon: "/gis-icon.jpg", 
    title: "GIS Data", 
    details: "Mapping data indicates the project site lies within a high-risk liquefaction zone." 
  },
];

export default function Demo() {
  const fullQuery = "What's the latest with the project at 3420 Market?";
  const [typedQuery, setTypedQuery] = useState("");
  const [typingComplete, setTypingComplete] = useState(false);
  const [visibleResults, setVisibleResults] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [startAnimation, setStartAnimation] = useState(false);

  // Start animation only when the component is in view (50% visible)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStartAnimation(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Typing effect for the search query once animation is triggered
  useEffect(() => {
    if (!startAnimation) return;
    let index = 0;
    const interval = setInterval(() => {
      setTypedQuery(fullQuery.slice(0, index + 1));
      index++;
      if (index === fullQuery.length) {
        clearInterval(interval);
        setTypingComplete(true);
      }
    }, 50); // Adjust this delay to speed up or slow down the typing
    return () => clearInterval(interval);
  }, [startAnimation, fullQuery]);

  // Reveal search results sequentially after typing is complete
  useEffect(() => {
    if (!typingComplete) return;
    demoResponses.forEach((_, idx) => {
      setTimeout(() => {
        setVisibleResults((prev) => [...prev, idx]);
      }, 500 * (idx + 1)); // each result appears 500ms apart
    });
  }, [typingComplete]);

  return (
    <div 
      ref={containerRef} 
      className="mt-4 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-xl"
    >
      {/* Simulated search bar */}
      <div className="relative">
        <input
          type="text"
          className="w-full p-3 rounded-lg text-black font-mono"
          value={typedQuery}
          readOnly
        />
        <span className="absolute right-4 top-3 text-gray-500">🔍</span>
      </div>

      {/* Sequential search results */}
      <div className="mt-6 space-y-4">
        {visibleResults.map((idx) => {
          const result = demoResponses[idx];
          return (
            <div
              key={idx}
              className="flex items-center p-4 bg-white text-black rounded-lg shadow-sm"
            >
              <Image src={result.icon} alt={`${result.title} icon`} width={40} height={40} />
              <div className="ml-4">
                <p className="font-semibold">{result.title}</p>
                <p className="text-sm">{result.details}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
