export default function ChatLoading() {
  return (
    <div className="min-h-full flex items-center justify-center bg-[#050507] starfield p-6">
      <div className="rounded-2xl border border-[#3d3a39] bg-[#101010]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(255,255,255,0.03)] px-8 py-6 flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="h-8 w-8 rounded-full border-2 border-[#3d3a39] border-t-[#f2f2f2] animate-spin" />
        <p className="text-sm text-[#f2f2f2]/50">Loading conversation...</p>
      </div>
    </div>
  );
}
