import "./App.css";
import { useEffect, useState } from "react";
import { StoryPlayer } from "./components/StoryPlayer";
import { fetchWrapped } from "./data/fetchWrapped";
import { wrapped, type StaffWrapped } from "./data/wrapped";

function LoadingSplash() {
  return (
    <div className="player">
      <div className="player__viewport splash">
        <div className="player__brand">PHOREST WRAPPED</div>
        <div className="splash__pulse" />
        <p className="splash__text">Loading your month…</p>
      </div>
    </div>
  );
}

export function App() {
  const [data, setData] = useState<StaffWrapped | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWrapped()
      .then(({ data, live }) => {
        if (cancelled) return;
        console.info(
          `[wrapped] data source: ${
            live ? "live · MONTH_TO_DATE" : "fallback (not configured)"
          }`
        );
        setData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[wrapped] live fetch failed — using fallback:", err);
        setData(wrapped);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <LoadingSplash />;
  return <StoryPlayer data={data} />;
}
