import HudDemo from "./HudDemo";

export const metadata = {
  title: "Automated CDBG Audit",
  description:
    "Analyze HUD CDBG fund reports to identify and evaluate non-profit organizations",
};

export default function HudPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <HudDemo />
      </div>
    </main>
  );
}
