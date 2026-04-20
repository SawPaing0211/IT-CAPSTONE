import { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function InstructorPlagiarism() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchPlagiarismReport();
  }, []);

  const fetchPlagiarismReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/instructor/plagiarism/report', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Error fetching plagiarism report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div></div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <AlertTriangle className="text-yellow-400" size={32} />
          Plagiarism Detection
        </h1>
        <p className="text-slate-400">AI-powered code similarity analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <AlertTriangle size={24} className="text-yellow-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{report?.total_cases || 0}</p>
          <p className="text-slate-400 text-sm">Plagiarism Cases Found</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircle size={24} className="text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {report ? (report.plagiarism_cases.length === 0 ? 'Clean' : 'Review Needed') : 'Loading...'}
          </p>
          <p className="text-slate-400 text-sm">Status</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Search size={24} className="text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">Auto</p>
          <p className="text-slate-400 text-sm">Detection Mode</p>
        </div>
      </div>

      {report?.total_cases === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
          <p className="text-slate-400">No plagiarism detected in any submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Detected Cases</h3>
          {report?.plagiarism_cases.map((case_, index) => (
            <div key={index} className="bg-slate-900 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="text-red-400" size={20} />
                    <h4 className="text-lg font-bold text-white">{case_.problem_title}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Student 1</p>
                      <p className="font-medium text-white">{case_.student1}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Student 2</p>
                      <p className="font-medium text-white">{case_.student2}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${case_.similarity_score}%` }}
                        ></div>
                      </div>
                      <span className="text-red-400 font-bold">{case_.similarity_score}% Similarity</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InstructorPlagiarism;