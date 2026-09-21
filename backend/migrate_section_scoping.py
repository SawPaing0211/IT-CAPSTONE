"""
One-time migration for the "modules/quests must belong to one specific
class code" fix.

What it does:
1. Adds a `section_id` column to `lessons` (it already exists on
   `problems` as part of `visible_to_sections`, so nothing to add there).
2. Backfills existing lessons: if a lesson's subject has exactly one
   active class code, that lesson is attached to it (unambiguous case --
   covers your current "Test" module under Introduction to Computing Lab).
   If a subject has zero or multiple active class codes, the lesson is
   left unattached (section_id stays NULL) and will simply stop showing
   up anywhere until you open it and re-save it against the right class
   code, or just delete it if it was only test content.
3. Prints a report so you can see exactly what happened to each lesson
   and each already-existing quest that has an empty "Visible To
   Sections" list (those will also stop showing to students until you
   edit the quest and pick a class code -- this migration can't guess
   which one for you, since a quest never had a subject-to-section
   backfill path the way lessons do).

Run this ONCE, after pulling the latest backend code, before restarting
the Flask server:

    python migrate_section_scoping.py

Safe to re-run -- skips the ALTER TABLE if the column is already there,
and only backfills lessons that are still NULL.
"""
import sys

sys.path.insert(0, '.')
from app import app, db, Lesson, Problem, SubjectSection
from sqlalchemy import text, inspect


def column_exists(table, column):
    insp = inspect(db.engine)
    return column in [c['name'] for c in insp.get_columns(table)]


def main():
    with app.app_context():
        if column_exists('lessons', 'section_id'):
            print("lessons.section_id already exists -- skipping ALTER TABLE.")
        else:
            print("Adding lessons.section_id ...")
            db.session.execute(text(
                "ALTER TABLE lessons "
                "ADD COLUMN section_id INT NULL, "
                "ADD CONSTRAINT fk_lessons_section_id "
                "FOREIGN KEY (section_id) REFERENCES subject_sections(id)"
            ))
            db.session.commit()
            print("Done.")

        print("\nBackfilling lessons with no section_id yet...")
        orphan_lessons = Lesson.query.filter(Lesson.section_id.is_(None)).all()
        if not orphan_lessons:
            print("  (none -- nothing to backfill)")
        for lesson in orphan_lessons:
            active_sections = SubjectSection.query.filter_by(
                subject_id=lesson.subject_id, is_active=True
            ).all()
            if len(active_sections) == 1:
                lesson.section_id = active_sections[0].id
                print(f"  Lesson #{lesson.id} \"{lesson.title}\" -> "
                      f"class code {active_sections[0].section_no} (only active section for its subject)")
            elif len(active_sections) == 0:
                print(f"  Lesson #{lesson.id} \"{lesson.title}\" -- subject has NO active class code, "
                      f"left unattached. It will stop appearing anywhere until you edit or delete it.")
            else:
                codes = ", ".join(s.section_no for s in active_sections)
                print(f"  Lesson #{lesson.id} \"{lesson.title}\" -- subject has {len(active_sections)} "
                      f"active class codes ({codes}), can't guess which one. Left unattached -- "
                      f"open it and re-save against the right class code, or delete it if it's test content.")
        db.session.commit()

        print("\nQuests with an empty 'Visible To Sections' list (these used to be shared with the "
              "whole subject and will now be invisible to students until you edit them and pick a "
              "class code):")
        empty_vis = Problem.query.filter(
            (Problem.visible_to_sections.is_(None)) | (Problem.visible_to_sections == [])
        ).all()
        if not empty_vis:
            print("  (none)")
        for p in empty_vis:
            print(f"  Quest #{p.id} \"{p.title}\" (created_by user #{p.created_by})")

        print("\nMigration complete.")


if __name__ == '__main__':
    main()
