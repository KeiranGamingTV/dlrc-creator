"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.Parser = (() => {
    const COLOR_DECL = /^\s*-?\s*\[(#[0-9a-f]{6}):\s*(.+?)\]\s*$/i;
    const META = /^\s*\[([a-z][a-z0-9_-]*):\s*(.*?)\s*\]\s*$/i;
    const LYRIC = /^\s*\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/;
    const HEX = /^#[0-9a-f]{6}$/i;

    const KEYS = {
        ti: "title", ar: "artist", al: "album", by: "creator",
        re: "note", length: "length", offset: "offset"
    };

    function parse(source) {
        const result = {
            metadata: {
                title: "", artist: "", album: "", creator: "",
                offset: 0, length: "", note: ""
            },
            colors: [],
            lines: [],
            header: [],
            footer: [],
            issues: []
        };

        const rows = String(source)
            .replace(/^\uFEFF/, "")
            .split(/\r\n|\r|\n/);

        const hasStructure = rows.some(row =>
            LYRIC.test(row) || META.test(row) || COLOR_DECL.test(row)
        );

        if (!hasStructure) {
            rows.forEach((row, i) => {
                if (!row.trim()) return;
                result.lines.push(makeLine(`import-${i}`, row.trim(), null, "1", ""));
            });
            result.issues.push(
                "No timestamps found, so the file was imported as plain lyrics. " +
                "Timestamp each line to finish it."
            );
            return result;
        }

        let sawLyric = false;
        const keep = raw => (sawLyric ? result.footer : result.header).push(raw);

        rows.forEach((raw, i) => {
            const n = i + 1;
            if (!raw.trim()) return;

            const decl = raw.match(COLOR_DECL);
            if (decl) {
                const name = decl[2].trim();
                if (result.colors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                    result.issues.push(`Line ${n}: duplicate color "${name}" was skipped.`);
                } else {
                    result.colors.push({ name, hex: decl[1].toUpperCase() });
                }
                return;
            }

            const lyric = raw.match(LYRIC);
            if (lyric) {
                const minutes = Number(lyric[1]);
                const seconds = Number(lyric[2]);

                if (seconds > 59) {
                    result.issues.push(`Line ${n}: seconds must be 00-59. Kept as raw text.`);
                    keep(raw);
                    return;
                }

                let rest = lyric[4];
                let token;
                let colorRaw = "";

                const t = rest.match(/^\{([^}]*)\}\s*/);
                if (t) {
                    token = t[1].trim();
                    rest = rest.slice(t[0].length);
                }

                const c = rest.match(/^<([^<>]+)>\s*/);
                if (c) {
                    colorRaw = c[1].trim();
                    rest = rest.slice(c[0].length);
                }

                const text = rest.trim();

                // A bare timestamp (for example a closing marker) is kept, not turned into a lyric.
                if (!text && token === undefined && !colorRaw) {
                    keep(raw);
                    return;
                }

                let column = "1";
                const upper = (token || "").toUpperCase();

                if (token === undefined) {
                    result.issues.push(`Line ${n}: no singer token, so it was set to Left (1).`);
                } else if (upper === "1" || upper === "2" || upper === "B") {
                    column = upper;
                } else {
                    result.issues.push(
                        `Line ${n}: {${token}} is not a valid singer token, so it was set to Left (1).`
                    );
                }

                if (/^\[\d{1,3}:\d{2}/.test(text)) {
                    result.issues.push(
                        `Line ${n}: multiple timestamps on one line are not supported.`
                    );
                }

                const fraction = lyric[3] ? Number(`0.${lyric[3]}`) : 0;
                const time = minutes * 60 + seconds + fraction;
                const color = HEX.test(colorRaw) ? colorRaw.toUpperCase() : colorRaw;

                sawLyric = true;
                result.lines.push(makeLine(`import-${i}`, text, time, column, color));
                return;
            }

            const meta = raw.match(META);
            if (meta) {
                const key = meta[1].toLowerCase();
                const value = meta[2];
                const field = KEYS[key];

                if (field === "offset") {
                    const offset = Number(value);
                    if (value.trim() !== "" && Number.isFinite(offset)) {
                        result.metadata.offset = offset;
                    } else {
                        result.issues.push(`Line ${n}: invalid offset. Kept as raw text.`);
                        keep(raw);
                    }
                } else if (field) {
                    result.metadata[field] = value;
                } else {
                    keep(raw);
                }
                return;
            }

            result.issues.push(`Line ${n}: unrecognized syntax was kept as raw text.`);
            keep(raw);
        });

        return result;
    }

    function makeLine(idBase, text, time, column, color) {
        return {
            id: `${idBase}-${Math.random().toString(36).slice(2, 8)}`,
            text, time, column, color
        };
    }

    return { parse };
})();
