import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-950">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="text-6xl font-bold tracking-tight">
            <span className="text-white">Buddy</span>
          </div>
          <p className="text-gray-400 text-xl">
            We didn't change money. We changed trust.
          </p>
        </div>

        <p className="text-gray-300 text-lg leading-relaxed">
          A financial platform for students where{" "}
          <span className="text-amber-400 font-semibold">credibility is currency</span>.
          Ask questions, share knowledge, earn trust. The AI already knows who to believe.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/login"
            className="px-8 py-3 bg-amber-400 text-gray-950 font-semibold rounded-lg hover:bg-amber-300 transition-colors"
          >
            Sign In / Join →
          </Link>
          <Link
            href="/feed"
            className="px-8 py-3 border border-gray-700 text-gray-300 font-semibold rounded-lg hover:border-gray-500 hover:text-white transition-colors"
          >
            Browse Forum
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8">
          {[
            { tier: "Newcomer", color: "#9ca3af", score: "0–99" },
            { tier: "Trusted", color: "#fbbf24", score: "600–899" },
            { tier: "Oracle", color: "#67e8f9", score: "1200+" },
          ].map((t) => (
            <div key={t.tier} className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <div
                className="text-lg font-bold capitalize"
                style={{ color: t.color }}
              >
                {t.tier}
              </div>
              <div className="text-gray-500 text-sm">{t.score} credibility</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
