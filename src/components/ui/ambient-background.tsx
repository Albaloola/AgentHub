"use client";

export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
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
