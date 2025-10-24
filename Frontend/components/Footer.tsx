export default function Footer() {
  return (
    <footer className="mt-8 px-14 py-6 bg-black border-t border-gray-700">
      <div className="container mx-auto text-center text-sm text-gray-300">
        © {new Date().getFullYear()}{" "}
        <span className="text-yellow-400 font-semibold">IntentPay</span> — 
        Powering cross-chain payrolls with yield automation.
      </div>
    </footer>
  );
}
