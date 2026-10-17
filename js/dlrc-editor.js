
"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.Editor = (() => {
    const state = {
        lines: [],
        singers: [
            { name: "blue", color: "#000DFF" },
            { name: "red", color: "#FF0000" }
        ],
        activeIndex: 0,
        selectedIndex: 0,
        metadata: {
            title: "",
            artist: "",
            album: "",
            creator: "",
            offset: 0,
            note: ""
        }
    };

    const el = {};
    let lyricsInput;
    let onToast = () => {};
    let renderQueued = false;

    function init(options = {}) {
        onToast = options.onToast || (() => {});

        const ids = [
            "lyricsInput", "syncProgress", "activeLineLabel",
            "syncLyricsList", "timestampButton", "previousLineButton",
            "nextLineButton", "metaTitle", "metaArtist", "metaAlbum",
            "metaCreator", "metaOffset", "metaNote", "newSingerName",
            "newSingerColor", "addSingerButton", "singerList",
            "lineSinger", "lineColor", "selectedLineDescription",
            "selectedLineText", "applyLineButton",
            "clearLineTimestampButton", "dlrcPreview",
            "copyDlrcButton", "previewStatus", "validationCount"
        ];

        for (const id of ids) {
            el[id] = document.getElementById(id);
        }

        lyricsInput = el.lyricsInput;

        lyricsInput.addEventListener("input", syncLyricsFromTextarea);

        el.timestampButton.addEventListener("click", timestampActiveLine);
        el.previousLineButton.addEventListener("click", () => moveActive(-1));
        el.nextLineButton.addEventListener("click", () => moveActive(1));

        el.addSingerButton.addEventListener("click", addSinger);
        el.applyLineButton.addEventListener("click", applySelectedLine);
        el.clearLineTimestampButton.addEventListener(
            "click", clearSelectedTimestamp
        );

        el.copyDlrcButton.addEventListener("click", copySource);

        for (const [key, id] of Object.entries({
            title: "metaTitle",
            artist: "metaArtist",
            album: "metaAlbum",
            creator: "metaCreator",
            note: "metaNote"
        })) {
            el[id].addEventListener("input", () => {
                state.metadata[key] = el[id].value;
                scheduleRender();
            });
        }

        el.metaOffset.addEventListener("input", () => {
            const value = Number(el.metaOffset.value);
            state.metadata.offset = Number.isFinite(value) ? value : 0;
            scheduleRender();
        });

        el.lineSinger.addEventListener("change", () => {
            const line = getSelectedLine();
            if (!line) return;

            line.column = Number(el.lineSinger.value);
            renderAll();
        });

        el.lineColor.addEventListener("change", () => {
            const line = getSelectedLine();
            if (!line) return;

            line.color = el.lineColor.value;
            scheduleRender();
        });

        renderAll();
    }

    function syncLyricsFromTextarea() {
        const sourceLines = lyricsInput.value.split(/\r\n|\r|\n/);
        const oldLines = state.lines;
        const newLines = [];
        let oldIndex = 0;

        for (const raw of sourceLines) {
            if (!raw.trim()) continue;

            // Reuse unchanged lyric lines in order, preserving timestamps.
            let matched = -1;

            for (let i = oldIndex; i < oldLines.length; i++) {
                if (oldLines[i].text === raw) {
                    matched = i;
                    break;
                }
            }

            if (matched !== -1) {
                newLines.push({ ...oldLines[matched] });
                oldIndex = matched + 1;
            } else {
                newLines.push({
                    id: createId(),
                    text: raw,
                    time: null,
                    column: 0,
                    color: ""
                });
            }
        }

        state.lines = newLines;

        if (state.lines.length === 0) {
            state.activeIndex = 0;
            state.selectedIndex = 0;
        } else {
            state.activeIndex = clampIndex(state.activeIndex);
            state.selectedIndex = clampIndex(state.selectedIndex);
        }

        renderAll();
    }

    function createId() {
        return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function clampIndex(index) {
        return Math.max(0, Math.min(index, state.lines.length - 1));
    }

    function getAudio() {
        return window.DLRC.AudioPlayer.getAudioElement();
    }

    function timestampActiveLine() {
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
        state.selectedIndex = index;

        if (index < state.lines.length - 1) {
            state.activeIndex = index + 1;
        }

        renderAll();
    }

    function moveActive(direction) {
        if (!state.lines.length) return;

        state.activeIndex = clampIndex(state.activeIndex + direction);
        state.selectedIndex = state.activeIndex;
        renderAll();
    }

    function selectLine(index) {
        if (index < 0 || index >= state.lines.length) return;

        state.selectedIndex = index;
        state.activeIndex = index;
        renderAll();
    }

    function getSelectedLine() {
        return state.lines[state.selectedIndex] || null;
    }

    function applySelectedLine() {
        const line = getSelectedLine();

        if (!line) {
            onToast("Select a lyric line first.");
            return;
        }

        line.text = el.selectedLineText.value;
        line.column = Number(el.lineSinger.value);
        line.color = el.lineColor.value;

        // Keep the text input synchronized with the structured line data.
        lyricsInput.value = state.lines.map(item => item.text).join("\n");

        renderAll();
        onToast("Lyric line updated.");
    }

    function clearSelectedTimestamp() {
        const line = getSelectedLine();

        if (!line) return;

        line.time = null;
        renderAll();
        onToast("Timestamp cleared.");
    }

    function addSinger() {
        const name = el.newSingerName.value.trim();
        const color = el.newSingerColor.value;

        if (!name) {
            onToast("Enter a singer/color name.");
            el.newSingerName.focus();
            return;
        }

        if (/[\[\]<>:{}\r\n]/.test(name)) {
            onToast("Singer names cannot contain DLRC syntax characters.");
            return;
        }

        if (state.singers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            onToast("That singer/color name already exists.");
            return;
        }

        state.singers.push({ name, color });
        el.newSingerName.value = "";
        renderAll();
        onToast(`Added singer "${name}".`);
    }

    function changeSinger(index, property, value) {
        if (!state.singers[index]) return;

        if (property === "name") {
            const name = value.trim();

            if (!name || /[\[\]<>:{}\r\n]/.test(name)) {
                onToast("Enter a valid color name.");
                renderSingers();
                return;
            }

            if (state.singers.some((s, i) =>
                i !== index && s.name.toLowerCase() === name.toLowerCase()
            )) {
                onToast("Color names must be unique.");
                renderSingers();
                return;
            }

            state.singers[index].name = name;
        } else if (property === "color" && /^#[0-9a-f]{6}$/i.test(value)) {
            state.singers[index].color = value.toUpperCase();
        }

        renderAll();
    }

    function removeSinger(index) {
        if (state.singers.length <= 1) {
            onToast("At least one singer column is required.");
            return;
        }

        state.singers.splice(index, 1);

        for (const line of state.lines) {
            if (line.column === index) {
                line.column = 0;
            } else if (line.column > index) {
                line.column--;
            }
        }

        renderAll();
    }

    function renderAll() {
        renderLyrics();
        renderSingers();
        renderSelectedLine();
        renderPreview();
    }

    function renderLyrics() {
        const list = el.syncLyricsList;
        list.replaceChildren();

        if (!state.lines.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent =
                "Enter lyrics above to create your synchronized lyric lines.";
            list.append(empty);
        }

        state.lines.forEach((line, index) => {
            const row = document.createElement("div");
            row.className = "sync-line";

            if (index === state.activeIndex) row.classList.add("is-active");
            if (index === state.selectedIndex) row.classList.add("is-selected");

            const number = document.createElement("span");
            number.className = "sync-line-number";
            number.textContent = String(index + 1).padStart(2, "0");

            const timestamp = document.createElement("button");
            timestamp.type = "button";
            timestamp.className = "sync-line-time";
            timestamp.textContent = line.time === null
                ? "--:--.--"
                : formatTimestamp(line.time);
            timestamp.title = "Select this line";
            timestamp.addEventListener("click", () => selectLine(index));

            const text = document.createElement("button");
            text.type = "button";
            text.className = "sync-line-text";
            text.textContent = line.text;
            text.addEventListener("click", () => selectLine(index));

            const singer = state.singers[line.column] || state.singers[0];
            text.style.borderLeftColor = line.color
                ? resolveColor(line.color)
                : singer.color;

            const retimestamp = document.createElement("button");
            retimestamp.type = "button";
            retimestamp.className = "sync-line-retimestamp";
            retimestamp.textContent = "Set";
            retimestamp.title = "Timestamp this line at the current position";
            retimestamp.addEventListener("click", () => {
                state.activeIndex = index;
                state.selectedIndex = index;
                timestampActiveLine();
            });

            row.append(number, timestamp, text, retimestamp);
            list.append(row);
        });

        const timestamped = state.lines.filter(line => line.time !== null).length;

        el.syncProgress.textContent =
            `${timestamped} of ${state.lines.length} lines timestamped`;

        el.activeLineLabel.textContent = state.lines.length
            ? `Active line ${state.activeIndex + 1} of ${state.lines.length}`
            : "No active line";

        el.timestampButton.disabled = state.lines.length === 0;
        el.previousLineButton.disabled =
            state.lines.length === 0 || state.activeIndex === 0;
        el.nextLineButton.disabled =
            state.lines.length === 0 ||
            state.activeIndex === state.lines.length - 1;
    }

    function renderSingers() {
        el.singerList.replaceChildren();

        state.singers.forEach((singer, index) => {
            const row = document.createElement("div");
            row.className = "singer-row";

            const column = document.createElement("span");
            column.className = "singer-column-badge";
            column.textContent = String(index);

            const name = document.createElement("input");
            name.type = "text";
            name.className = "singer-name-input";
            name.value = singer.name;
            name.setAttribute("aria-label", `Column ${index} color name`);
            name.addEventListener("change", () =>
                changeSinger(index, "name", name.value)
            );

            const color = document.createElement("input");
            color.type = "color";
            color.value = singer.color;
            color.setAttribute("aria-label", `Column ${index} color`);
            color.addEventListener("input", () =>
                changeSinger(index, "color", color.value)
            );

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "button button-secondary";
            remove.textContent = "Remove";
            remove.addEventListener("click", () => removeSinger(index));

            row.append(column, name, color, remove);
            el.singerList.append(row);
        });

        const previousColumn = Number(el.lineSinger.value) || 0;
        el.lineSinger.replaceChildren();

        state.singers.forEach((singer, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = `Column ${index} — ${singer.name}`;
            el.lineSinger.append(option);
        });

        el.lineSinger.value = String(
            Math.min(previousColumn, state.singers.length - 1)
        );

        const previousColor = el.lineColor.value;
        el.lineColor.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Use singer default";
        el.lineColor.append(defaultOption);

        state.singers.forEach(singer => {
            const option = document.createElement("option");
            option.value = singer.name;
            option.textContent = singer.name;
            el.lineColor.append(option);
        });

        if ([...el.lineColor.options].some(o => o.value === previousColor)) {
            el.lineColor.value = previousColor;
        }
    }

    function renderSelectedLine() {
        const line = getSelectedLine();

        if (!line) {
            el.selectedLineDescription.textContent =
                "Select a lyric line above to configure its singer and color.";
            el.selectedLineText.value = "";
            el.selectedLineText.disabled = true;
            el.lineSinger.disabled = true;
            el.lineColor.disabled = true;
            el.applyLineButton.disabled = true;
            el.clearLineTimestampButton.disabled = true;
            return;
        }

        el.selectedLineDescription.textContent =
            `Editing line ${state.selectedIndex + 1}` +
            (line.time === null ? " · Not timestamped" :
                ` · ${formatTimestamp(line.time)}`);

        el.selectedLineText.disabled = false;
        el.lineSinger.disabled = false;
        el.lineColor.disabled = false;
        el.applyLineButton.disabled = false;
        el.clearLineTimestampButton.disabled = false;

        el.selectedLineText.value = line.text;
        el.lineSinger.value = String(
            Math.min(line.column, state.singers.length - 1)
        );
        el.lineColor.value = line.color || "";
    }

    function formatTimestamp(seconds) {
        const centiseconds = Math.round(seconds * 100);
        const minutes = Math.floor(centiseconds / 6000);
        const remainder = centiseconds % 6000;
        const wholeSeconds = Math.floor(remainder / 100);
        const fraction = remainder % 100;

        return `${String(minutes).padStart(2, "0")}:` +
            `${String(wholeSeconds).padStart(2, "0")}.` +
            `${String(fraction).padStart(2, "0")}`;
    }

    function resolveColor(name) {
        const singer = state.singers.find(
            item => item.name.toLowerCase() === name.toLowerCase()
        );

        return singer ? singer.color : "#A78BFA";
    }

    function scheduleRender() {
        if (renderQueued) return;
        renderQueued = true;

        requestAnimationFrame(() => {
            renderQueued = false;
            renderPreview();
        });
    }

    function renderPreview() {
        const output = [];
        const issues = [];

        addTag(output, "ti", state.metadata.title);
        addTag(output, "ar", state.metadata.artist);
        addTag(output, "al", state.metadata.album);
        addTag(output, "by", state.metadata.creator);

        if (state.metadata.offset !== 0) {
            output.push(`[offset:${Math.trunc(state.metadata.offset)}]`);
        }

        // A named declaration defines a reusable color for the file.
        for (const singer of state.singers) {
            output.push(`[${singer.color}:${singer.name}]`);
        }

        if (state.metadata.note.trim()) {
            output.push(`[re:${state.metadata.note.trim()}]`);
        }

        if (output.length && state.lines.length) output.push("");

        const seenTimestamps = new Set();

        state.lines.forEach((line, index) => {
            if (line.time === null) {
                issues.push(`Line ${index + 1} has no timestamp.`);
                return;
            }

            if (!Number.isFinite(line.time) || line.time < 0) {
                issues.push(`Line ${index + 1} has an invalid timestamp.`);
                return;
            }

            const timestamp = formatTimestamp(line.time);

            if (seenTimestamps.has(timestamp)) {
                // Simultaneous vocals may legitimately share a timestamp.
            }
            seenTimestamps.add(timestamp);

            const singer = state.singers[line.column];

            if (!singer) {
                issues.push(`Line ${index + 1} has an undefined singer column.`);
                return;
            }

            let colorTag = "";

            if (line.color) {
                const defined = state.singers.some(
                    item => item.name.toLowerCase() === line.color.toLowerCase()
                );

                if (!defined) {
                    issues.push(
                        `Line ${index + 1} uses undefined color "${line.color}".`
                    );
                } else {
                    colorTag = `<${line.color}>`;
                }
            }

            output.push(
                `[${timestamp}]{${line.column}}${colorTag}${line.text}`
            );
        });

        el.dlrcPreview.value = output.join("\n");
        el.validationCount.textContent = issues.length
            ? `${issues.length} issue${issues.length === 1 ? "" : "s"}`
            : "No validation issues";

        el.previewStatus.textContent = state.lines.length
            ? `${state.lines.length} lyric lines`
            : "Waiting for lyrics";

        el.validationCount.title = issues.join("\n");
    }

    function addTag(output, tag, value) {
        if (value.trim()) {
            output.push(`[${tag}:${value.trim().replace(/[\r\n]/g, " ")}]`);
        }
    }

    async function copySource() {
        try {
            await navigator.clipboard.writeText(el.dlrcPreview.value);
            onToast("DLRC source copied.");
        } catch {
            el.dlrcPreview.focus();
            el.dlrcPreview.select();

            try {
                const copied = document.execCommand("copy");
                onToast(copied
                    ? "DLRC source copied."
                    : "Select and copy the source manually.");
            } catch {
                onToast("Select and copy the source manually.");
            }
        }
    }

    function handleKeyboard(event) {
        const target = event.target;
        const typing = target instanceof HTMLElement &&
            (target.isContentEditable ||
             ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

        if (typing || event.altKey || event.ctrlKey || event.metaKey) return;

        if (event.code === "Space") {
            event.preventDefault();
            const audio = getAudio();
            if (audio?.src) {
                if (audio.paused) {
                    audio.play().catch(() => {});
                } else {
                    audio.pause();
                }
            }
        } else if (event.key === "Enter") {
            event.preventDefault();
            timestampActiveLine();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveActive(-1);
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            moveActive(1);
        }
    }

    function getLines() {
        return state.lines.map(line => ({ ...line }));
    }

    document.addEventListener("keydown", handleKeyboard);

    return {
        init,
        getLines,
        renderAll
    };
})();
