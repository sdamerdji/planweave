"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

const demoResponses = [
  { icon: "/outlook-icon.png", text: "Recent Emails" },
  { icon: "/calendar-icon.jpg", text: "Upcoming Calendar Invites" },
  { icon: "/application-icon.png", text: "Planning Application" },
  { icon: "/gis-icon.jpg", text: "GIS Data" },
];

export default function Demo() {
  const [currentResponse, setCurrentResponse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentResponse((prev) => (prev + 1) % demoResponses.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="mt-4 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-xl">
      <p className="text-xl font-semibold">What's the latest with the project at 3420 Market?</p>
      <div className="mt-4 flex items-center justify-center space-x-4">
        <Image src={demoResponses[currentResponse].icon} alt="Icon" width={40} height={40} />
        <p className="text-lg font-medium">{demoResponses[currentResponse].text}</p>
      </div>
    </div>
  );
}
