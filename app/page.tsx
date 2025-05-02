import { Form } from "./components/Form";
import {
  SearchCheck,
  ArrowLeftRight,
  FileText,
  MessageCircleQuestion,
} from "lucide-react";
import Image from "next/image";

import logo from "@/app/icon.png";
import { AnimatedTagline } from "./components/AnimatedTagline";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <div className="max-w-5xl mx-auto px-8 py-4 text-2xl font-bold flex gap-2">
        <Image src={logo} alt="CodePilot" width={30} height={30} />
        planweave.ai
      </div>
      <header className="py-16 bg-indigo-800 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-8">
          <h1 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Georgia, Didot, Baskerville, serif' }}>
            AI Co-pilot for Building Codes
          </h1>
          <div className="text-xl mt-4">
            Navigate complex codes and get building permits faster than ever before.
          </div>
        </div>
      </header>
      
      {/* Animated Tagline */}
      <AnimatedTagline />
      
      <section className="max-w-5xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-indigo-600">
                <SearchCheck size={24} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold">Never Fall for a Local Gotchya</h2>
            </div>
            <p className="text-gray-700">
              Instantly flag state and local building code amendments that frequently trip up your competitors building similar projects.
            </p>
          </div>
          <div className="p-8 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-indigo-600">
                <MessageCircleQuestion size={24} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold">AI-Powered Revision Clouds</h2>
            </div>
            <p className="text-gray-700">
              Let AI suggest comments based on code violations drawn from hundreds of thousands of real-world examples.
            </p>
          </div>
          <div className="p-8 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-indigo-600">
                <FileText size={24} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold">Learn from your Competitors' Mistakes</h2>
            </div>
            <p className="text-gray-700">
              Access the industry's largest corpus of building review comments with hundreds of thousands of real-world examples.
            </p>
          </div>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Georgia, Didot, Baskerville, serif' }}>Get Early Access</h2>
          <p className="text-lg mt-4 text-gray-700">
            Your clients will thank you.
          </p>
        </div>
        <Form />
      </section>
    </div>
  );
}
