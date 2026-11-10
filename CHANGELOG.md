# Changelog

What changed in Forge.Dev, newest first. After `git pull`, read the newest section to see what is new and whether you need to reinstall anything (see "Get the latest changes" in the README).

## 2026-11-11

**Fixes**
- Deleting a student who already submitted code no longer fails with a server error.
- A quest's score message now says how much XP hints took off (for example "45 XP awarded (5 XP deducted for hints used)").
- The student Quest Log shows the XP actually earned, not the full quest reward.
- Dates and times were off by 8 hours for Philippine time on the student pages (a submission after midnight showed as the day before). Due dates, announcements, the activity calendar, the admin Dashboard "x ago" times and the Sections enrolled date now use the right time.
- The old `/instructor/analytics` and `/instructor/plagiarism` links now go to the class list. Both pages are still inside each class (the Analytics and Plagiarism tabs).

**New**
- The head administrator is no longer locked out after 3 wrong passwords. To prevent guessing, more than 10 wrong passwords in one minute are paused for a minute. Other accounts still lock after 3 attempts.
- Icons on the Subject catalog cards (Total Subjects, Departments, Avg. Units).

**Admin**
- One shared look for dialogs, confirmation popups, success/error banners and toasts across Users, Subjects, Instructor Assignments, Sections, Activity Logs and System Settings.
- Line icons replaced the emoji on all admin pages, and the user cards use role icons.
- Bulk CSV upload preview warns about incomplete rows and skips them.
- Admin lint is at 0 warnings.

**Nothing to reinstall** for this update. Just `git pull`, then stop and start the backend.
