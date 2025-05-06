import { Form } from "./components/Form";
import {
  SearchCheck,
  FileText,
  MessageCircleQuestion,
  MapPin,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Building2,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RequestJurisdictionButton } from "./components/RequestJurisdictionButton";

import logo from "@/app/icon.png";

// Add keyframes and animations to global CSS file (app/globals.css)
import "./jurisdictions.css";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
      {/* Floating navbar with subtle shadow */}
      <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Image src={logo} alt="Planweave" width={30} height={30} className="animate-pulse" />
            <span>planweave.ai</span>
          </div>
        </div>
      </div>
      
      {/* Hero section with dramatic spacing */}
      <header className="pt-40 pb-32 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-8">
          <h1 
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight text-white"
            style={{ fontFamily: 'Lora, serif' }}
          >
            AI Co-pilot for <br/>
            <span 
              className="text-transparent bg-clip-text" 
              style={{ 
                backgroundImage: 'linear-gradient(to right, #FFDAB9, #FF9A76)',
                WebkitBackgroundClip: 'text'
              }}
            >Code Compliance</span>
          </h1>
          <div 
            className="text-xl md:text-2xl max-w-2xl font-light mb-12 text-white"
            style={{ fontFamily: 'Lora, serif' }}
          >
            Navigate complex codes and get building permits 
            <span 
              className="font-medium text-transparent bg-clip-text" 
              style={{ 
                backgroundImage: 'linear-gradient(to right, #FFDAB9, #FF9A76)',
                WebkitBackgroundClip: 'text'
              }}
            > faster than ever before.</span>
          </div>
          
          <div className="flex gap-4 mt-8">
            <Link 
              href="#demo" 
              className="bg-white text-indigo-800 px-8 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:translate-y-[-2px] flex items-center gap-2"
            >
              Try the Demo <ArrowRight size={16} />
            </Link>
            <Link 
              href="#signup" 
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all"
            >
              Get Early Access
            </Link>
          </div>
        </div>
      </header>
      
      {/* Architectural Canvas Section - Reimagined Middle Section */}
      <section className="py-32 relative">
        {/* Abstract architectural background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 top-1/4 w-64 h-64 bg-indigo-50 rounded-full opacity-60"></div>
          <div className="absolute left-1/3 top-3/4 w-80 h-80 bg-indigo-50 rounded-full opacity-40"></div>
          <div className="absolute right-1/4 bottom-0 w-96 h-96 bg-indigo-50 rounded-full opacity-30"></div>
          <div className="absolute top-20 left-20 w-1 h-40 bg-indigo-200"></div>
          <div className="absolute top-40 left-20 w-40 h-1 bg-indigo-200"></div>
          <div className="absolute bottom-40 right-20 w-1 h-40 bg-indigo-200"></div>
          <div className="absolute bottom-40 right-20 w-40 h-1 bg-indigo-200"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            {/* Left: Value Propositions */}
            <div className="md:w-1/2">
              <h2 className="text-3xl font-semibold mb-12" style={{ fontFamily: 'Baskerville, serif' }}>
                Designed for <span className="text-indigo-600">Visionaries</span> and <span className="text-indigo-600">Pragmatists</span> alike.
              </h2>
              
              <div className="space-y-10">
                <div className="group relative pl-20 transform transition-transform duration-500 hover:translate-x-2">
                  <div className="absolute left-0 top-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-white rounded-lg shadow-md group-hover:shadow-lg transition-all">
                    <SearchCheck size={26} className="text-indigo-600" strokeWidth={1.5} />
                  </div>
                  <div className="border-l border-indigo-100 pl-8 py-2">
                    <h3 className="text-xl font-semibold mb-2">Never Fall for a Local Gotchya</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Instantly flag state and local building code amendments that frequently trip up your competitors building similar projects.
                    </p>
                  </div>
                </div>
                
                <div className="group relative pl-20 transform transition-transform duration-500 hover:translate-x-2">
                  <div className="absolute left-0 top-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-white rounded-lg shadow-md group-hover:shadow-lg transition-all">
                    <MessageCircleQuestion size={26} className="text-indigo-600" strokeWidth={1.5} />
                  </div>
                  <div className="border-l border-indigo-100 pl-8 py-2">
                    <h3 className="text-xl font-semibold mb-2">AI-Powered Revision Clouds</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Let AI suggest comments based on code violations drawn from hundreds of thousands of real-world examples.
                    </p>
                  </div>
                </div>
                
                <div className="group relative pl-20 transform transition-transform duration-500 hover:translate-x-2">
                  <div className="absolute left-0 top-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-white rounded-lg shadow-md group-hover:shadow-lg transition-all">
                    <FileText size={26} className="text-indigo-600" strokeWidth={1.5} />
                  </div>
                  <div className="border-l border-indigo-100 pl-8 py-2">
                    <h3 className="text-xl font-semibold mb-2">Learn from your Competitors' Mistakes</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Access the industry's largest corpus of building review comments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Outcomes Showcase */}
            <div className="md:w-1/2 relative">
              <div className="absolute -top-10 -left-10 w-full h-full border-2 border-indigo-100 rounded-lg -z-10"></div>
              <div className="bg-white rounded-lg overflow-hidden shadow-xl p-8 relative">
                <h3 className="text-2xl font-serif mb-6 text-indigo-800 flex items-center gap-2">
                  <span className="relative inline-block h-12 w-1">
                    <span className="absolute bottom-0 left-0 w-1 h-8 bg-gradient-to-t from-indigo-500 to-indigo-300"></span>
                  </span>
                  More time for design
                </h3>
                
                <div className="space-y-5">
                  {[
                    "Fewer rounds of reviews",
                    "Fewer revisions",
                    "Faster approvals",
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="mt-1 bg-indigo-100 p-1 rounded-full">
                        <Check size={16} className="text-indigo-600" />
                      </div>
                      <div className="text-gray-700">{benefit}</div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-12 relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-white"></div>
                  <div className="pt-6 pl-4">
                    <Link href="#signup" className="group">
                      <h4 className="text-lg font-medium text-indigo-700 mb-2 hover:text-indigo-600 transition-colors">Join our early access program</h4>
                    </Link>
                    <p className="text-gray-600">
                      Be among the first architects to experience the future of quality assurance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured demo with dramatic visual treatment */}
      <section id="demo" className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 text-white">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-2/5">
              <div className="inline-flex items-center text-xs font-semibold bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full mb-6">
                <Building2 size={14} className="mr-1" />
                <span>FEATURED DEMO</span>
              </div>
              
              <h2 className="text-4xl font-bold mb-6" style={{ fontFamily: 'Baskerville, serif' }}>
                AI Plan Check
              </h2>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Our AI analyzes your permit set and identifies potential building code issues before submission, saving weeks of review time.
              </p>
              
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-3">
                  <div className="text-indigo-300 mt-1">
                    <ChevronRight size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-white">Instant Analysis</div>
                    <div className="text-gray-400">AI identifies code issues within seconds</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-indigo-300 mt-1">
                    <ChevronRight size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-white">Visual Annotations</div>
                    <div className="text-gray-400">Flags problem areas directly on plans</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-indigo-300 mt-1">
                    <ChevronRight size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-white">Verifiable</div>
                    <div className="text-gray-400">Clear explanations with code references</div>
                  </div>
                </div>
              </div>
              
              <Link href="/plan-check" className="group inline-flex items-center gap-2 bg-white text-indigo-800 font-semibold px-8 py-4 rounded-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl">
                Try Plan Check Demo
                <ExternalLink size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            <div className="md:w-3/5 relative">
              <div className="absolute inset-0 -left-6 -top-6 border-2 border-indigo-500/30 rounded-xl"></div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <div className="aspect-video relative">
                  <Image 
                    src="https://dbnbeqjmkqdrmhxqoybt.supabase.co/storage/v1/object/public/uploaded-plans/denver_townhome/webp-small/8.webp" 
                    alt="Plan Check Demo" 
                    fill
                    style={{ objectFit: 'cover' }}
                    className="brightness-90 contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Early access section with improved visual focus */}
      <section id="signup" className="max-w-5xl mx-auto px-8 py-24">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-50 -skew-x-12 transform translate-x-10 z-0"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-6 text-center max-w-xl mx-auto" style={{ fontFamily: 'Baskerville, serif' }}>
              Get <span className="text-indigo-600">Early Access</span> to Planweave
            </h2>
            
            <p className="text-xl text-gray-700 mb-12 text-center max-w-2xl mx-auto">
              Your clients will thank you.
            </p>
            
            <div className="max-w-lg mx-auto">
              <Form />
            </div>
          </div>
        </div>
      </section>
      
      {/* Jurisdictions with improved visual treatment */}
      <section id="codes" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-8">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="h-px bg-gray-300 w-16"></div>
            <div className="text-2xl font-semibold text-indigo-800" style={{ fontFamily: 'Baskerville, serif' }}>
              Navigate Local Codes
            </div>
            <div className="h-px bg-gray-300 w-16"></div>
          </div>
          
          <p className="text-center text-lg text-gray-700 mb-14 max-w-2xl mx-auto">
            Try our AI-powered search over planning codes for these jurisdictions, with more being added every week.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                <div className="bg-white border border-gray-200 rounded-lg p-6 h-full flex items-center gap-3 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg hover:translate-y-[-3px]">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <MapPin size={18} strokeWidth={1.5} />
                  </div>
                  <span className="font-medium">{jurisdiction.name}</span>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-white py-2 px-4 rounded-full border border-gray-200 shadow-sm">
              Need a specific jurisdiction? 
              <RequestJurisdictionButton />
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer with architectural grid layout */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-8">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Image src={logo} alt="Planweave" width={30} height={30} className="brightness-200" />
              <span>planweave.ai</span>
            </div>
            <div className="text-sm text-gray-400">
              Building the future of permitting.
            </div>
          </div>
          
          <div className="h-px bg-gray-800 w-full mb-8"></div>
          
          <div className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Planweave AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
