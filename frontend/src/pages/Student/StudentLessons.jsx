import { useState, useEffect } from "react";
import DownloadIcon from "../../components/DownloadIcon";
import { API_BASE, authFetch } from '../../api/client'

export default function StudentLessons({ subjectId, sectionId, sectionName, info }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch lessons for the current subject
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        if (!sectionId) {
          setLessons([]);
          setLoading(false);
          return;
        }
        const res = await authFetch(
          `${API_BASE}/api/student/lessons?section_id=${sectionId}`,
        );
        if (res.ok) {
          const data = await res.json();
          // Lessons are scoped to this exact class code by the backend
          // (section_id filter) -- a module uploaded for another section
          // of the same subject never shows up here.
          setLessons(data);
        }
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [subjectId, sectionId]);

  // Download a lesson file
  const handleDownload = async (lessonId, fileId, filename) => {
    try {
      const res = await authFetch(
        `${API_BASE}/api/lessons/${lessonId}/files/${fileId}/download`,
      );
      if (!res.ok) {
        alert("Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed");
    }
  };

  // short type tag instead of an emoji
  const typeTag = (fileType) => String(fileType || 'file').slice(0, 4).toUpperCase();

  const Panel = ({ title, children }) => (
    <section className="rounded-xl border border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-5">
      <h3 className="flex items-center gap-2 font-cinzel text-sm font-bold uppercase tracking-[0.14em] text-amber-200">
        <span className="w-2 h-2 rotate-45 bg-amber-300 shrink-0" aria-hidden="true" />{title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );

  const field = (label, value, big) => (
    <div className="mb-3 last:mb-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={big ? "font-cinzel text-4xl font-bold text-amber-200 leading-tight" : "text-sm text-white"}>{value || "TBA"}</p>
    </div>
  );

  const classInfo = info && (
    <aside className="lg:sticky lg:top-24 self-start">
      <Panel title="Class info">
        {field("Class code", info.section_code, true)}
        {field("Subject", info.name)}
        {field("Semester", info.semester)}
        {field("Instructor", info.instructor)}
      </Panel>
    </aside>
  );

  const Shell = ({ children }) => (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="space-y-6 min-w-0">{children}</div>
      {classInfo}
    </div>
  );

  // Show skeleton cards while lessons are being fetched
  if (loading) {
    return (
      <Shell>
        <div className="space-y-3 animate-pulse" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
      </Shell>
    );
  }

  // Show an empty state when no lessons have been uploaded yet
  if (lessons.length === 0) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber-300/25 bg-[#0b1224] p-10 text-center">
          <p className="font-cinzel text-xl font-bold text-white mb-1">No lessons yet</p>
          <p className="text-sm text-slate-400">
            Your instructor hasn't uploaded any lessons for {sectionName} yet.
          </p>
        </div>
      </Shell>
    );
  }

  // Group lessons by week
  const lessonsByWeek = lessons.reduce((acc, lesson) => {
    const week = `Week ${lesson.week_number}`;
    if (!acc[week]) acc[week] = [];
    acc[week].push(lesson);
    return acc;
  }, {});

  let n = 0;
  return (
    <Shell>
      {Object.entries(lessonsByWeek).map(([week, weekLessons]) => (
        <section key={week} aria-label={week}>
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
            <span className="w-2 h-2 rotate-45 bg-amber-300 shrink-0" aria-hidden="true" />{week}
          </h3>
          <div className="space-y-3">
            {weekLessons.map((lesson) => {
              n += 1;
              return (
                <article
                  key={lesson.id}
                  className="flex gap-4 rounded-xl border border-amber-300/20 border-l-4 border-l-amber-300/70 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 hover:border-amber-300/50 hover:border-l-amber-300 transition"
                >
                  <div className="shrink-0 w-11 h-11 rounded-full border-2 border-amber-300/70 bg-[#0b1224] flex items-center justify-center font-cinzel text-lg font-bold text-white" aria-hidden="true">{n}</div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-cinzel text-base sm:text-lg font-bold uppercase tracking-wide text-white break-words">{lesson.title}</h4>
                    {lesson.description && <p className="mt-0.5 text-sm text-slate-400 break-words">{lesson.description}</p>}

                    {lesson.files && lesson.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Files</p>
                        {lesson.files.map((file) => (
                          <div key={file.id} className="flex items-center gap-3 rounded-lg border border-slate-700/70 bg-[#070b18]/70 px-3 py-2">
                            <span className="shrink-0 rounded border border-amber-300/40 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-200">{typeTag(file.file_type)}</span>
                            <span className="flex-1 min-w-0 truncate text-sm text-slate-200">{file.filename}</span>
                            <button
                              onClick={() => handleDownload(lesson.id, file.id, file.filename)}
                              title={`Download ${file.filename}`}
                              aria-label={`Download ${file.filename}`}
                              className="shrink-0 w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border border-amber-300/50 text-amber-200 hover:bg-amber-300/15 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                            >
                              <DownloadIcon size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </Shell>
  );
}
