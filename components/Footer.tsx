export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-emerald-900 text-emerald-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm">
          Bolao Copa do Mundo 2026 &copy; {currentYear}
        </p>
      </div>
    </footer>
  );
}
