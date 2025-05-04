"use client";

import { useState, useEffect } from "react";

const phrases = [
  "Fewer rounds of reviews",
  "Fewer revisions",
  "Faster approvals", 
  "More time for design"
];

export const AnimatedTagline = () => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Start fade out
      setIsVisible(false);
      
      // Change phrase and fade in after animation completes
      setTimeout(() => {
        setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
        setIsVisible(true);
      }, 600); // Transition time
      
    }, 3000); // Display time
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full py-10 bg-gray-50">
      <div className="max-w-5xl mx-auto px-8 relative">
        <div 
          className={`text-left text-3xl md:text-4xl transition-all duration-600 ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
          }`}
          style={{
            fontFamily: 'lora',
            letterSpacing: '0.01em'
          }}
        >
          <span className="text-indigo-700">
            {phrases[currentPhraseIndex]}
          </span>
          <span className="inline-block ml-1 text-gray-300 transform -translate-y-1"></span>
        </div>
      </div>
    </div>
  );
}; 