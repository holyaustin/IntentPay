export default function TransactionsPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-md mt-8">
      <h1 className="text-3xl font-bold text-green-700 mb-4">
        Transaction History
      </h1>
      <p className="text-gray-700 mb-2">
        Coming soon: real-time payroll and yield transactions synced from Envio
        HyperSync.
      </p>
      <ul className="space-y-2">
        <li className="border-b border-gray-200 pb-2">
          ✅ Payment to Alice – 1000 USDC (Base)
        </li>
        <li className="border-b border-gray-200 pb-2">
          ✅ Payment to Bob – 0.5 ETH (Arbitrum)
        </li>
      </ul>
    </div>
  );
}
