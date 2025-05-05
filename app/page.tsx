import { Form } from "./components/Form";
import {
  SearchCheck,
  FileText,
  MessageCircleQuestion,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RequestJurisdictionButton } from "./components/RequestJurisdictionButton";

import logo from "@/app/icon.png";
import { AnimatedTagline } from "./components/AnimatedTagline";

// Add keyframes and animations to global CSS file (app/globals.css)
import "./jurisdictions.css";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <div className="max-w-5xl mx-auto px-8 py-4 text-2xl font-bold flex gap-2">
        <Image src={logo} alt="CodePilot" width={30} height={30} />
        planweave.ai
      </div>
      <header className="py-16 bg-indigo-800 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-8">
          <h1 className="text-4xl md:text-5xl font-semibold" style={{ fontFamily: 'lora' }}>
            AI Co-pilot for Building Codes
          </h1>
          <div className="text-xl" style={{ fontFamily: 'lora' }}>
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
              Access the industry's largest corpus of building review comments.
            </p>
          </div>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Baskerville, serif' }}>Get Early Access</h2>
          <p className="text-lg mt-4 text-gray-700">
            Your clients will thank you.
          </p>
        </div>
        <Form />
        
        {/* Jurisdictions Row */}
        <div className="mt-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px bg-gray-200 flex-grow"></div>
            <div className="flex items-center gap-2 text-indigo-700 font-medium">
              <MapPin size={18} strokeWidth={1.5} />
              <span>Try our AI-Powered Search over Planning Codes</span>
            </div>
            <div className="h-px bg-gray-200 flex-grow"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {[
              { name: "Johnson County, KS", slug: "joco" },
              { name: "Kansas City, MO", slug: "kcmo" },
              { name: "Oak Ridge, TN", slug: "oakridge" },
              { name: "Cupertino, CA", slug: "cupertino" },
              { name: "Los Altos, CA", slug: "losaltos" },
              { name: "Lee's Summit, MO", slug: "leessummit" },
              { name: "Canyon County, ID", slug: "canyoncounty" },
              { name: "Broomfield, CO", slug: "broomfield" },
              { name: "Thornton, CO", slug: "thornton" },
            ].map((jurisdiction) => (
              <Link
                key={jurisdiction.slug}
                href={`/code/${jurisdiction.slug}`}
                className="group"
              >
                <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 flex items-center gap-3 transition-all duration-300 hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/40 hover:translate-y-[-2px]">
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MapPin size={18} strokeWidth={1.5} />
                  </span>
                  <span className="font-medium">{jurisdiction.name}</span>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <div className="text-sm text-gray-500">
              More jurisdictions being added every week. 
              <RequestJurisdictionButton />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
