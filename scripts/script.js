const preferences = {
  speed: 1.8,
  timeSkip: 10,
};

// SERVICE WORKER
navigator.serviceWorker.register("service-worker.js");

// HTML ELEMENTS
const dragPanel = document.querySelector("#drag-panel");
const dropOverlay = document.querySelector("#drop-overlay");
const droppableElements = document.querySelectorAll(".droppable");
const message = document.querySelector("#message");
const fileName = document.querySelector("#file-name");
const video = document.querySelector("video");

const filePicker = document.querySelector("#file-picker");

const player = document.querySelector("#player");
const playBtn = document.querySelector("#play-btn");
const fullscreenBtn = document.querySelector("#fullscreen-btn");
const zoomBtn = document.querySelector("#zoom-btn");
const speedControls = document.querySelector("#speed-controls");

const progressBar = document.querySelector("#video-bar");
const timeIndicatorToggle = document.querySelector("#time-indicator-toggle");
const timeIndicator = document.querySelector("#time-indicator");
const replayBtn = document.querySelector("#replay-btn");
const forwardBtn = document.querySelector("#forward-btn");
const durationOrFinishAt = document.querySelector("#duration-or-finish-at");

// DRAG AND DROP
let localStorageKey;
const LOCAL_STORAGE_NAMESPACE = "video-player_";

for (const droppable of droppableElements) {
  droppable.addEventListener("dragenter", (e) => {
    const type = e.dataTransfer.items[0].type.split("/")[0];

    if (type === "video") {
      droppable.dataset.fileHover = true;
      dropOverlay.hidden = false;
    }
  });
}

dropOverlay.addEventListener("dragover", (e) => e.preventDefault());

dropOverlay.addEventListener("drop", async (e) => {
  e.preventDefault();

  // A video has been dropped on the home screen (not on another video)
  if (!video.src) {
    showLoadingScreen();
  }

  // Type check is done in dragenter and in the click handler
  const fileHandle = await e.dataTransfer.items[0].getAsFileSystemHandle();

  manageFileHandle(fileHandle);
  handleDragEnd();
});

dropOverlay.addEventListener("dragleave", handleDragEnd);

function handleDragEnd() {
  dropOverlay.hidden = true;
  for (const droppable of droppableElements) {
    delete droppable.dataset.fileHover;
  }
}

// FILE INPUT
filePicker?.addEventListener("click", async () => {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      excludeAcceptAllOption: true,
      types: [
        {
          description: "Videos",
          accept: {
            "video/*": [], // Chrome uses the MIME type, not the file extensions
          },
        },
      ],
      multiple: false,
    });

    showLoadingScreen();

    manageFileHandle(fileHandle);
  } catch (abortError) {
    // User cancelled the file picker, do nothing
  }
});

// FILE HANDLING
function showLoadingScreen() {
  message.textContent = "Loading…";
  filePicker?.remove();
}

async function manageFileHandle(fileHandle) {
  const file = await fileHandle.getFile();

  // Display the file name without the extension
  fileName.textContent = file.name.replace(/\.[^.]+$/, "");

  if (video.src) {
    updateLocalStorage();
    URL.revokeObjectURL(video.src);
  }

  // Don't change the order of these two lines! Otherwise, the loadedmetadata event
  // fires before a new hash is computed and if I drag 'n' drop another video, the
  // previous video's state is restored instead of the new one's
  localStorageKey = `${LOCAL_STORAGE_NAMESPACE}${await computeFileSignature(file)}`;
  video.src = URL.createObjectURL(file);

  // Update the media session on first play
  video.addEventListener(
    "seeked",
    () => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: fileName.textContent,
      });
    },
    { once: true },
  );

  // Bind the global media controls to the video
  navigator.mediaSession.setActionHandler("seekbackward", replay);
  navigator.mediaSession.setActionHandler("previoustrack", replay);
  navigator.mediaSession.setActionHandler("previousslide", replay);
  navigator.mediaSession.setActionHandler("seekforward", forward);
  navigator.mediaSession.setActionHandler("nexttrack", forward);
  navigator.mediaSession.setActionHandler("nextslide", forward);

  // If the fonts are not loaded in 100ms, show the player anyway
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  Promise.race([document.fonts.ready, wait(100)]).then(() => {
    document.startViewTransition?.(showPlayer) ?? showPlayer();
  });

  function showPlayer() {
    dragPanel.hidden = true;
    player.hidden = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.launchQueue.setConsumer((launchParams) => {
    if (launchParams.files?.length) {
      const file = launchParams.files[0];
      showLoadingScreen();
      manageFileHandle(file);
    }
  });
});

// CONTROL PLAYBACK
// Play/pause
playBtn.onclick = togglePlay;
video.onclick = togglePlay;
video.onpause = () => {
  playBtn.textContent = "play_arrow";
};
video.onplay = () => {
  playBtn.textContent = "pause";
};

// Fullscreen
fullscreenBtn.onclick = toggleFullScreen;
document.onfullscreenchange = () => {
  fullscreenBtn.textContent = document.fullscreenElement
    ? "fullscreen_exit"
    : "fullscreen";
};

video.addEventListener("dblclick", toggleFullScreen);

// Speed
video.onratechange = () => {
  speedControls.value = video.playbackRate.toFixed(2);
  updateTimeIndicator();
};

speedControls.onchange = () => {
  // Caused by keyboard shortcuts
  speedControls.value = Number.parseFloat(speedControls.value).toFixed(2);
  video.playbackRate = clamp(0.1, speedControls.value, 16);
};

// Zoom
zoomBtn.onclick = toggleZoom;

// TIME
video.addEventListener("loadedmetadata", () => {
  if (localStorage.getItem(localStorageKey)) {
    restoreFromLocalStorage();
  }

  updateProgressBarValue();
  updateProgressBarVisually();
  updateTimeIndicator();
});

video.addEventListener("timeupdate", () => {
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    return;
  }

  updateProgressBarValue();
  updateProgressBarVisually();
  updateTimeIndicator();
});

// Seek to the point clicked on the progress bar
progressBar.addEventListener("input", () => {
  video.currentTime = (progressBar.valueAsNumber * video.duration) / 100;

  // Needed to show the time in real-time when the progress bar is dragged
  updateProgressBarVisually();
  updateTimeIndicator();
});

function updateProgressBarValue() {
  progressBar.valueAsNumber = (video.currentTime * 100) / video.duration;
}

function updateProgressBarVisually() {
  progressBar.style.setProperty("--progress", `${progressBar.valueAsNumber}%`);
}

function updateTimeIndicator() {
  if (timeIndicatorToggle.dataset.state === "default") {
    timeIndicator.textContent = secondsToTime(video.currentTime);
    durationOrFinishAt.textContent = secondsToTime(video.duration);
  } else {
    timeLeft = video.duration - video.currentTime;
    timeIndicator.textContent = `${secondsToTime(timeLeft)} left`;

    currentTime = new Date().getTime();
    durationOrFinishAt.textContent = `Finish at ${millisecondsToTimeOfDay(currentTime + (timeLeft * 1000) / video.playbackRate)}`;
  }
}

// progressBar also has tabindex="-1"
progressBar.onfocus = () => {
  progressBar.blur();
};

replayBtn.onclick = replay;
forwardBtn.onclick = forward;

timeIndicatorToggle.addEventListener("click", toggleTimeIndicator);

video.addEventListener("emptied", () => {
  // Needed when another video is loaded while the current one is playing
  playBtn.textContent = "play_arrow";
});

// Save time in local storage when the window is closed/refreshed
window.onbeforeunload = () => {
  if (video.src && !video.ended) {
    updateLocalStorage();
  }
};

// CLEANUP
for (const key of Object.keys(localStorage)) {
  if (!key.startsWith(LOCAL_STORAGE_NAMESPACE)) continue;
  const entryDate = new Date(JSON.parse(localStorage.getItem(key)).lastOpened);
  if (entryDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    localStorage.removeItem(key);
  }
}

video.onended = () => {
  localStorage.removeItem(localStorageKey);
};

// KEYBOARD SHORTCUTS
document.addEventListener("keydown", (e) => {
  // Ignore key presses when a modifier key is pressed
  if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

  // Sometimes somehow when a button is pressed, an element is focused
  if (e.key !== " " && document.activeElement.tagName !== "INPUT") {
    document.activeElement.blur();
  }

  switch (e.key) {
    case " ": // Toggle play
    case "k":
      if (document.activeElement.tagName === "BUTTON") break;
      togglePlay();
      break;
    case "s": // Slow down
    case "S":
      speedControls.stepDown();
      speedControls.dispatchEvent(new Event("change"));
      break;
    case "d": // Speed up
    case "D":
      speedControls.stepUp();
      speedControls.dispatchEvent(new Event("change"));
      break;
    case "z": // Rewind
    case "Z":
    case "ArrowLeft":
    case "ArrowDown":
      if (document.activeElement.tagName !== "INPUT") replay();
      break;
    case "x": // Advance
    case "X":
    case "ArrowRight":
    case "ArrowUp":
      if (document.activeElement.tagName !== "INPUT") forward();
      break;
    case "r": // Reset speed
      video.playbackRate = video.defaultPlaybackRate;
      break;
    case "t": // Toggle time indicator
      toggleTimeIndicator();
      break;
    case "a": // Preferred fast speed
      video.playbackRate = preferences.speed;
      break;
    case "c": // Toggle zoom
      toggleZoom();
      break;
    case "p": // Toggle PiP
      togglePictureInPicture();
      break;
    case "f":
    case "Enter":
      if (
        document.activeElement.tagName !== "BUTTON" &&
        document.activeElement.tagName !== "INPUT"
      )
        toggleFullScreen();
  }
});

function togglePlay() {
  video.paused ? video.play() : video.pause();
}

function clamp(min, value, max) {
  return Math.min(Math.max(value, min), max);
}

function replay() {
  video.currentTime = Math.max(video.currentTime - preferences.timeSkip, 0);
}

function forward() {
  video.currentTime = Math.min(
    video.currentTime + preferences.timeSkip,
    video.duration,
  );
}

function togglePictureInPicture() {
  document.pictureInPictureElement
    ? document.exitPictureInPicture()
    : video.requestPictureInPicture();
}

function toggleFullScreen() {
  document.fullscreenElement
    ? document.exitFullscreen()
    : player.requestFullscreen();
}

function toggleZoom() {
  if (zoomBtn.textContent.trim() === "zoom_out_map") {
    video.style.objectFit = "cover";
    zoomBtn.textContent = "crop_free";
  } else {
    video.style.objectFit = "contain";
    zoomBtn.textContent = "zoom_out_map";
  }
}

function toggleTimeIndicator() {
  if (timeIndicatorToggle.dataset.state === "default") {
    timeIndicatorToggle.dataset.state = "alternate";
  } else {
    timeIndicatorToggle.dataset.state = "default";
  }
  updateTimeIndicator();
}

// Convert seconds to time in format (h:)mm:ss
// Use https://tc39.es/proposal-temporal/docs/duration.html when available
function secondsToTime(seconds) {
  return new Date(seconds * 1000)
    .toISOString()
    .substring(seconds >= 3600 ? 12 : 14, 19);
}

function millisecondsToTimeOfDay(milliseconds) {
  return new Date(milliseconds).toLocaleTimeString([], {
    timeStyle: "short",
  });
}

// UTILITIES
async function computeFileSignature(
  file,
  chunkSize = 1024 * 1024, // 1 MB
  algorithm = "SHA-1", // Prefer speed over security
) {
  // Get the first and last chunk of the file
  const firstPart = file.slice(0, chunkSize);
  const lastPart = file.slice(-chunkSize);

  // Read the file chunks as array buffers
  const chunksData = await Promise.all([
    firstPart.arrayBuffer(),
    lastPart.arrayBuffer(),
  ]);

  // Convert the file size to string and encode to a Uint8Array
  const fileSize = new TextEncoder().encode(file.size.toString());

  // Concatenate the array buffers and the file size buffer
  const combined = new Uint8Array(
    chunksData[0].byteLength + chunksData[1].byteLength + fileSize.byteLength,
  );
  combined.set(new Uint8Array(chunksData[0]), 0);
  combined.set(new Uint8Array(chunksData[1]), chunksData[0].byteLength);
  combined.set(fileSize, chunksData[0].byteLength + chunksData[1].byteLength);

  // Hash the combined buffer
  const hash = await crypto.subtle.digest(algorithm, combined);

  // Convert the hash to a hex string
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function updateLocalStorage() {
  const state = {
    timer: video.currentTime,
    playbackRate: video.playbackRate,
    lastOpened: Date.now(),
    timeIndicator: timeIndicator.dataset.state,
  };
  localStorage.setItem(localStorageKey, JSON.stringify(state));
}

function restoreFromLocalStorage() {
  const state = JSON.parse(localStorage.getItem(localStorageKey));
  video.currentTime = state.timer;
  video.playbackRate = state.playbackRate;
  timeIndicator.dataset.state = state.timeIndicator;
}
