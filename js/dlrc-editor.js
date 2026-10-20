"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.Editor = (() => {
    const { generate } = window.DLRC.Generator;

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
    let onToast = () => {};
    let renderQueued = false;
    let engine;
    let lyrics;
    let metadata;

    function init(options = {}) {
        onToast = options.onToast || (() => {});

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

        const toast = message => onToast(message);

        engine = window.DLRC.TimestampEngine.create({
            getState: () => state,
            getAudio,
            onChange: renderAll,
            onToast: toast
        });

        metadata = window.DLRC.MetadataEditor.create({
            getState: () => state,
            el,
            onChange: renderAll,
            onPreviewChange: scheduleRender,
            onToast: toast
        });

        lyrics = window.DLRC.LyricsEditor.create({
            getState: () => state,
            el,
            engine,
            resolveColor: name => metadata.resolveColor(name),
            onChange: renderAll,
            onToast: toast
        });

        engine.attachKeyboard();
        lyrics.init();
        metadata.init();

        el.timestampButton.addEventListener("click", engine.stampActive);
        el.previousLineButton.addEventListener("click", () => engine.moveActive(-1));
        el.nextLineButton.addEventListener("click", () => engine.moveActive(1));
        el.clearLineTimestampButton.addEventListener("click", engine.clearSelected);
        el.copyDlrcButton.addEventListener("click", copySource);

        // The [length:] tag follows the audio duration when the field is blank.
        const audio = getAudio();
        if (audio) {
            for (const type of ["loadedmetadata", "durationchange"]) {
                audio.addEventListener(type, scheduleRender);
            }
        }

        renderAll();
    }

    function getAudio() {
        return window.DLRC.AudioPlayer.getAudioElement();
    }

    function getAudioDuration() {
        const audio = getAudio();
        return audio && Number.isFinite(audio.duration) ? audio.duration : null;
    }

    function renderAll() {
        lyrics.renderList();
        metadata.renderColors();
        lyrics.renderSelected();
        renderPreview();
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
        if (!el.dlrcPreview.value.trim()) {
            onToast("There is no DLRC source to copy yet.");
            return;
        }

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

        metadata.populate(parsed.metadata);
        lyrics.setText(parsed.lines);

        renderAll();

        return {
            importedLines: parsed.lines.length,
            preservedLines: parsed.header.length + parsed.footer.length,
            issues: parsed.issues
        };
    }

    function hasWork() {
        const m = state.metadata;

        return state.lines.length > 0 ||
            [m.title, m.artist, m.album, m.creator, m.length, m.note]
                .some(value => String(value).trim() !== "") ||
            m.offset !== 0;
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
        hasWork,
        validate,
        renderAll
    };
})();