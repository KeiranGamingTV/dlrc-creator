"use strict";

window.DLRC = window.DLRC || {};

window.DLRC.MetadataEditor = (() => {
    const HEX = /^#[0-9a-f]{6}$/i;
    const BAD_NAME = /[\[\]<>:{}\r\n]/;

    const FIELDS = {
        title: "metaTitle",
        artist: "metaArtist",
        album: "metaAlbum",
        creator: "metaCreator",
        length: "metaLength",
        note: "metaNote"
    };

    function create({ getState, el, onChange, onPreviewChange, onToast }) {
        function init() {
            for (const [key, id] of Object.entries(FIELDS)) {
                el[id].addEventListener("input", () => {
                    getState().metadata[key] = el[id].value;
                    onPreviewChange();
                });
            }

            el.metaOffset.addEventListener("input", () => {
                const value = Number(el.metaOffset.value);
                getState().metadata.offset = Number.isFinite(value) ? value : 0;
                onPreviewChange();
            });

            el.addSingerButton.addEventListener("click", addColor);
        }

        function populate(metadata) {
            for (const [key, id] of Object.entries(FIELDS)) {
                el[id].value = metadata[key];
            }
            el.metaOffset.value = metadata.offset;
        }

        function addColor() {
            const state = getState();
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
            onChange();
            onToast(`Added color "${name}".`);
        }

        function changeColor(index, property, value) {
            const state = getState();
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

            onChange();
        }

        function removeColor(index) {
            const state = getState();
            const [removed] = state.colors.splice(index, 1);
            if (!removed) return;

            for (const line of state.lines) {
                if (line.color && line.color.toLowerCase() === removed.name.toLowerCase()) {
                    line.color = "";
                }
            }

            onChange();
        }

        function resolveColor(name) {
            if (HEX.test(name)) return name;
            const color = getState().colors.find(
                c => c.name.toLowerCase() === name.toLowerCase()
            );
            return color ? color.hex : "#A78BFA";
        }

        function renderColors() {
            const state = getState();
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
                remove.setAttribute("aria-label", `Remove color ${color.name}`);
                remove.addEventListener("click", () => removeColor(index));

                row.append(swatch, name, picker, remove);
                el.singerList.append(row);
            });
        }

        return { init, populate, renderColors, resolveColor };
    }

    return { create };
})();