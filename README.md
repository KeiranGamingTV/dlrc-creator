# DLRC Creator

DLRC Creator is a free, browser-based tool for creating, synchronizing, editing, importing, validating, and exporting Duet LRC (DLRC) lyric files.

Load a song, paste your lyrics, timestamp each line as the music plays, then choose a column and an optional color for every line. The generated file follows the [DLRC specification](https://github.com/KeiranGamingTV/Duet-LRC-Lyric-File) and works with DLRC-aware players such as AuralArc and with the DLRC Library.

Live site: https://dlrc-creator.vercel.app

## Features

### Audio and synchronization

- Choose an audio file from your device or drag and drop it in.
- Play, pause, and seek, with adjustable playback speed (0.5x to 2.0x) for more accurate timestamps.
- Timestamp each line at the current playback position, then step through lines or re-timestamp any single line.
- Keyboard shortcuts for hands-free syncing.

### Duet columns and colors

- Assign every line to **Left (1)**, **Right (2)**, or **Center (B)**.
- Define named colors with hex values and apply them per line, or leave a line without a color so the player uses its default for that column.
- Renaming or removing a color updates every line that uses it.

### Metadata

- Title, artist, album, creator, offset (milliseconds), and an optional note.
- `[length: m:ss]` is filled in automatically from the audio file. Type a value in the Length field to override it.

### Import, validation, and export

- Import `.dlrc`, `.lrc`, and `.txt` files. Plain text becomes untimestamped lyrics, and standard LRC lines default to the Left column.
- Lines the editor does not recognize are kept as raw text and listed under the preview instead of being silently dropped.
- Validation details are listed under the preview. It checks for:
  - a missing title or artist (both required by the DLRC Library)
  - lines without timestamps (these are left out of the file)
  - timestamps out of order or past the declared length
  - invalid columns, duplicate or invalid color names, bad hex values, and undefined color references
  - a `]` inside a metadata value
- Copy the generated source or download it as a UTF-8 `.dlrc` file. You are asked to confirm if validation found issues.

## DLRC format at a glance

The full specification lives in the [Duet-LRC-Lyric-File](https://github.com/KeiranGamingTV/Duet-LRC-Lyric-File) repository. The Creator writes files like this:

```
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
```

- Every lyric line has exactly one timestamp, `[mm:ss.xx]`, followed immediately by `{1}`, `{2}`, or `{B}`.
- `{1}` is the left column, `{2}` is the right column, and `{B}` is the center column.
- Colors are declared in the header as `- [#HEX: name]` and used on a line as `<name>` or `<#HEX>`.

## Keyboard shortcuts

Shortcuts are ignored while you are typing in a text field, and they never override a focused button.

| Key | Action |
| --- | --- |
| Space | Play or pause |
| Enter | Timestamp the active line and advance |
| Up / Down | Previous or next line |

## Getting started

1. Clone or download this repository.
2. Open `index.html` in a modern browser, or serve the folder with any static file server.
3. Choose an audio file and paste your lyrics.
4. Play the song and press **Set timestamp** (or Enter) as each line begins.
5. Fill in the metadata, then pick a column and optional color for each line.
6. Download the `.dlrc` file.

There are no dependencies and no build step.

## Project structure

```
dlrc-creator/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js             startup and toast messages
│   ├── audio-player.js    audio loading, seeking, playback speed
│   ├── dlrc-parser.js     reads .dlrc / .lrc / .txt source
│   ├── dlrc-generator.js  writes DLRC source and runs validation
│   ├── dlrc-editor.js     lyric lines, colors, metadata, preview
│   └── dlrc-io.js         import, copy, and download
└── assets/icons/
```

## Compatibility

- **AuralArc** reads `{1}`, `{2}`, and `{B}`, color declarations that start with `- `, and `<name>` or `<#HEX>` colors.
- **DLRC Library** requires a title and an artist, uses `[length:]` to identify songs, and expects timestamps in order.

## Privacy

Audio and lyric files are processed in your browser. Nothing is uploaded, and no account is needed.

## Related projects

- [Duet-LRC-Lyric-File](https://github.com/KeiranGamingTV/Duet-LRC-Lyric-File): the DLRC specification.
- [DLRC Library](https://github.com/KeiranGamingTV/dlrc-library): discover and share DLRC lyric files.

## Contributing

Bug reports, accessibility improvements, and feature suggestions are welcome through GitHub issues and pull requests.

## License

A license has not been chosen yet.
