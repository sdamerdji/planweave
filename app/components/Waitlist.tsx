"use client";
import { useState } from "react";

export default function Waitlist() {
  const [email, setEmail] = useState("");

  return (
    <div className="mt-6 text-center flex flex-col items-center">
      <input 
        type="email" 
        className="p-3 border border-gray-300 rounded-md w-80 text-lg focus:ring-2 focus:ring-blue-500" 
        placeholder="Enter your email to join the waitlist" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-semibold hover:bg-blue-700 transition-all">Join Waitlist</button>
    </div>
  );
}
