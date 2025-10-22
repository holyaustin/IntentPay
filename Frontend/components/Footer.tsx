// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-white border-t mt-8">
      <div className="container mx-auto px-4 py-6 text-sm text-gray-600 flex justify-between items-center">
        <div>© {new Date().getFullYear()} IntentPay</div>
        <div className="flex gap-4">
          <a href="/about" className="hover:underline">About</a>
          <a href="/connect" className="hover:underline">Connect</a>
        </div>
      </div>
    </footer>
  );
}
