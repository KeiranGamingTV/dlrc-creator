
"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.App = (() => {
    let lyricsInput;
    let lineCount;
    let clearLyricsButton;
    let toast;
    let toastTimeout;

    function init() {
        lyricsInput = document.getElementById("lyricsInput");
        lineCount = document.getElementById("lineCount");
        clearLyricsButton = document.getElementById("clearLyricsButton");
        toast = document.getElementById("toast");

        window.DLRC.AudioPlayer.init({
            onTrackLoaded(track) {
                showToast(`Loaded "${track.name}"`);
            },

            onError(message) {
                showToast(message);
            }
        });

        lyricsInput.addEventListener("input", updateLineCount);

        clearLyricsButton.addEventListener("click", clearLyrics);

        updateLineCount();

        window.addEventListener("beforeunload", () => {
            window.DLRC.AudioPlayer.destroy();
        });
    }

    function updateLineCount() {
        const lines = lyricsInput.value
            .split(/\r\n|\r|\n/)
            .filter(line => line.trim().length > 0);

        const count = lines.length;

        lineCount.textContent = `${count} ${count === 1 ? "line" : "lines"}`;
    }

    function clearLyrics() {
        if (!lyricsInput.value) {
            return;
        }

        lyricsInput.value = "";
        updateLineCount();
        lyricsInput.focus();
        showToast("Lyrics cleared.");
    }

    function showToast(message) {
        window.clearTimeout(toastTimeout);

        toast.textContent = message;
        toast.hidden = false;

        toastTimeout = window.setTimeout(() => {
            toast.hidden = true;
        }, 3000);
    }

    return {
        init
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    window.DLRC.App.init();
});
