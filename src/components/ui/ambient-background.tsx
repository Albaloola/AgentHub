"use client";

export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed z-[-1] overflow-hidden"
      style={{ top: "-30vh", left: "-30vw", right: "-30vw", bottom: "-30vh" }}
      aria-hidden="true"
    >
      <div className="ambient-blob ambient-blob--1" />
      <div className="ambient-blob ambient-blob--2" />
      <div className="ambient-blob ambient-blob--3" />
      <div className="ambient-blob ambient-blob--4" />
      <div className="ambient-noise" style={{ inset: "0" }} />
    </div>
  );
}
