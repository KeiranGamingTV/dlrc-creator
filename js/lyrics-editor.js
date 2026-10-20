"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.LyricsEditor = (() => {
    const { COLUMNS, formatTimestamp } = window.DLRC.Generator;

    const HEX = /^#[0-9a-f]{6}$/i;
    const COLUMN_COLORS = { "1": "#8AB8FF", "2": "#FF9EC4", "B": "#A78BFA" };
    const COLUMN_TAGS = { "1": "L", "2": "R", "B": "C" };
    const COLUMN_LABELS = Object.fromEntries(COLUMNS.map(c => [c.value, c.label]));

    function create({ getState, el, engine, resolveColor, onChange, onToast }) {
        const lyricsInput = el.lyricsInput;

        function createId() {
            return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }

        function getSelectedLine() {
            const state = getState();
            return state.lines[state.selectedIndex] || null;
        }

        function syncFromTextarea() {
            const state = getState();
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

            onChange();
        }

        function applySelectedLine() {
            const state = getState();
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

            onChange();
            onToast("Lyric line updated.");
        }

        function lineBorderColor(line) {
            return line.color
                ? resolveColor(line.color)
                : (COLUMN_COLORS[line.column] || COLUMN_COLORS["1"]);
        }

        function renderList() {
            const state = getState();
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
                timestamp.setAttribute(
                    "aria-label",
                    `Select line ${index + 1}, ${line.time === null ? "no timestamp" : "timestamp " + formatTimestamp(line.time)}`
                );
                timestamp.addEventListener("click", () => engine.selectLine(index));

                const text = document.createElement("button");
                text.type = "button";
                text.className = "sync-line-text";

                const tag = document.createElement("span");
                tag.className = "sync-line-col";
                tag.textContent = COLUMN_TAGS[line.column] || "?";
                tag.setAttribute("aria-hidden", "true");
                text.setAttribute(
                    "aria-label",
                    `Line ${index + 1}, ${COLUMN_LABELS[line.column] || "no column"}: ${line.text}`
                );

                text.append(tag, document.createTextNode(line.text));
                text.style.borderLeftColor = lineBorderColor(line);
                text.addEventListener("click", () => engine.selectLine(index));

                const retimestamp = document.createElement("button");
                retimestamp.type = "button";
                retimestamp.className = "sync-line-retimestamp";
                retimestamp.textContent = "Set";
                retimestamp.title = "Timestamp this line at the current position";
                retimestamp.setAttribute("aria-label", `Set timestamp for line ${index + 1}`);
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

        function renderSelected() {
            const state = getState();
            const line = getSelectedLine();

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

        function setText(lines) {
            lyricsInput.value = lines.map(line => line.text).join("\n");
            lyricsInput.dispatchEvent(new Event("input", { bubbles: true }));
        }

        function init() {
            el.lineSinger.replaceChildren();
            for (const column of COLUMNS) {
                const option = document.createElement("option");
                option.value = column.value;
                option.textContent = column.label;
                el.lineSinger.append(option);
            }

            lyricsInput.addEventListener("input", syncFromTextarea);
            el.applyLineButton.addEventListener("click", applySelectedLine);

            el.lineSinger.addEventListener("change", () => {
                const line = getSelectedLine();
                if (!line) return;
                line.column = el.lineSinger.value;
                onChange();
            });

            el.lineColor.addEventListener("change", () => {
                const line = getSelectedLine();
                if (!line) return;
                line.color = el.lineColor.value;
                onChange();
            });
        }

        return { init, renderList, renderSelected, setText, getSelectedLine };
    }

    return { create };
})();