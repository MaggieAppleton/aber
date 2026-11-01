# Media validation

The image and transcription paths now share `agents/media-process.ts`. It checks the first 4 KiB of an opened regular file, chooses an allowed container, and forces that demuxer for both FFprobe and FFmpeg. Unsupported headers, including the empty manifests tested below, fail before either decoder starts.

The input is inherited as a seekable file descriptor. `protocol_whitelist=fd` excludes nested file and network protocols; MOV external references and absolute paths are explicitly disabled. The same descriptor is inspected and passed to the child, avoiding a second path lookup between validation and decoding. Images accept JPEG, PNG, WebP, GIF and recognised HEIC/AVIF brands. Audio accepts MP3, WAV, FLAC, OGG, Matroska/WebM and recognised M4A/MP4-family brands.

| Bound | Policy |
| --- | --- |
| Input | Nonempty regular file, at most 512 MiB; symlinks rejected |
| Frames and samples | 64 million pixels; one million samples per decoded audio frame |
| Allocation and parallelism | 256 MiB per FFmpeg allocation; two codec/filter threads |
| Probe work | 5 MB probe size, five-second analysis window, 16 streams, 2,500 probe packets |
| Child deadline | 30 seconds for image/probe; 120 seconds for silence scanning; 60 seconds per audio chunk |
| Child output | Combined stdout/stderr capped at 8 MB; audio metadata capped at 100 KB |
| Audio | At most 24 hours; existing silence-aware eight-minute boundaries retained; chunk output capped at 24 MB |

Deadline expiry, cancellation and excess output kill the child. The wrapper waits for child closure, clears its timer and abort listener, and closes the input descriptor. Transcription retains its temporary-directory cleanup. Image preparation continues to emit one JPEG bounded to 1,600 pixels per dimension.

The final full check, `cd app && npm run typecheck && npm test`, passed: **46 test files, 233 tests**. Media coverage included:

- Real synthetic JPEG, PNG, GIF, AVIF, WebP and HEIC decoding. HEIC used macOS `sips`; that test runs only on macOS.
- Real synthetic M4A/AAC, MP3, WAV/PCM, WebM/Opus, OGG/Opus and FLAC, each both probed and decoded through the shared policy.
- An 8,000 × 6,000 JPEG: the regression failed under the initial 40 MP guard and passed after raising it to 64 MP. This accommodates 48 MP phone photos while retaining a frame limit.
- The existing large-image test: a 4,096 × 2,048 PNG became a 1,600 × 800 JPEG. Existing long-audio boundary tests passed.
- Unsupported image/audio manifests, an already-aborted image operation, image and audio-probe deadlines, cancellation during audio decoding, and an image-output byte cap. The format, image deadline/abort/output-cap and 48 MP regressions were observed failing before their fixes.
- A separate local check copied the repository's synthetic demo voice fixture into its own temporary directory and decoded it successfully, without transcription.

All new fixtures were generated from colour fields or sine waves, embedded tiny synthetic rasters, or empty manifests without paths, URLs or media references. Tests used temporary directories and removed them. No private files, network media, paid provider calls or exploit payloads were used.

This requires local FFmpeg/FFprobe with the `fd` protocol and the relevant codecs; validation used **8.0.1**. Unusual valid container layouts or unsupported local codecs can still be rejected. `max_alloc` limits individual allocations, not total process memory. These decoder restrictions and deadlines are **not a general process sandbox**.

References checked: installed `ffmpeg -h full`, `ffprobe -h full`, MOV/image2 demuxer help and `fd`/`pipe` protocol help; FFmpeg's primary [format options](https://github.com/FFmpeg/FFmpeg/blob/master/doc/formats.texi), [protocol documentation](https://github.com/FFmpeg/FFmpeg/blob/master/doc/protocols.texi) and [command-line documentation](https://github.com/FFmpeg/FFmpeg/blob/master/doc/ffmpeg.texi). The project-owned GitHub documentation was used after ffmpeg.org fetches timed out.
