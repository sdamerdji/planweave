import { Form } from "./components/Form";
import {
  SearchCheck,
  ArrowLeftRight,
  FileText,
  MessageCircleQuestion,
} from "lucide-react";
import Image from "next/image";

import logo from "@/app/icon.png";
import { NewDemo } from "./components/NewDemo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-8 py-4 text-2xl font-bold flex gap-2">
        <Image src={logo} alt="TurboADU" width={30} height={30} />
        planweave.ai
      </div>
      <header className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-8">
          <h1 className="text-5xl font-bold">
            AI-powered search for city planners
          </h1>
          <div className="text-xl mt-4">
            All of your department's data, at your fingertips.
          </div>
        </div>
      </header>
      <NewDemo />
      <section className="max-w-5xl mx-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-white shadow-md rounded-xl flex gap-2">
          <div className="mt-1">
            <SearchCheck />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Unified Search</h2>
            <p className="text-gray-700">
              Search across all your data in one place. Integrates with your
              land management system, Slack, email, and more.
            </p>
          </div>
        </div>
        <div className="p-6 bg-white shadow-md rounded-xl flex gap-2">
          <div className="mt-1">
            <ArrowLeftRight />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Transfer Projects</h2>
            <p className="text-gray-700">
              Minimize disruption when applications get reassigned. AI-powered
              search will get the new planner up to speed, fast.
            </p>
          </div>
        </div>
        <div className="p-6 bg-white shadow-md rounded-xl flex gap-2">
          <div className="mt-1">
            <FileText />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Manager Summaries</h2>
            <p className="text-gray-700">
              Get a clear picture of project statuses for better
              decision-making.
            </p>
          </div>
        </div>
        <div className="p-6 bg-white shadow-md rounded-xl flex gap-2">
          <div className="mt-1">
            <MessageCircleQuestion />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Refreshers</h2>
            <p className="text-gray-700">
              No need to reread technical memos before every public meeting.
              Search the key questions and have answers in seconds instead of
              hours.
            </p>
          </div>
        </div>
      </section>
      <section className="max-w-5xl mx-auto p-12 text-center">
        <h2 className="text-4xl font-semibold">Sign Up for Updates</h2>
        <p className="text-lg mt-6 text-gray-700">
          Enter your email below to stay updated.
        </p>
        <Form />
      </section>
    </div>
  );
}
