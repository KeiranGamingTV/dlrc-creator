
# DLRC Creator

**DLRC Creator** is a free, browser-based editor for creating, synchronizing, and editing Duet LRC (DLRC) lyric files.

The project is designed for people who want to synchronize lyrics to their music, assign vocal parts to different singers, customize lyric colors, and export files for compatible music players such as AuralArc.

DLRC Creator is a standalone project, separate from [DLRC Library](https://github.com/KeiranGamingTV/dlrc-library), which focuses on finding, sharing, and downloading lyric files.

## Features

### Audio playback

- Select audio files from your device or drag and drop them into the editor.
- Play, pause, and seek through the track.
- Adjust playback speed to make lyric synchronization easier.
- Process audio locally in the browser without uploading the music to a server.

Audio format support depends on the browser and its available codecs.

### Lyric synchronization

- Paste or type lyrics, with each line on a separate row.
- Timestamp lyric lines using the current playback position.
- Navigate between lines and correct individual timestamps.
- Use keyboard shortcuts to synchronize lyrics efficiently.
- Review which lines have timestamps and which still need work.

### Duet LRC editing

- Add metadata such as song title, artist, album, and creator.
- Assign lyrics to numbered singer columns.
- Define named colors using hexadecimal color values.
- Apply a singer's default color or override the color of an individual lyric line.
- Preview the generated DLRC text while editing.

### File generation and validation

- Generate DLRC source text from the editor.
- Review formatting and identify missing timestamps or other validation issues.
- Copy the generated source.
- Export finished lyrics as `.dlrc` files.
- Import existing DLRC files for further editing.

### Responsive interface

- Desktop-friendly editing workspace.
- Mobile-friendly layout and touch controls.
- Accessible labels and keyboard navigation.
- Responsive layouts for different screen sizes.

### Privacy

DLRC Creator is designed around local browser processing. Audio files do not need to be uploaded to a server to create synchronized lyric files.

Any future cloud integrations, if introduced, should clearly disclose what data is sent and why.

## DLRC format

DLRC Creator supports the Duet LRC conventions used by compatible players, including named color declarations and per-line singer columns.

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

The example illustrates the intended syntax. Always validate the generated file against the exact DLRC conventions supported by your target player.

## Getting started

1. Clone or download this repository.
2. Open `index.html` in a modern browser, or serve the project using a local development server.
3. Select an audio file.
4. Enter your lyrics and synchronize them to the music.
5. Configure metadata, singer columns, and colors.
6. Review the generated DLRC source and export the finished file.

No package manager or build step is required for the static website.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser-native audio playback and file handling

## Related project

[DLRC Library](https://github.com/KeiranGamingTV/dlrc-library) — a separate project for discovering and sharing DLRC lyric files.

## Development and contributions

Contributions, bug reports, accessibility improvements, and suggestions are welcome. Please open an issue or pull request in this repository.

## License

The project license should be specified in the repository's `LICENSE` file.
