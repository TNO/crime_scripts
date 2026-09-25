# Documentation media production

The checked-in media must be reproducible without real case data.

## User-guide capture

1. Start the GUI:

   ```sh
   pnpm --dir packages/gui dev --host 127.0.0.1 --port 3498
   ```

2. Use a 1440×900 browser viewport and the Dutch public starter library.
3. Capture, in order:
   - the home page;
   - the `Phishing en betaalfraude` viewer;
   - the script editor without changing content;
   - the empty LLM brief;
   - a prompt generated from synthetic values, in dark theme.
4. Save the PNG files as `01-home.png` through
   `05-llm-prompt-dark.png` in `documentation/assets/user-guide/`.
5. Generate the silent WebM slideshow:

   ```sh
   printf "file '%s'\nduration 3\n" \
     "$PWD/documentation/assets/user-guide/01-home.png" \
     "$PWD/documentation/assets/user-guide/02-script-view.png" \
     "$PWD/documentation/assets/user-guide/03-script-edit.png" \
     "$PWD/documentation/assets/user-guide/04-llm-brief.png" \
     "$PWD/documentation/assets/user-guide/05-llm-prompt-dark.png" \
     > /tmp/pax-user-guide-concat.txt
   printf "file '%s'\n" \
     "$PWD/documentation/assets/user-guide/05-llm-prompt-dark.png" \
     >> /tmp/pax-user-guide-concat.txt
   ffmpeg -y -f concat -safe 0 -i /tmp/pax-user-guide-concat.txt \
     -vf "fps=24,scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p" \
     -c:v libvpx-vp9 -crf 36 -b:v 0 -an \
     documentation/assets/user-guide/pax-handleiding.webm
   rm /tmp/pax-user-guide-concat.txt
   ```

## Publication checks

- Verify every control name against the current Dutch interface.
- Open every relative link from `documentation/handleiding.nl.md`.
- Check the WebM with `ffprobe`.
- Ensure screenshots contain no restricted content, local paths, credentials,
  browser history, notifications, or personal bookmarks.
