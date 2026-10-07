# PAX user guide

This guide covers the menu, sharing and loading, the standard user journey,
editing a crime script, and the LLM wizard. The images use public starter
content and synthetic test data.

<!-- PAX_GUIDE_VIDEO -->

## 1. Menu, role, language, and script mode

PAX stores the workspace locally in the browser. On first use, choose the
English starter library, an empty workspace, or your own JSON model. Open the
menu in the top-left corner to configure the workspace and view.

First select the role that matches your task:

- **User**: view, search, and export scripts.
- **Editor**: also edit and delete existing scripts.
- **Administrator**: additionally create scripts, use the LLM wizard, and edit
  shared taxonomy such as roles, attributes, and locations.

You can only edit a script after selecting **Editor** or **Administrator**.
Only an **Administrator** can add or change roles and other shared taxonomy.
The role selector is prototype behavior in the browser, not authentication or
access control.

Use **Language** to select the interface language and the language of a starter
library imported later. Existing scripts are not translated automatically.

Use **Script mode** to switch between:

- **Public mode**: shows and exports public scripts only.
- **Restricted mode**: shows a restricted counterpart where one is available.
  Exporting requires additional confirmation; a permanent link is unavailable
  while the model contains restricted content.

Script mode is not access control either. Share restricted information only
through an appropriately secured channel.

![Menu with workspace actions, role, language, and script mode](assets/user-guide/en/08-menu.png)

## 2. Import, export, and share

The menu contains actions for the complete workspace:

- **Download model as JSON** creates an editable export of the collection. In
  public mode it contains public scripts only.
- **Upload model as JSON** makes the selected file the current local
  workspace. Export the existing workspace first if it must be retained.
- **Create permanent link** copies a URL containing the public model. Its
  recipient opens a copy in their own browser. Permanent links are disabled
  for models containing restricted content.

For one script, open **More actions** on that script:

- **Export to JSON** creates an editable file containing the script and its
  required taxonomy.
- **Export to Word** creates a reading report; it is not an editable PAX model.
- **Share this script as a link** copies a ZIP-compressed, URL-safe link
  containing the JSON for this one public script and its required taxonomy.
  Recipients can review it as a preview and select **Merge current script** to
  add it to their workspace without replacing their collection. This action
  is unavailable for restricted scripts. Large scripts may produce links too
  long for some email clients.

The recipient selects **Upload model as JSON** to open a collection or
single-script file. This replaces the current local workspace; it does not
merge arbitrary files automatically. A shared script link instead opens a
preview. Before sharing, always check the
classification and filename, and use a secure channel for restricted files.

![Script actions for focused JSON and Word export](assets/user-guide/en/09-script-sharing.png)

## 3. View a script

1. Search for or filter a script on the home page.
2. Open it by selecting the card or the **more** action.
3. Select a track when the script contains multiple routes.
4. Select a modus operandi in a scene to view an alternative process route.
5. Use the role pills below activities to highlight activities for one role.
6. Open a pill under **Related crime scripts** to navigate directly to a
   linked process.
7. Expand roles, attributes, transports, locations, and sources when those
   details are needed.

![Viewer for Phishing and payment fraud](assets/user-guide/en/02-script-view.png)

## 4. Edit a script

Select **Edit script**. The editor contains a scene overview and details for
the selected scene.

1. Open **Script details** to change the title, description, language,
   classification, products, geography, and references.
2. Add scenes or change their order in the overview.
3. Edit each scene's modus operandi, description, and location.
4. Add activities and link roles, attributes, transports, and, where needed,
   one or more related crime scripts. Only scripts available in the active
   public or restricted mode can be selected.
5. Add indicators, measures, and other available taxonomy.
6. Use the track editor to select the required modus operandi for each scene.
7. Check the result in the viewer. PAX stores changes locally.

Use **More actions** for JSON and Word export, import, and other script
operations. Before substantial changes, save a JSON export as a recovery point.

![Crime-script editor with scene overview](assets/user-guide/en/03-script-edit.png)

## 5. Explore a case

Open **Case file** and enter concrete observations, one per line or separated
by commas. PAX compares them locally with the available crime scripts.
Selected products, locations, roles, attributes, and transports are treated as
requirements; leave them empty when they are uncertain.

Each hypothesis shows:

- how many observations match fully or partially;
- which terms were and were not found;
- which scenes contain the matches;
- which entered observations remain unexplained.

A match is a starting point for analysis, not a conclusion about what
happened. Where possible, compare two or three hypotheses and record what
additional information could distinguish them.

![Case analysis with full and partial matches](assets/user-guide/en/10-case-analysis.png)

## 6. Practise in learning mode

Open **Learning mode** and choose a public reference script. If you have not
selected your own content, PAX uses the starter library. Exercises ask you to
complete or order scenes and activities and to select suitable roles,
indicators, or barriers. Options may also come from other scripts.

After selecting **Compare with reference**, PAX shows similarities and
differences. A different answer is not treated as automatically wrong: other
choices may be defensible and should prompt reflection. For unreviewed starter
content, heed the warning that the reference is learning material rather than
established truth.

![Exercise with public starter content in learning mode](assets/user-guide/en/11-learning-mode.png)

## 7. Prepare a script with the LLM wizard

Select **Generate with LLM** on the home page. PAX uses a manual,
provider-neutral hand-off: the application does not contact an LLM, store an
API key, open a source URL, or transmit workspace data.

### Step 1 — Brief

Enter:

- the script language;
- crime type or domain;
- geographical applicability;
- level of detail;
- optional source URLs, one per line;
- optional pasted source text or notes.

URLs are included verbatim in the prompt, but PAX never opens or downloads
them. Do not include secret or identifiable information in a prompt sent to an
external service.

![First step of the LLM wizard](assets/user-guide/en/04-llm-brief.png)

### Step 2 — Copy prompt

Select **Build prompt** and check the generated prompt. Copy it to an LLM of
your choice. The prompt requests defensive analysis and excludes actionable
offending instructions and evasion tactics.

![Generated prompt in the light theme](assets/user-guide/en/05-llm-prompt-light.png)

### Step 3 — Paste JSON

Copy only the LLM's JSON response back into PAX. The wizard parses and
validates it locally. An error identifies the field or missing reference;
correct the response outside PAX and try again.

The image uses reproducible synthetic JSON. The selected LLM does not matter
for this manual, provider-neutral hand-off.

![Synthetic JSON pasted into PAX](assets/user-guide/en/06-llm-json-paste.png)

### Step 4 — Review and import

Before importing, check:

- title, language, and classification;
- scenes, modi operandi, and activities;
- roles, locations, indicators, and measures;
- sources and how they were used;
- the absence of operational offending instructions.

The workspace changes only after explicit import confirmation. An imported
script remains **AI-generated** and **Unreviewed** until a person has completed
a substantive review.

![Local review of the generated script](assets/user-guide/en/07-llm-review.png)

## 8. Safe exchange and recovery

- Export the complete workspace as JSON for a local recovery point before
  loading another model.
- Use a script JSON file for focused review and exchange, and a collection JSON
  file to transfer a complete workspace.
- Treat a permanent link as sensitive information: the public model is encoded
  in its URL.
- Always check the filename and classification before sharing.
- Clear local application data only after verifying a usable recovery file.
