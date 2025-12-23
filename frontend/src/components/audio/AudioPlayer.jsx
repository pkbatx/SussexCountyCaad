import React, { useEffect, useMemo, useRef, useState } from "react";

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AudioPlayer({ source }) {
  const audioRef = useRef(null);
  const [metaLabel, setMetaLabel] = useState("No audio selected");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoaded = () => {
      setDuration(audio.duration || 0);
      setCurrentTime(audio.currentTime || 0);
    };
    const handleTime = () => {
      setDuration(audio.duration || 0);
      setCurrentTime(audio.currentTime || 0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!source?.src) {
      setMetaLabel("No audio available");
      audio.removeAttribute("src");
      audio.load();
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      return;
    }
    if (audio.src !== source.src) {
      audio.src = source.src;
    }
    setMetaLabel(source.label || "Playing call audio");
    audio.play().catch(() => null);
  }, [source]);

  const timeLabel = useMemo(() => {
    return `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }, [currentTime, duration]);

  return (
    <div className="audio-player">
      <div className="audio-meta">{metaLabel}</div>
      <div className="audio-controls">
        <button
          className="button small audio-control"
          type="button"
          disabled={!source?.src}
          onClick={() => {
            const audio = audioRef.current;
            if (!audio) return;
            if (audio.paused) {
              audio.play().catch(() => null);
            } else {
              audio.pause();
            }
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          className="audio-progress"
          type="range"
          min="0"
          max={String(duration || 0)}
          step="0.1"
          value={String(currentTime || 0)}
          onChange={(event) => {
            const audio = audioRef.current;
            if (!audio) return;
            const nextValue = Number(event.target.value);
            audio.currentTime = nextValue;
            setCurrentTime(nextValue);
          }}
        />
        <div className="audio-time">{timeLabel}</div>
      </div>
      <audio ref={audioRef} className="audio-element" preload="none" />
    </div>
  );
}
