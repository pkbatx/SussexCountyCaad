export function createPlaybackCursor() {
  return {
    event_id: null,
    call_id: null,
    position: 0,
    timestamp: null,
    updated_at: 0
  };
}

export function updatePlaybackCursor(prev, update) {
  return {
    ...prev,
    ...update,
    updated_at: Date.now()
  };
}

export function resetPlaybackCursor() {
  return createPlaybackCursor();
}
