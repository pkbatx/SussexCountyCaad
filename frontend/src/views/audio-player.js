export function createAudioPlayer() {
  const container = document.createElement("div");
  container.className = "audio-player";

  const meta = document.createElement("div");
  meta.className = "audio-meta";
  meta.textContent = "No audio selected";

  const audio = document.createElement("audio");
  audio.className = "audio-element";
  audio.controls = false;
  audio.preload = "none";

  const controls = document.createElement("div");
  controls.className = "audio-controls";
  const playButton = document.createElement("button");
  playButton.className = "button small audio-control";
  playButton.textContent = "Play";
  playButton.disabled = true;

  const progress = document.createElement("input");
  progress.type = "range";
  progress.min = "0";
  progress.max = "0";
  progress.step = "0.1";
  progress.value = "0";
  progress.className = "audio-progress";

  const timeLabel = document.createElement("div");
  timeLabel.className = "audio-time";
  timeLabel.textContent = "0:00 / 0:00";

  controls.appendChild(playButton);
  controls.appendChild(progress);
  controls.appendChild(timeLabel);

  container.appendChild(meta);
  container.appendChild(controls);
  container.appendChild(audio);

  const formatTime = (value) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const updateTimeLabel = () => {
    const current = formatTime(audio.currentTime);
    const total = formatTime(audio.duration || 0);
    timeLabel.textContent = `${current} / ${total}`;
  };

  const updateProgress = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    progress.max = String(audio.duration);
    progress.value = String(audio.currentTime);
  };

  playButton.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => null);
    } else {
      audio.pause();
    }
  });

  progress.addEventListener("input", () => {
    audio.currentTime = Number(progress.value);
    updateTimeLabel();
  });

  audio.addEventListener("loadedmetadata", () => {
    updateProgress();
    updateTimeLabel();
  });
  audio.addEventListener("timeupdate", () => {
    updateProgress();
    updateTimeLabel();
  });
  audio.addEventListener("play", () => {
    playButton.textContent = "Pause";
  });
  audio.addEventListener("pause", () => {
    playButton.textContent = "Play";
  });
  audio.addEventListener("ended", () => {
    playButton.textContent = "Play";
  });

  function setSource({ src, label } = {}) {
    if (!src) {
      meta.textContent = "No audio available";
      audio.removeAttribute("src");
      audio.load();
      playButton.disabled = true;
      playButton.textContent = "Play";
      progress.value = "0";
      progress.max = "0";
      updateTimeLabel();
      return;
    }
    if (audio.src !== src) {
      audio.src = src;
    }
    meta.textContent = label || "Playing call audio";
    playButton.disabled = false;
    audio.play().catch(() => null);
  }

  function clear() {
    meta.textContent = "No audio selected";
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    playButton.disabled = true;
    playButton.textContent = "Play";
    progress.value = "0";
    progress.max = "0";
    updateTimeLabel();
  }

  return {
    element: container,
    setSource,
    clear,
    audio
  };
}
