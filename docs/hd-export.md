# Synchronized HD export

Both workflows use `scripts/video-export.js` and the same canvas, audio clock and subtitle timeline.

- 1080p: 1080 × 1920 portrait, 1920 × 1080 landscape; 8 Mbps target.
- 720p: 720 × 1280 portrait, 1280 × 720 landscape; 5 Mbps target.
- Native H.264/AAC MP4 and native WebM encoding are preferred. MP4 recordings that lack H.264 are transcoded to H.264/AAC for compatibility. Unsupported output containers are converted in a single-thread FFmpeg worker. The file extension is never used as a substitute for conversion.
- WebM duration metadata is repaired using the locally vendored MIT-licensed `fix-webm-duration` 1.0.6. Its license is included beside the source.
- FFmpeg core 0.12.10 is downloaded only when conversion or fallback audio extraction is needed. Whisper model files are downloaded on the first local speech analysis. Media stays on the device for these operations.
- A file must pass container, dimensions and duration checks before its download link appears. Export stops if the page becomes hidden during recording; partial output is not offered as a completed video.

## Workflows

AI creation runs photos → narration → validated speech alignment → HD export. Missing photos, failed narration or failed alignment stop the sequence; completed media is retained for retry. Both AI export buttons invoke this sequence.

Manual editing analyzes uploaded/recorded audio locally. Empty script scenes receive recognized speech and word timestamps; an existing complete script is aligned without rewriting it. Script/audio mismatches require correction or retry. Uploaded video audio is extracted automatically. Added photos retain their order and are assigned cuts on the speech timeline. Manual timing corrections remain available and are respected by preview/export.

Speech transcription is probabilistic: recognition text should be reviewed. Cloud generation still depends on the configured providers, valid private code and available quota. Browser recording and local conversion depend on device resources.

## Validation

Run from repository root:

```
node tests/local-speech.cjs
node tests/media-timing.mjs
node tests/cinematic-video.cjs
node tests/video-export.cjs
node tests/production-pipeline.cjs
```

Browser checks covered real 1080 × 1920 MP4 capture, 720 × 1280 WebM with an Opus audio track, finite WebM duration, local ASR from audio, extraction/ASR from an uploaded MP4, and fallback WebM → MP4 conversion. Provider calls were not made with production credentials during these checks.
