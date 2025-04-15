import HudDemo from "./HudDemo";

export const metadata = {
  title: "HUD Document Audit Tool",
  description: "Analyze HUD CDBG fund reports to identify and evaluate non-profit organizations",
};

export default function HudPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">HUD Document Audit Tool</h1>
        <HudDemo />
      </div>
    </main>
  );
}
