import Demo from "./components/Demo";
import Waitlist from "./components/Waitlist";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="text-center py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <h1 className="text-6xl font-bold">Civdex.ai</h1>
        <p className="text-2xl mt-3">Uncork Your Data</p>
      </header>
      <section className="max-w-5xl mx-auto p-12 text-center">
        <h2 className="text-4xl font-semibold">The Future of Project Intelligence</h2>
        <p className="text-lg mt-6 text-gray-700">Civdex.ai seamlessly integrates with your tools, making search effortless and your workflows seamless.</p>
        <Demo />
        <Waitlist />
      </section>
      <section className="max-w-5xl mx-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-white shadow-md rounded-xl">
          <h2 className="text-2xl font-semibold">Seamless Integration</h2>
          <p className="text-gray-700">Integrates into messaging platforms, email clients, calendars, land management systems, and GIS tools.</p>
        </div>
        <div className="p-6 bg-white shadow-md rounded-xl">
          <h2 className="text-2xl font-semibold">Unified Search</h2>
          <p className="text-gray-700">Search across all your data in one place.</p>
        </div>
        <div className="p-6 bg-white shadow-md rounded-xl">
          <h2 className="text-2xl font-semibold">Manager Summaries</h2>
          <p className="text-gray-700">Get a clear picture of project statuses for better decision-making.</p>
        </div>
        <div className="p-6 bg-white shadow-md rounded-xl">
          <h2 className="text-2xl font-semibold">Planner Refreshers</h2>
          <p className="text-gray-700">Quickly recall what’s done and what’s next on your projects.</p>
        </div>
      </section>
      <section className="bg-white shadow-lg rounded-lg p-8 max-w-5xl mx-auto mt-12">
        <h2 className="text-3xl font-semibold text-center">Problems We Solve</h2>
        <p className="mt-4 text-lg text-gray-700 text-center"><strong>Ditch the Daisychain:</strong> Stop juggling disconnected software tools.</p>
        <p className="mt-2 text-lg text-gray-700 text-center"><strong>Search Smarter:</strong> You shouldn’t have to search 12 times to find what you need.</p>
      </section>
      <section className="max-w-5xl mx-auto p-8 mt-12 text-center">
        <h2 className="text-4xl font-semibold">See Civdex.ai in Action</h2>
      </section>
    </div>
  );
}
