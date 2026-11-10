# Visual manual editor

`manual-studio.js` mounts only in the manual workflow. It moves the existing canvas and output player into the editing desk; the original upload, stock, local ASR and export controls remain available in **Archivos y herramientas**.

The desk provides scene selection, seeking and playback from the current playhead; photo replacement for a specific scene; adjacent scene cut adjustment; cover/contain framing and photo motion; caption correction without regenerating audio; eight subtitle presets, size and position; and a shared audio-volume control. The waveform is calculated from the actual uploaded audio.

Text and timing corrections are marked as manual alignment so export respects them. Styles, framing and volume are read by the same renderer/audio graph used for HD export. A photo assigned to a scene takes precedence over an uploaded source video for that scene; other scenes continue showing the source video.

Undo retains up to 20 project adjustments during the editing session. It covers project properties and timing/text edits, not media-file replacement history. Studio callbacks are removed when the editor is rebuilt so they cannot continue controlling another project or the AI workflow.

Validation: `node tests/scene-edit.cjs`, existing cinematic/timing/export/production tests, and browser checks at a 390px viewport. Browser checks exercised inline caption correction, a single-scene photo replacement, scene cut adjustment/undo, playback/seek, volume changes and a real 720p WebM export.
