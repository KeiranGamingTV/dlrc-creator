
"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.IO = (() => {
    let fileInput;
    let importButton;
    let downloadButton;
    let copyButton;
    let preview;
    let status;
    let validation;
    let onToast = () => {};

    function init(options = {}) {
        onToast = options.onToast || (() => {});

        fileInput = document.getElementById("dlrcFileInput");
        importButton = document.getElementById("importDlrcButton");
        downloadButton = document.getElementById("downloadDlrcButton");
        copyButton = document.getElementById("copyDlrcButton");
        preview = document.getElementById("dlrcPreview");
        status = document.getElementById("previewStatus");
        validation = document.getElementById("validationCount");

        importButton.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", handleImport);
        downloadButton.addEventListener("click", downloadFile);

        // Existing editor copy handling remains the single source of truth.
        copyButton.addEventListener("click", () => {
            if (!preview.value.trim()) {
                onToast("There is no DLRC source to copy yet.");
            }
        });
    }

    async function handleImport() {
        const file = fileInput.files?.[0];
        fileInput.value = "";

        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            onToast("Please choose a DLRC file smaller than 5 MB.");
            return;
        }

        try {
            const source = await file.text();
            const result = window.DLRC.Editor.importSource(source);

            status.textContent = `Imported ${result.importedLines} lyric lines`;

            if (result.issues.length) {
                validation.textContent =
                    `${result.issues.length} import issue(s)`;
                validation.title = result.issues.join("\n");
                onToast(
                    `Imported with ${result.issues.length} issue(s). Review the source and validation details.`
                );
            } else {
                onToast(`Imported "${file.name}".`);
            }
        } catch (error) {
            onToast(`Could not import file: ${error.message}`);
        }
    }

    function downloadFile() {
        const editor = window.DLRC.Editor;
        const source = editor.getSource();

        if (!source.trim()) {
            onToast("There is no DLRC source to download.");
            return;
        }

        const issues = editor.validate();

        if (issues.length) {
            const proceed = window.confirm(
                `Validation found ${issues.length} issue(s):\n\n` +
                issues.slice(0, 8).join("\n") +
                (issues.length > 8 ? "\n…" : "") +
                "\n\nDownload the file anyway?"
            );

            if (!proceed) return;
        }

        const title = document.getElementById("metaTitle").value.trim();
        const filename = makeFilename(title || "untitled");

        const blob = new Blob(
            ["\uFEFF", source.replace(/\r\n|\r/g, "\n")],
            { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${filename}.dlrc`;
        link.style.display = "none";

        document.body.append(link);
        link.click();
        link.remove();

        window.setTimeout(() => URL.revokeObjectURL(url), 1000);

        onToast(`Downloading "${filename}.dlrc".`);
    }

    function makeFilename(value) {
        const cleaned = value
            .normalize("NFKC")
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/[. ]+$/g, "")
            .slice(0, 100);

        return cleaned || "untitled";
    }

    return { init };
})();
