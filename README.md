<p align="center">
  <img src="assets/icons/logo.png" alt="DLRC Creator logo" width="140" />
</p>

<h1 align="center">DLRC Creator</h1>

<p align="center">
  <strong>A free, browser-based tool for creating, synchronizing, and editing Duet LRC (.dlrc) files.</strong><br />
  Built for precise dual-vocal synchronization, custom column color mapping, and instant validation.
</p>

<p align="center">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black" />
  <img alt="Dependencies" src="https://img.shields.io/badge/dependencies-none-brightgreen" />
  <img alt="Status" src="https://img.shields.io/badge/status-active%20development-orange" />
  <img alt="License" src="https://img.shields.io/badge/license-TBD-lightgrey" />
</p>

<p align="center">
  <strong>- - - Like my work? ❤️ - - -</strong><br />
  <strong><a href="https://ko-fi.com/therealkdude">Buy me a coffee on Ko-fi</a></strong><br />
</p>

> [!NOTE]
> Live web application available at: **[https://dlrc-creator.vercel.app](https://dlrc-creator.vercel.app)**

---

## About DLRC Creator

DLRC Creator is a zero-dependency, client-side web application designed to simplify creating and synchronizing duet lyrics. Load an audio file, paste your text, and easily assign timestamps, duet columns, and custom colors as the song plays.

Files generated follow the official [DLRC specification](https://github.com/KeiranGamingTV/Duet-LRC-Lyric-File) and are fully compatible with DLRC-aware players such as **AuralArc** and community repositories like **DLRC Library**.

> [!IMPORTANT]
> DLRC Creator processes all audio files and lyrics locally within your browser. No files are uploaded to remote servers, ensuring total privacy.

---

## Features

### Audio & Synchronization
* Select audio via local file picker or drag-and-drop.
* Adjustable playback speed controls (**0.5x to 2.0x**) for fine-tuned timestamp accuracy.
* One-click timestamping with stepping controls to edit or re-timestamp individual lines.
* Full keyboard shortcut support for hands-free workflow.

### Duet Columns & Custom Styling
* Column assignment options:
  * **Left (`{1}`)**: Primary/Singer 1
  * **Right (`{2}`)**: Secondary/Singer 2
  * **Center (`{B}`)**: Both singers
* Define custom named hex colors or apply direct hex values per line.
* Global renaming/updating of defined colors automatically updates all referencing lyric lines.

### Metadata Management
* Form fields for Title, Artist, Album, Creator, Offset (ms), and Notes.
* Automatic `[length: m:ss]` calculation based on loaded audio files (overridable).

### Import, Export & Diagnostics
* Import `.dlrc`, `.lrc`, and standard `.txt` text files.
* Unrecognized lines are safely preserved as raw text without silent deletion.
* Built-in validator checks for:
  * Missing Title or Artist required by DLRC Library.
  * Untimestamped lines or out-of-order timestamps.
  * Duplicate color names, invalid hex structures, and unclosed brackets (`]`).
* Export directly to clipboard or download as standard UTF-8 `.dlrc` files.

---

## Keyboard Shortcuts

Shortcuts are disabled automatically when focus is inside text input fields.

| Key | Action |
| --- | --- |
| `Space` | Play or pause audio playback |
| `Enter` | Set timestamp on active line and advance |
| `Up` / `Down` | Navigate to previous or next lyric line |

---

## DLRC Format at a Glance

The Creator outputs files adhering strictly to the DLRC format specification:

```text
[ti:Song Title]
[ar:Song Artist]
[al:Album Title]
[length: 3:35]
- [#000DFF: blue]
- [#FF0000: red]
- [#00FF00: lime]

[00:10.15]{1}<blue> Singer 1 sings this line, and it's colored blue.
[00:15.40]{2}<red> Singer 2 sings this line, and it's colored red.
[00:20.80]{B}<lime> Both singers sing this line, and it's colored lime.
[00:23.76]{1}<#FF8000> Hex colors can also be used directly.
[00:28.12]{2} No color: the player uses the default for the right column.
