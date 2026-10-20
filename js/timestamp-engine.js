"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.TimestampEngine = (() => {
    function create({ getState, getAudio, onChange, onToast }) {
        function clampIndex(index) {
            const state = getState();
            return Math.max(0, Math.min(index, state.lines.length - 1));
        }

        function stampActive() {
            const state = getState();
            const audio = getAudio();

            if (!state.lines.length) {
                onToast("Enter your lyrics before adding timestamps.");
                return;
            }

            if (!audio || !audio.src || !Number.isFinite(audio.currentTime)) {
                onToast("Choose an audio file first.");
                return;
            }

            const index = clampIndex(state.activeIndex);
            state.lines[index].time = Math.max(0, audio.currentTime);

            if (index < state.lines.length - 1) {
                state.activeIndex = index + 1;
            }

            // Keep the selected line on the active line so the two never disagree.
            state.selectedIndex = state.activeIndex;

            onChange();
        }

        function stampLine(index) {
            const state = getState();
            if (index < 0 || index >= state.lines.length) return;

            state.activeIndex = index;
            state.selectedIndex = index;
            stampActive();
        }

        function moveActive(direction) {
            const state = getState();
            if (!state.lines.length) return;

            state.activeIndex = clampIndex(state.activeIndex + direction);
            state.selectedIndex = state.activeIndex;
            onChange();
        }

        function selectLine(index) {
            const state = getState();
            if (index < 0 || index >= state.lines.length) return;

            state.selectedIndex = index;
            state.activeIndex = index;
            onChange();
        }

        function clearSelected() {
            const state = getState();
            const line = state.lines[state.selectedIndex];
            if (!line) return;

            line.time = null;
            onChange();
            onToast("Timestamp cleared.");
        }

        function togglePlayback() {
            const audio = getAudio();
            if (!audio || !audio.src) return;

            if (audio.paused) {
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
        }

        function handleKeyboard(event) {
            const target = event.target;
            const typing = target instanceof HTMLElement &&
                (target.isContentEditable ||
                 ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

            if (typing || event.altKey || event.ctrlKey || event.metaKey) return;

            // Let Enter and Space press a focused button or link normally.
            const interactive = target instanceof HTMLElement &&
                target.closest("button, a, summary");

            if (interactive && (event.code === "Space" || event.key === "Enter")) return;

            if (event.code === "Space") {
                event.preventDefault();
                togglePlayback();
            } else if (event.key === "Enter") {
                event.preventDefault();
                stampActive();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveActive(-1);
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                moveActive(1);
            }
        }

        function attachKeyboard() {
            document.addEventListener("keydown", handleKeyboard);
        }

        function detachKeyboard() {
            document.removeEventListener("keydown", handleKeyboard);
        }

        return {
            clampIndex,
            stampActive,
            stampLine,
            moveActive,
            selectLine,
            clearSelected,
            togglePlayback,
            attachKeyboard,
            detachKeyboard
        };
    }

    return { create };
})();
