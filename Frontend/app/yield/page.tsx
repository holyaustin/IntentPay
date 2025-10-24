// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-8 md:px-20 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-green-700 mb-8">
          About <span className="text-yellow-400">IntentPay</span>
        </h1>
        <p className="text-lg mb-6 leading-relaxed text-gray-800">
          <strong>IntentPay</strong> is a revolutionary cross-chain payroll and yield automation platform built for the future of decentralized work and digital treasury management.
        </p>

        <h2 className="text-3xl font-semibold text-green-700 mb-4">
          🚀 What IntentPay Solves
        </h2>
        <ul className="list-disc pl-6 space-y-3 text-gray-700">
          <li>
            <strong>Cross-chain payroll friction:</strong> DAOs, startups, and remote teams struggle to pay contributors across multiple blockchains — IntentPay automates this.
          </li>
          <li>
            <strong>Idle treasury capital:</strong> Most organizations hold stablecoins that sit unused; IntentPay automatically allocates them into high-yield vaults.
          </li>
          <li>
            <strong>Manual gas and scheduling:</strong> Our AI agents handle payment scheduling, gas optimization, and fund routing for you.
          </li>
          <li>
            <strong>Lack of transparency:</strong> Through real-time dashboards powered by Envio HyperSync, every transaction and yield movement is visible.
          </li>
        </ul>

        <h2 className="text-3xl font-semibold text-green-700 mt-10 mb-4">
          💡 Who It’s For
        </h2>
        <ul className="list-disc pl-6 space-y-3 text-gray-700">
          <li>
            <strong>DAOs & Web3 Projects:</strong> Automate multi-chain contributor payments in any token.
          </li>
          <li>
            <strong>Remote Teams:</strong> Seamlessly manage salaries and bonuses in stablecoins or crypto assets.
          </li>
          <li>
            <strong>Freelancers & Gig Platforms:</strong> Enable global payouts without banking intermediaries.
          </li>
          <li>
            <strong>DeFi Treasury Managers:</strong> Optimize yield while keeping liquidity ready for payroll cycles.
          </li>
        </ul>

        <h2 className="text-3xl font-semibold text-green-700 mt-10 mb-4">
          🌍 Why Adoption Matters
        </h2>
        <ul className="list-disc pl-6 space-y-3 text-gray-700">
          <li>
            <strong>Efficiency:</strong> Save time, gas, and money with automated, AI-driven financial workflows.
          </li>
          <li>
            <strong>Trustless Automation:</strong> Powered by smart contracts — no middlemen, no errors.
          </li>
          <li>
            <strong>Yield Optimization:</strong> Turn your idle stablecoins into earning assets automatically.
          </li>
          <li>
            <strong>Cross-Chain Reach:</strong> Pay and earn across Base, Optimism, Arbitrum, and Hedera seamlessly.
          </li>
        </ul>

        <div className="mt-12 bg-green-700 text-white p-8 rounded-2xl shadow-md">
          <h3 className="text-2xl font-bold mb-3 text-yellow-300">
            💫 Ready to Experience Smart Payroll?
          </h3>
          <p className="text-lg mb-4">
            Join the next wave of financial automation — pay teams globally, earn yield locally.
          </p>
          <a
            href="/"
            className="bg-yellow-300 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition-colors inline-block"
          >
            Get Started with IntentPay
          </a>
        </div>
      </div>
    </div>
  );
}
