export default function ChessLogo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" fill="#fff" fillOpacity="0.2" stroke="#6D28D9" strokeWidth="2" />
        <path d="M14 7L16 13H12L14 7Z" fill="#6D28D9" />
        <rect x="12" y="13" width="4" height="6" rx="1" fill="#6D28D9" />
        <rect x="11" y="19" width="6" height="2" rx="1" fill="#6D28D9" />
      </svg>
      <span className="font-extrabold text-xl text-white tracking-wide">ChessImprove</span>
    </span>
  );
}
