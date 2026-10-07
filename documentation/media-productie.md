# Documentation media production

The checked-in media must be reproducible without real case data.

## User-guide capture

1. Start the GUI:

   ```sh
   pnpm --dir packages/gui dev --host 127.0.0.1 --port 3498
   ```

2. Use a 1440×900 browser viewport, the light theme, and the public starter
   library matching the interface language.
3. Capture, in order:
   - the home page;
   - the open application menu showing collection actions, role, language,
     and script mode;
   - the `Phishing en betaalfraude` viewer, including the compact scene
     navigation and taxonomy usage links;
   - the open **Meer acties** menu, including the script-sharing and
     barrier-model exports;
   - the script editor showing the scene/track and **+ M.O.** controls,
     without changing content;
   - the empty LLM brief;
   - a prompt generated from synthetic values, in light theme;
   - deterministic synthetic JSON pasted into PAX (start with the minimal
     valid example in the generated prompt; add a fictional scene and
     non-operational activity);
   - PAX's local validation preview before import;
   - case-analysis results for `beschadigd containerzegel` and
     `haventoegangspas`, showing one full match and one unmatched observation
     (scroll to the result card so both are visible);
   - an active learning-mode exercise.
4. Save eleven 1440×900 PNG files as `01-home.png` through
   `11-learning-mode.png` in `documentation/assets/user-guide/`. Open the
   sidebar and wait for its animation before capturing `08-menu.png`;
   similarly, wait for the script menu and button ripple to settle before
   `09-script-sharing.png` and `03-script-edit.png`. Move the pointer away
   from controls before capturing. The synthetic JSON
   must validate in the current wizard, and the screenshot must show the
   preview **before** import. Do not imply that a specific LLM generated it
   unless that interaction was genuinely captured.
5. Generate the silent WebM slideshow:

   ```sh
   printf "file '%s'\nduration 3\n" \
     "$PWD/documentation/assets/user-guide/01-home.png" \
     > /tmp/pax-user-guide-concat.txt
   printf "file '%s'\nduration 9\n" \
     "$PWD/documentation/assets/user-guide/08-menu.png" \
     >> /tmp/pax-user-guide-concat.txt
   printf "file '%s'\nduration 3\n" \
     "$PWD/documentation/assets/user-guide/02-script-view.png" \
     "$PWD/documentation/assets/user-guide/09-script-sharing.png" \
     "$PWD/documentation/assets/user-guide/03-script-edit.png" \
     "$PWD/documentation/assets/user-guide/04-llm-brief.png" \
     "$PWD/documentation/assets/user-guide/05-llm-prompt-light.png" \
     "$PWD/documentation/assets/user-guide/06-llm-json-paste.png" \
     >> /tmp/pax-user-guide-concat.txt
   printf "file '%s'\nduration 6\n" \
     "$PWD/documentation/assets/user-guide/07-llm-review.png" \
     >> /tmp/pax-user-guide-concat.txt
   printf "file '%s'\nduration 4\n" \
     "$PWD/documentation/assets/user-guide/10-case-analysis.png" \
     "$PWD/documentation/assets/user-guide/11-learning-mode.png" \
     >> /tmp/pax-user-guide-concat.txt
   printf "file '%s'\n" \
     "$PWD/documentation/assets/user-guide/11-learning-mode.png" \
     >> /tmp/pax-user-guide-concat.txt
   ffmpeg -y -f concat -safe 0 -i /tmp/pax-user-guide-concat.txt \
     -vf "fps=24,scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p" \
     -c:v libvpx-vp9 -crf 36 -b:v 0 -an -t 44 \
     documentation/assets/user-guide/pax-handleiding.webm
   rm /tmp/pax-user-guide-concat.txt
   ```
6. Keep `documentation/assets/user-guide/pax-handleiding.nl.vtt` aligned with
   the walkthrough. The menu slide remains visible from 3 through 12 seconds
   for the role, language/mode, and collection-sharing cues. The validation
   slide remains visible until 36 seconds, followed by case analysis until 40
   seconds and learning mode until 44 seconds. The in-app guide uses these
   timestamps for both captions and seekable steps.

### English walkthrough

Repeat the same sequence with the English interface and English starter
library (replace the local Dutch demo model in the capture browser first).
For the case screenshot, use `damaged container seal` and `port access pass`;
both currently match the English starter. Save the screenshots under
`documentation/assets/user-guide/en/`, keep
`pax-user-guide.en.vtt` aligned with the walkthrough, and generate
`pax-user-guide.webm`:

```sh
printf "file '%s'\nduration 3\n" \
  "$PWD/documentation/assets/user-guide/en/01-home.png" \
  > /tmp/pax-user-guide-en-concat.txt
printf "file '%s'\nduration 9\n" \
  "$PWD/documentation/assets/user-guide/en/08-menu.png" \
  >> /tmp/pax-user-guide-en-concat.txt
printf "file '%s'\nduration 3\n" \
  "$PWD/documentation/assets/user-guide/en/02-script-view.png" \
  "$PWD/documentation/assets/user-guide/en/09-script-sharing.png" \
  "$PWD/documentation/assets/user-guide/en/03-script-edit.png" \
  "$PWD/documentation/assets/user-guide/en/04-llm-brief.png" \
  "$PWD/documentation/assets/user-guide/en/05-llm-prompt-light.png" \
  "$PWD/documentation/assets/user-guide/en/06-llm-json-paste.png" \
  >> /tmp/pax-user-guide-en-concat.txt
printf "file '%s'\nduration 6\n" \
  "$PWD/documentation/assets/user-guide/en/07-llm-review.png" \
  >> /tmp/pax-user-guide-en-concat.txt
printf "file '%s'\nduration 4\n" \
  "$PWD/documentation/assets/user-guide/en/10-case-analysis.png" \
  "$PWD/documentation/assets/user-guide/en/11-learning-mode.png" \
  >> /tmp/pax-user-guide-en-concat.txt
printf "file '%s'\n" \
  "$PWD/documentation/assets/user-guide/en/11-learning-mode.png" \
  >> /tmp/pax-user-guide-en-concat.txt
ffmpeg -y -f concat -safe 0 -i /tmp/pax-user-guide-en-concat.txt \
  -vf "fps=24,scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p" \
  -c:v libvpx-vp9 -crf 36 -b:v 0 -an -t 44 \
  documentation/assets/user-guide/en/pax-user-guide.webm
rm /tmp/pax-user-guide-en-concat.txt
```

## Publication checks

- Verify every control name against the corresponding Dutch or English
  interface.
- Open every relative link from `documentation/handleiding.nl.md` and
  `documentation/user-guide.en.md`.
- Check both WebM files with `ffprobe`.
- Open both in-app guide routes and verify that matching captions are enabled
  by default, every step seeks to the corresponding slide, and the captions
  remain legible in light and dark themes.
- Ensure screenshots contain no restricted content, local paths, credentials,
  browser history, notifications, or personal bookmarks.
