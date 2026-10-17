
# DLRC Creator

DLRC Creator is a free, browser-based tool for creating, synchronizing, editing, importing, validating, and exporting Duet LRC (DLRC) lyric files.

It provides an audio player, line-by-line timestamping tools, song metadata editing, singer-column assignments, named lyric colors, and a live DLRC source preview. The goal is to make synchronized and duet lyrics easier to create for compatible music players, including AuralArc.

## Features

### Audio player
- Select an audio file from your device or drag and drop it into the editor.
- Play, pause, and seek through the song.
- Adjust playback speed for easier lyric synchronization.
- Keep audio processing local to the browser.

### Lyric synchronization
- Enter lyrics one line at a time.
- Timestamp lines using the current audio playback position.
- Navigate between lyric lines and retimestamp individual lines.
- Edit lyric text and clear incorrect timestamps.
- Use keyboard shortcuts for common synchronization actions.

### DLRC editor
- Edit title, artist, album, creator, and offset metadata.
- Assign each lyric line to a numbered singer column.
- Define reusable named colors using hexadecimal color values.
- Override the color of individual lyric lines.
- Preview generated DLRC text as edits are made.

### Import, validation, and export
- Import existing `.dlrc`, `.lrc`, and `.txt` files.
- Review imported lyric lines and metadata.
- Check for missing timestamps, invalid singer columns, invalid color definitions, and other issues.
- Copy the generated source to the clipboard.
- Download completed work as a UTF-8 `.dlrc` file.
- Review validation warnings before exporting.

Import compatibility depends on the syntax used by the source file. Unrecognized lines should be reviewed before exporting to avoid changing the meaning of an existing file.

### Responsive design
- Desktop-friendly editing workspace.
- Mobile-friendly layout and touch controls.
- Accessible form labels and keyboard navigation.
- Responsive controls for smaller screens.

## Privacy

DLRC Creator is designed for local browser processing. Audio files and lyric files are read by the browser on the user's device; the editor does not require an account or a server upload.

## DLRC syntax

DLRC Creator supports named color declarations and singer-column notation.

Example:

```text
[ti:Example Song]
[ar:Example Artist]
[#000DFF: blue]
[#FF0000: red]

[00:12.40]{0}<blue>First singer's line
[00:14.80]{1}<red>Second singer's line
[00:17.20]{0}Another blue singer line
```

Use the syntax supported by your target player. Validate imported or hand-edited files before relying on them in a music library.

## Getting started

1. Clone or download this repository.
2. Open `index.html` in a modern browser or use a local development server.
3. Choose an audio file.
4. Paste lyrics and add timestamps.
5. Configure metadata, singer columns, and colors.
6. Import or export DLRC files as needed.

No package manager or build step is required.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser-native audio playback and file handling

## Related project

[DLRC Library](https://github.com/KeiranGamingTV/dlrc-library) is a separate project for discovering and sharing DLRC lyric files.

## Contributing

Bug reports, accessibility improvements, and feature suggestions are welcome through GitHub issues and pull requests.

## License

See the repository's `LICENSE` file for licensing terms.
