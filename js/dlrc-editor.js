"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.Editor = (() => {
    const { COLUMNS, generate, formatTimestamp } = window.DLRC.Generator;

    const HEX = /^#[0-9a-f]{6}$/i;
    const BAD_NAME = /[\[\]<>:{}\r\n]/;
    const COLUMN_COLORS = { "1": "#8AB8FF", "2": "#FF9EC4", "B": "#A78BFA" };
    const COLUMN_TAGS = { "1": "L", "2": "R", "B": "C" };

    const METADATA_FIELDS = {
        title: "metaTitle",
        artist: "metaArtist",
        album: "metaAlbum",
        creator: "metaCreator",
        length: "metaLength",
        note: "metaNote"
    };

    const state = {
        lines: [],
        colors: [
            { name: "blue", hex: "#000DFF" },
            { name: "red", hex: "#FF0000" }
        ],
        header: [],
        footer: [],
        importNotes: [],
        activeIndex: 0,
        selectedIndex: 0,
        metadata: {
            title: "", artist: "", album: "", creator: "",
            offset: 0, length: "", note: ""
        }
    };

    const el = {};
    let lyricsInput;
    let onToast = () => {};
    let renderQueued = false;
    let engine;

    function init(options = {}) {
        onToast = options.onToast || (() => {});

        engine = window.DLRC.TimestampEngine.create({
            getState: () => state,
            getAudio,
            onChange: renderAll,
            onToast: message => onToast(message)
        });
        engine.attachKeyboard();

        const ids = [
            "lyricsInput", "syncProgress", "activeLineLabel",
            "syncLyricsList", "timestampButton", "previousLineButton",
            "nextLineButton", "metaTitle", "metaArtist", "metaAlbum",
            "metaCreator", "metaOffset", "metaLength", "metaNote",
            "newSingerName", "newSingerColor", "addSingerButton",
            "singerList", "lineSinger", "lineColor",
            "selectedLineDescription", "selectedLineText", "applyLineButton",
            "clearLineTimestampButton", "dlrcPreview", "copyDlrcButton",
            "previewStatus", "validationCount", "validationList"
        ];

        for (const id of ids) {
            el[id] = document.getElementById(id);
        }

        lyricsInput = el.lyricsInput;

        el.lineSinger.replaceChildren();
        for (const column of COLUMNS) {
            const option = document.createElement("option");
            option.value = column.value;
            option.textContent = column.label;
            el.lineSinger.append(option);
        }

        lyricsInput.addEventListener("input", syncLyricsFromTextarea);

        el.timestampButton.addEventListener("click", engine.stampActive);
        el.previousLineButton.addEventListener("click", () => engine.moveActive(-1));
        el.nextLineButton.addEventListener("click", () => engine.moveActive(1));


        el.addSingerButton.addEventListener("click", addColor);
        el.applyLineButton.addEventListener("click", applySelectedLine);
        el.clearLineTimestampButton.addEventListener("click", engine.clearSelected);
        el.copyDlrcButton.addEventListener("click", copySource);

        for (const [key, id] of Object.entries(METADATA_FIELDS)) {
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
            line.column = el.lineSinger.value;
            renderAll();
        });

        el.lineColor.addEventListener("change", () => {
            const line = getSelectedLine();
            if (!line) return;
            line.color = el.lineColor.value;
            renderAll();
        });

        // The [length:] tag follows the audio duration when the field is blank.
        const audio = getAudio();
        if (audio) {
            for (const type of ["loadedmetadata", "durationchange"]) {
                audio.addEventListener(type, scheduleRender);
            }
        }

        renderAll();
    }

    function syncLyricsFromTextarea() {
        const entries = lyricsInput.value
            .split(/\r\n|\r|\n/)
            .filter(raw => raw.trim());
        const oldLines = state.lines;
        let newLines;

        const unchanged = entries.filter(
            (text, i) => oldLines[i] && oldLines[i].text === text
        ).length;

        if (entries.length === oldLines.length && unchanged >= entries.length / 2) {
            // Same line count: treat differences as edits and keep timestamps, columns, and colors.
            newLines = entries.map((text, i) => ({ ...oldLines[i], text }));
        } else {
            newLines = [];
            let oldIndex = 0;

            for (const raw of entries) {
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
                        column: "1",
                        color: ""
                    });
                }
            }
        }

        state.lines = newLines;

        if (!state.lines.length) {
            state.activeIndex = 0;
            state.selectedIndex = 0;
        } else {
            state.activeIndex = engine.clampIndex(state.activeIndex);
            state.selectedIndex = engine.clampIndex(state.selectedIndex);
        }

        renderAll();
    }

    function createId() {
        return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function getAudio() {
        return window.DLRC.AudioPlayer.getAudioElement();
    }

    function getAudioDuration() {
        const audio = getAudio();
        return audio && Number.isFinite(audio.duration) ? audio.duration : null;
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

        if (!el.selectedLineText.value.trim()) {
            onToast("Lyric text can't be empty.");
            return;
        }

        line.text = el.selectedLineText.value.replace(/[\r\n]+/g, " ");
        line.column = el.lineSinger.value;
        line.color = el.lineColor.value;

        lyricsInput.value = state.lines.map(item => item.text).join("\n");

        renderAll();
        onToast("Lyric line updated.");
    }

    function addColor() {
        const name = el.newSingerName.value.trim();
        const hex = el.newSingerColor.value.toUpperCase();

        if (!name) {
            onToast("Enter a color name.");
            el.newSingerName.focus();
            return;
        }

        if (BAD_NAME.test(name)) {
            onToast("Color names cannot contain DLRC syntax characters.");
            return;
        }

        if (state.colors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            onToast("That color name already exists.");
            return;
        }

        state.colors.push({ name, hex });
        el.newSingerName.value = "";
        renderAll();
        onToast(`Added color "${name}".`);
    }

    function changeColor(index, property, value) {
        const color = state.colors[index];
        if (!color) return;

        if (property === "name") {
            const name = value.trim();

            if (!name || BAD_NAME.test(name)) {
                onToast("Enter a valid color name.");
                renderColors();
                return;
            }

            if (state.colors.some((c, i) =>
                i !== index && c.name.toLowerCase() === name.toLowerCase()
            )) {
                onToast("Color names must be unique.");
                renderColors();
                return;
            }

            const old = color.name.toLowerCase();
            color.name = name;

            // Keep lines that used the old name pointing at the renamed color.
            for (const line of state.lines) {
                if (line.color && line.color.toLowerCase() === old) {
                    line.color = name;
                }
            }
        } else if (property === "hex" && HEX.test(value)) {
            color.hex = value.toUpperCase();
        }

        renderAll();
    }

    function removeColor(index) {
        const [removed] = state.colors.splice(index, 1);
        if (!removed) return;

        for (const line of state.lines) {
            if (line.color && line.color.toLowerCase() === removed.name.toLowerCase()) {
                line.color = "";
            }
        }

        renderAll();
    }

    function resolveColor(name) {
        if (HEX.test(name)) return name;
        const color = state.colors.find(c => c.name.toLowerCase() === name.toLowerCase());
        return color ? color.hex : "#A78BFA";
    }

    function lineBorderColor(line) {
        return line.color
            ? resolveColor(line.color)
            : (COLUMN_COLORS[line.column] || COLUMN_COLORS["1"]);
    }

    function renderAll() {
        renderLyrics();
        renderColors();
        renderSelectedLine();
        renderPreview();
    }

    function renderLyrics() {
        const list = el.syncLyricsList;
        list.replaceChildren();

        if (!state.lines.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "Enter lyrics above to create your synchronized lyric lines.";
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
            timestamp.addEventListener("click", () => engine.selectLine(index));

            const text = document.createElement("button");
            text.type = "button";
            text.className = "sync-line-text";

            const tag = document.createElement("span");
            tag.className = "sync-line-col";
            tag.textContent = COLUMN_TAGS[line.column] || "?";

            text.append(tag, document.createTextNode(line.text));
            text.style.borderLeftColor = lineBorderColor(line);
            text.addEventListener("click", () => engine.selectLine(index));

            const retimestamp = document.createElement("button");
            retimestamp.type = "button";
            retimestamp.className = "sync-line-retimestamp";
            retimestamp.textContent = "Set";
            retimestamp.title = "Timestamp this line at the current position";
            retimestamp.addEventListener("click", () => engine.stampLine(index));

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

    function renderColors() {
        el.singerList.replaceChildren();

        if (!state.colors.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent =
                "No named colors yet. Lines use the default color for their column.";
            el.singerList.append(empty);
        }

        state.colors.forEach((color, index) => {
            const row = document.createElement("div");
            row.className = "singer-row";

            const swatch = document.createElement("span");
            swatch.className = "singer-column-badge";
            swatch.style.background = color.hex;
            swatch.setAttribute("aria-hidden", "true");

            const name = document.createElement("input");
            name.type = "text";
            name.className = "singer-name-input";
            name.value = color.name;
            name.setAttribute("aria-label", `Color ${index + 1} name`);
            name.addEventListener("change", () =>
                changeColor(index, "name", name.value)
            );

            const picker = document.createElement("input");
            picker.type = "color";
            picker.value = color.hex;
            picker.setAttribute("aria-label", `Color ${index + 1} value`);
            picker.addEventListener("input", () =>
                changeColor(index, "hex", picker.value)
            );

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "button button-secondary";
            remove.textContent = "Remove";
            remove.addEventListener("click", () => removeColor(index));

            row.append(swatch, name, picker, remove);
            el.singerList.append(row);
        });

        el.lineColor.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Use column default";
        el.lineColor.append(defaultOption);

        state.colors.forEach(color => {
            const option = document.createElement("option");
            option.value = color.name;
            option.textContent = color.name;
            el.lineColor.append(option);
        });
    }

    function renderSelectedLine() {
        const line = getSelectedLine();

        if (!line) {
            el.selectedLineDescription.textContent =
                "Select a lyric line above to choose its column and color.";
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
            (line.time === null
                ? " · Not timestamped"
                : ` · ${formatTimestamp(line.time)}`);

        el.selectedLineText.disabled = false;
        el.lineSinger.disabled = false;
        el.lineColor.disabled = false;
        el.applyLineButton.disabled = false;
        el.clearLineTimestampButton.disabled = false;

        el.selectedLineText.value = line.text;
        el.lineSinger.value = line.column;

        const wanted = line.color || "";
        let match = [...el.lineColor.options].find(
            o => o.value.toLowerCase() === wanted.toLowerCase()
        );

        if (!match) {
            match = document.createElement("option");
            match.value = wanted;
            match.textContent = HEX.test(wanted)
                ? `Custom ${wanted}`
                : `${wanted} (not declared)`;
            el.lineColor.append(match);
        }

        el.lineColor.value = match.value;
    }

    function buildResult() {
        return generate({
            metadata: state.metadata,
            colors: state.colors,
            lines: state.lines,
            header: state.header,
            footer: state.footer,
            audioDuration: getAudioDuration()
        });
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
        const result = buildResult();

        el.dlrcPreview.value = result.source;

        el.validationCount.textContent = result.issues.length
            ? `${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}`
            : "No validation issues";
        el.validationCount.removeAttribute("title");

        el.validationList.replaceChildren();

        for (const issue of result.issues) {
            const item = document.createElement("li");
            item.textContent = issue;
            el.validationList.append(item);
        }

        for (const note of state.importNotes) {
            const item = document.createElement("li");
            item.className = "is-note";
            item.textContent = `Import: ${note}`;
            el.validationList.append(item);
        }

        el.previewStatus.textContent = state.lines.length
            ? `${state.lines.length} lyric lines`
            : "Waiting for lyrics";
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

    function importSource(source) {
        if (typeof source !== "string" || !source.trim()) {
            throw new Error("The selected file is empty.");
        }

        const parsed = window.DLRC.Parser.parse(source);

        state.lines = parsed.lines;
        state.colors = parsed.colors;
        state.header = parsed.header;
        state.footer = parsed.footer;
        state.importNotes = parsed.issues;
        state.metadata = parsed.metadata;
        state.activeIndex = 0;
        state.selectedIndex = 0;

        for (const [key, id] of Object.entries(METADATA_FIELDS)) {
            el[id].value = parsed.metadata[key];
        }
        el.metaOffset.value = parsed.metadata.offset;

        lyricsInput.value = parsed.lines.map(line => line.text).join("\n");
        lyricsInput.dispatchEvent(new Event("input", { bubbles: true }));

        renderAll();

        return {
            importedLines: parsed.lines.length,
            preservedLines: parsed.header.length + parsed.footer.length,
            issues: parsed.issues
        };
    }

    function getLines() {
        return state.lines.map(line => ({ ...line }));
    }

    function getSource() {
        return el.dlrcPreview.value;
    }

    function validate() {
        return buildResult().issues;
    }

    return {
        init,
        getLines,
        getSource,
        importSource,
        validate,
        renderAll
    };
})();
