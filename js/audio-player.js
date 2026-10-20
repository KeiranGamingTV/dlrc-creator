
"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.AudioPlayer = (() => {
    const elements = {};
    let currentObjectUrl = null;
    let onTrackLoaded = null;
    let onError = null;

    function init(options = {}) {
        Object.assign(elements, {
            fileInput: document.getElementById("audioFileInput"),
            uploadZone: document.getElementById("uploadZone"),
            uploadTitle: document.getElementById("uploadTitle"),
            uploadDescription: document.getElementById("uploadDescription"),
            chooseButton: document.getElementById("chooseAudioButton"),
            changeButton: document.getElementById("changeAudioButton"),
            trackPlayer: document.getElementById("trackPlayer"),
            trackTitle: document.getElementById("trackTitle"),
            trackDetails: document.getElementById("trackDetails"),
            playerControls: document.getElementById("playerControls"),
            audio: document.getElementById("audioElement"),
            playButton: document.getElementById("playButton"),
            seekBar: document.getElementById("seekBar"),
            currentTime: document.getElementById("currentTime"),
            totalTime: document.getElementById("totalTime"),
            speedSelect: document.getElementById("speedSelect")
        });

        onTrackLoaded = options.onTrackLoaded || (() => {});
        onError = options.onError || (() => {});

        elements.chooseButton.addEventListener("click", openFilePicker);
        elements.changeButton.addEventListener("click", openFilePicker);

        elements.fileInput.addEventListener("change", event => {
            const file = event.target.files?.[0];

            if (file) {
                loadFile(file);
            }

            // Permit selecting the same file again.
            event.target.value = "";
        });

        elements.uploadZone.addEventListener("click", event => {
            if (event.target.closest("button")) {
                return;
            }

            openFilePicker();
        });

        elements.uploadZone.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFilePicker();
            }
        });

        elements.uploadZone.setAttribute("role", "button");
        elements.uploadZone.setAttribute("tabindex", "0");
        elements.uploadZone.setAttribute(
            "aria-label",
            "Choose an audio file or drop one here"
        );

        ["dragenter", "dragover"].forEach(type => {
            elements.uploadZone.addEventListener(type, event => {
                event.preventDefault();
                elements.uploadZone.classList.add("drag-over");
            });
        });

        ["dragleave", "drop"].forEach(type => {
            elements.uploadZone.addEventListener(type, event => {
                event.preventDefault();
                elements.uploadZone.classList.remove("drag-over");
            });
        });

        elements.uploadZone.addEventListener("drop", event => {
            const files = Array.from(event.dataTransfer?.files || []);
            const file = files.find(isAudioFile);

            if (!file) {
                onError("Drop a supported audio file to get started.");
                return;
            }

            loadFile(file);
        });

        elements.playButton.addEventListener("click", togglePlayback);

        elements.audio.addEventListener("play", updatePlayButton);
        elements.audio.addEventListener("pause", updatePlayButton);

        elements.audio.addEventListener("loadedmetadata", () => {
            elements.totalTime.textContent = formatTime(
                elements.audio.duration
            );
            elements.seekBar.value = "0";
        });

        elements.audio.addEventListener("timeupdate", updateProgress);

        elements.audio.addEventListener("durationchange", () => {
            if (Number.isFinite(elements.audio.duration)) {
                elements.totalTime.textContent = formatTime(
                    elements.audio.duration
                );
            }
        });

        elements.audio.addEventListener("ended", () => {
            updatePlayButton();
            updateProgress();
        });

        elements.audio.addEventListener("error", () => {
            if (!elements.audio.currentSrc) {
                return;
            }

            onError(
                "The browser could not play this file. Try another format, such as MP3 or WAV."
            );
        });

        elements.seekBar.addEventListener("input", () => {
            const duration = elements.audio.duration;

            if (!Number.isFinite(duration) || duration <= 0) {
                return;
            }

            const fraction = Number(elements.seekBar.value) / 1000;
            elements.audio.currentTime = fraction * duration;
        });

        elements.speedSelect.addEventListener("change", () => {
            elements.audio.playbackRate = Number(
                elements.speedSelect.value
            );
        });

        updatePlayButton();
    }

    function openFilePicker() {
        elements.fileInput.click();
    }

    function isAudioFile(file) {
        return file.type.startsWith("audio/") ||
            /\.(mp3|wav|flac|m4a|aac|ogg|opus|oga|webm|mp4)$/i.test(file.name);
    }

    function loadFile(file) {
        if (!isAudioFile(file)) {
            onError("Please choose an audio file.");
            return;
        }

        if (file.size === 0) {
            onError("That audio file is empty.");
            return;
        }

        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }

        elements.audio.pause();
        elements.audio.removeAttribute("src");
        elements.audio.load();

        currentObjectUrl = URL.createObjectURL(file);

        elements.audio.src = currentObjectUrl;
        elements.audio.playbackRate = Number(elements.speedSelect.value);

        elements.trackTitle.textContent = file.name.replace(/\.[^.]+$/, "");
        elements.trackDetails.textContent =
            formatFileSize(file.size) + " · Local audio file";

        elements.uploadZone.hidden = true;
        elements.trackPlayer.hidden = false;
        elements.playerControls.hidden = false;

        elements.currentTime.textContent = "0:00";
        elements.totalTime.textContent = "0:00";
        elements.seekBar.value = "0";

        elements.audio.load();

        onTrackLoaded({
            name: file.name,
            size: file.size,
            type: file.type,
            file
        });
    }

    async function togglePlayback() {
        if (!elements.audio.src) {
            openFilePicker();
            return;
        }

        if (elements.audio.paused) {
            try {
                await elements.audio.play();
            } catch {
                onError(
                    "Playback could not start. Try selecting the audio file again."
                );
            }
        } else {
            elements.audio.pause();
        }
    }

    function updatePlayButton() {
        const playing = !elements.audio.paused &&
            !elements.audio.ended;

        elements.playButton.textContent = playing ? "Ⅱ" : "▶";
        elements.playButton.setAttribute(
            "aria-label",
            playing ? "Pause audio" : "Play audio"
        );
        elements.playButton.title = playing ? "Pause" : "Play";
    }

    function updateProgress() {
        const audio = elements.audio;
        const duration = audio.duration;

        elements.currentTime.textContent = formatTime(audio.currentTime);

        if (Number.isFinite(duration) && duration > 0) {
            elements.seekBar.value = String(
                Math.round((audio.currentTime / duration) * 1000)
            );
        } else {
            elements.seekBar.value = "0";
        }
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "0:00";
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) {
            return "Audio";
        }

        if (bytes < 1024 * 1024) {
            return `${Math.max(1, Math.round(bytes / 1024))} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function getAudioElement() {
        return elements.audio;
    }

    function destroy() {
        elements.audio.pause();
        elements.audio.removeAttribute("src");
        elements.audio.load();

        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
    }

    return {
        init,
        getAudioElement,
        destroy
    };
})();
