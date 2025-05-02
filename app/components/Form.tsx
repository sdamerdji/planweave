// components/Form.tsx
"use client";

import { useState } from "react";

export const Form = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async () => {
    // Reset previous states
    setError("");
    
    // Validate email
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setEmail("");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-grow px-4 py-3 border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-l-lg text-base"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || submitted}
        />
        <button
          className={`px-6 py-3 font-medium rounded-r-lg transition-colors ${
            loading 
              ? "bg-indigo-400 cursor-not-allowed" 
              : "bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800"
          } text-white`}
          onClick={handleSubmit}
          disabled={loading || submitted}
        >
          {loading ? "Submitting..." : submitted ? "Submitted" : "Submit"}
        </button>
      </div>
      
      {submitted && (
        <p className="mt-4 bg-green-100 text-green-800 p-3 rounded-lg text-left">
          Thanks, we got your email! We will reach out shortly.
        </p>
      )}
      
      {error && (
        <p className="mt-4 bg-red-100 text-red-700 p-3 rounded-lg text-left">{error}</p>
      )}
    </div>
  );
};

