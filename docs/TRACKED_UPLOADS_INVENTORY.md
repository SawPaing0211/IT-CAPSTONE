# Lesson PDFs under `backend/uploads/` (inventory only; nothing deleted, contents not opened)

Compiled from git metadata, file sizes and timestamps only. No file was opened, so this says nothing about what the documents contain.

| Path | Git status | Size | First added (commit date, message) |
|---|---|---|---|
| backend/uploads/lessons/1/8b2f2271590b4504ab21bce60aa6cd29.pdf | tracked | 1,668 B | 2026-09-18, "Fixed data isolation bugs and added announcements." |
| backend/uploads/lessons/1/fa339032d4bb4deab13478f871596b92.pdf | tracked | 11,010 B | 2026-05-02, "Added achievements and lessons." |
| backend/uploads/lessons/2/f9ad1721cccb4d9e84ad43e732fe72d2.pdf | tracked | 11,010 B | 2026-05-02, same commit |
| backend/uploads/lessons/3/ae112b97615c4e2eb9b7690e6cc6da31.pdf | tracked | 11,010 B | 2026-05-02, same commit |
| backend/uploads/lessons/4/be3044a7dd474d5a86c23c98df33c5a8.pdf | tracked | 11,010 B | 2026-05-02, same commit |
| backend/uploads/lessons/5/10e01512f72444b5979e9c6fed4d8719.pdf | tracked | 4,255 B | 2026-09-04, "Updated instructor dashboard and admin pages." |
| backend/uploads/lessons/7/17a6016fca4b4532b76fed6de0555a75.pdf | **untracked** (not in git) | 1,498 B | file dated 2026-10-04; not created by this work |

Fixture or uploaded content?
- **Uploaded content created by the application**, not hand-made fixtures, judging by the evidence: every file name is a random UUID, which is what the upload endpoint generates; the folder numbers are lesson ids; no test, seed or script in the repository refers to any of these files by name (tests and the demo seed create their own files elsewhere); and there is no fixtures/samples folder in the repository.
- Four files have the identical size (11,010 bytes) and were added in one commit for lessons 1-4, which suggests one test document uploaded repeatedly during development. That is an inference, not a finding.
- Whether any of them is real course material, or contains personal data, is **unknown** and needs a person who can open them.

Related facts: the files are committed in history (removing them from the working tree would not remove them from history); `backend/.dockerignore` now keeps `uploads/` out of Docker images; the untracked file in `lessons/7` is not in git at all.

Cleanup is only a proposal and nothing has been changed. Options for you to decide after review: (a) keep as test fixtures, moved to a clearly named fixtures folder and documented; (b) stop tracking them (`git rm --cached`, add `backend/uploads/` to `.gitignore`) and keep local copies; (c) additionally purge them from history if any proves to be real or personal content. Check first that no real database row references them (`python backup_full.py check-files` against a restored copy).
