"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.Generator = (() => {
    const COLUMNS = [
        { value: "1", label: "Left (1)" },
        { value: "2", label: "Right (2)" },
        { value: "B", label: "Center (B)" }
    ];

    const HEX = /^#[0-9a-f]{6}$/i;
    const BAD_NAME = /[\[\]<>:{}\r\n]/;
    const pad = value => String(value).padStart(2, "0");

    function formatTimestamp(seconds) {
        const total = Math.round(seconds * 100);
        const minutes = Math.floor(total / 6000);
        const rest = total % 6000;
        return `${pad(minutes)}:${pad(Math.floor(rest / 100))}.${pad(rest % 100)}`;
    }

    function formatLength(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return "";
        const total = Math.round(seconds);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        return hours > 0
            ? `${hours}:${pad(minutes)}:${pad(secs)}`
            : `${minutes}:${pad(secs)}`;
    }

    function parseLength(value) {
        const match = String(value).trim().match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
        if (!match) return null;
        return match[3] !== undefined
            ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
            : Number(match[1]) * 60 + Number(match[2]);
    }

    function generate(model) {
        const meta = model.metadata;
        const colors = model.colors || [];
        const lines = model.lines || [];
        const issues = [];
        const head = [];

        const addTag = (key, label, value, required) => {
            const text = String(value || "").replace(/[\r\n]+/g, " ").trim();
            if (!text) {
                if (required) issues.push(`${label} is missing. DLRC Library requires it.`);
                return;
            }
            if (text.includes("]")) {
                issues.push(`${label} contains "]", which breaks the tag.`);
            }
            head.push(`[${key}:${text}]`);
        };

        addTag("ti", "Title", meta.title, true);
        addTag("ar", "Artist", meta.artist, true);
        addTag("al", "Album", meta.album, false);
        addTag("by", "Creator", meta.creator, false);

        const typed = String(meta.length || "").trim();
        let lengthText = "";

        if (typed) {
            if (parseLength(typed) === null) {
                issues.push(`Length "${typed}" must look like 3:35 or 1:02:03.`);
            } else {
                lengthText = typed;
            }
        } else {
            lengthText = formatLength(model.audioDuration);
        }

        const lengthSeconds = lengthText ? parseLength(lengthText) : null;
        if (lengthText) head.push(`[length: ${lengthText}]`);

        if (Number.isFinite(meta.offset) && meta.offset !== 0) {
            head.push(`[offset:${Math.trunc(meta.offset)}]`);
        }

        addTag("re", "Note", meta.note, false);
        head.push(...(model.header || []));

        const known = new Map();
        const seen = new Set();

        colors.forEach(color => {
            const name = String(color.name || "").trim();
            const lower = name.toLowerCase();

            if (!name || BAD_NAME.test(name)) {
                issues.push(`Invalid color name "${name}".`);
            } else if (seen.has(lower)) {
                issues.push(`Duplicate color name "${name}".`);
            } else if (!HEX.test(color.hex)) {
                issues.push(`Invalid hex color for "${name}".`);
            } else {
                seen.add(lower);
                known.set(lower, name);
                head.push(`- [${color.hex.toUpperCase()}: ${name}]`);
            }
        });

        const body = [];
        let previous = null;

        lines.forEach((line, index) => {
            const n = index + 1;

            if (!line.text.trim()) {
                issues.push(`Line ${n} is empty. Players skip empty lyric lines.`);
            }
            if (/[\r\n]/.test(line.text)) {
                issues.push(`Line ${n} contains a line break.`);
            }
            if (line.time === null) {
                issues.push(`Line ${n} has no timestamp and is left out of the file.`);
                return;
            }
            if (!Number.isFinite(line.time) || line.time < 0) {
                issues.push(`Line ${n} has an invalid timestamp.`);
                return;
            }
            if (!COLUMNS.some(c => c.value === line.column)) {
                issues.push(`Line ${n} has an invalid column.`);
                return;
            }
            if (previous && line.time < previous.time) {
                issues.push(`Line ${n} is earlier than line ${previous.n}. Keep timestamps in order.`);
            }
            previous = { time: line.time, n };

            let colorTag = "";
            if (line.color) {
                if (HEX.test(line.color)) {
                    colorTag = `<${line.color.toUpperCase()}>`;
                } else {
                    const declared = known.get(line.color.toLowerCase());
                    if (declared) {
                        colorTag = `<${declared}>`;
                    } else {
                        issues.push(`Line ${n} uses undefined color "${line.color}".`);
                    }
                }
            }

            body.push(
                `[${formatTimestamp(line.time)}]{${line.column}}${colorTag} ${line.text}`
            );
        });

        if (lengthSeconds !== null) {
            const late = lines.findIndex(
                l => l.time !== null && l.time > lengthSeconds + 1
            );
            if (late !== -1) {
                issues.push(`Line ${late + 1} is after the declared length (${lengthText}).`);
            }
        }

        const out = [...head];
        if (head.length && body.length) out.push("");
        out.push(...body, ...(model.footer || []));

        return { source: out.join("\n"), issues, lineCount: body.length };
    }

    return { COLUMNS, generate, formatTimestamp, formatLength, parseLength };
})();
