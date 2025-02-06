// components/Form.tsx
"use client";

import { useState } from "react";

export const Form = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="flex justify-center">
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <input
          type="email"
          placeholder="Email"
          className="px-4 py-2 border border-gray-300 rounded-lg w-full mb-8"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {submitted && (
          <p className="mb-4 bg-green-200 text-green-800 p-2 rounded">
            Thanks, we got your email! We will reach out shortly.
          </p>
        )}
        {error && (
          <p className="mb-4 bg-red-200 text-red-800 p-2 rounded">{error}</p>
        )}
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

