import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Zap, 
  Target,
  Grid3X3,
  List,
  ArrowUpDown,
  Eye,
  Plus,
  Copy,
  Trash2,
  FileCode,
  Languages,
  Star,
  Pin,
  PinOff,
  Sparkles,
  Timer
} from 'lucide-react';

function Sandbox() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('grid');
  const [previewProject, setPreviewProject] = useState(null);
  const [pinnedIds, setPinnedIds] = useState([1, 4]);

  // Enhanced Mock Data
  const projects = [
    { 
      id: 1, 
      title: 'React Component Lab', 
      language: 'JavaScript', 
      tags: ['Web', 'Hooks'],
      status: 'saved',
      lines: 142,
      lastEdited: new Date(Date.now() - 2 * 60 * 60 * 1000),
      description: 'Experimenting with useState, useEffect, and custom hooks',
      isTemplate: false
    },
    { 
      id: 2, 
      title: 'Python API Fetcher', 
      language: 'Python', 
      tags: ['Networking', 'APIs'],
      status: 'draft',
      lines: 38,
      lastEdited: new Date(Date.now() - 5 * 60 * 60 * 1000),
      description: 'Testing requests library with mock REST endpoints',
      isTemplate: false
    },
    { 
      id: 3, 
      title: 'Java Sorting Benchmarks', 
      language: 'Java', 
      tags: ['Algorithms', 'Performance'],
      status: 'saved',
      lines: 89,
      lastEdited: new Date(Date.now() - 24 * 60 * 60 * 1000),
      description: 'Comparing bubble sort vs merge sort execution times',
      isTemplate: false
    },
    { 
      id: 4, 
      title: 'CSS Grid Playground', 
      language: 'HTML/CSS', 
      tags: ['Web', 'Responsive'],
      status: 'saved',
      lines: 67,
      lastEdited: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: 'Testing responsive layouts, auto-fill, and media queries',
      isTemplate: true
    },
    { 
      id: 5, 
      title: 'C# LINQ Experiments', 
      language: 'C#', 
      tags: ['Data', 'Functional'],
      status: 'draft',
      lines: 54,
      lastEdited: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      description: 'Practicing LINQ queries, lambdas, and method chaining',
      isTemplate: false
    },
    { 
      id: 6, 
      title: 'SQL Query Tester', 
      language: 'SQL', 
      tags: ['Database', 'Practice'],
      status: 'saved',
      lines: 23,
      lastEdited: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      description: 'Testing JOINs, subqueries, and window functions',
      isTemplate: true
    },
    { 
      id: 7, 
      title: 'Algorithm Scratchpad', 
      language: 'Python', 
      tags: ['Algorithms', 'Notes'],
      status: 'draft',
      lines: 15,
      lastEdited: new Date(),
      description: 'Quick pseudocode and notes for upcoming challenges',
      isTemplate: false
    },
  ];

  const languages = ['all', 'JavaScript', 'Python', 'Java', 'C#', 'HTML/CSS', 'SQL'];
  const tags = ['all', 'Web', 'Algorithms', 'Networking', 'Data', 'Database', 'Hooks', 'Performance', 'Responsive', 'Practice'];
  const sortOptions = [
    { value: 'recent', label: 'Recently Edited' },
    { value: 'name', label: 'A-Z' },
    { value: 'lines', label: 'Lines (High to Low)' },
    { value: 'pinned', label: 'Pinned First' },
  ];

  // Format relative time
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Filter & Sort
  const filteredProjects = useMemo(() => {
    return projects
      .filter(project => {
        const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              project.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLanguage = filterLanguage === 'all' || project.language === filterLanguage;
        const matchesTag = filterTag === 'all' || project.tags.includes(filterTag);
        return matchesSearch && matchesLanguage && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'pinned') {
          const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
          const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
          if (bPinned !== aPinned) return bPinned - aPinned;
        }
        if (sortBy === 'lines') return b.lines - a.lines;
        if (sortBy === 'name') return a.title.localeCompare(b.title);
        return b.lastEdited - a.lastEdited;
      });
  }, [searchTerm, filterLanguage, filterTag, sortBy, pinnedIds]);

  // Stats
  const totalProjects = projects.length;
  const savedProjects = projects.filter(p => p.status === 'saved').length;
  const totalLines = projects.reduce((sum, p) => sum + p.lines, 0);
  const languagesUsed = new Set(projects.map(p => p.language)).size;

  const getLanguageColor = (language) => {
    const colors = {
      'JavaScript': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
      'Python': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      'Java': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
      'C#': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      'HTML/CSS': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
      'SQL': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    };
    return colors[language] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  };

  const togglePin = (e, id) => {
    e.stopPropagation();
    setPinnedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // Quick Start Templates
  const templates = [
    { lang: 'Python', icon: '🐍', title: 'Python Starter', desc: 'Basic structure with functions' },
    { lang: 'JavaScript', icon: '⚡', title: 'JS Playground', desc: 'DOM manipulation ready' },
    { lang: 'Java', icon: '☕', title: 'Java Class', desc: 'OOP template with main' },
    { lang: 'C#', icon: '🔷', title: 'C# Console', desc: 'Ready for LINQ & async' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Box size={24} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Sandbox</h2>
            <p className="text-gray-400 text-sm">Free-form coding space for experiments & drafts</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/student/challenge/new?sandbox=true')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-blue-500/20 hover:scale-105"
        >
          <Plus size={16} /> New Sandbox
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <FileCode size={18} className="text-blue-400" />
            </div>
            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+2 this week</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalProjects}</p>
          <p className="text-xs text-gray-500 mt-1">Projects ({savedProjects} saved)</p>
        </div>
        
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <Languages size={18} className="text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{languagesUsed}</p>
          <p className="text-xs text-gray-500 mt-1">Languages active</p>
        </div>
        
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-cyan-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <Target size={18} className="text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{totalLines.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Lines written</p>
        </div>
        
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-orange-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <Timer size={18} className="text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">Just now</p>
          <p className="text-xs text-gray-500 mt-1">Last active</p>
        </div>
      </div>

      {/* Quick Start Templates */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-[#eab308]" />
          Quick Start Templates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {templates.map((tpl, idx) => (
            <button 
              key={idx}
              onClick={() => navigate('/student/challenge/new?sandbox=true&template=' + tpl.lang)}
              className="bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 hover:border-blue-500/50 rounded-xl p-4 text-left transition group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{tpl.icon}</div>
              <div className="font-bold text-white text-sm">{tpl.title}</div>
              <div className="text-xs text-gray-400 mt-1">{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Lang:</span>
          <select 
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500"
          >
            {languages.map(l => <option key={l} value={l}>{l === 'all' ? 'All' : l}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Tag:</span>
          <select 
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500"
          >
            {tags.map(t => <option key={t} value={t}>{t === 'all' ? 'All' : t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500"
          >
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <div className="flex bg-[#0f172a] p-1 rounded-lg border border-gray-700">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List size={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className={`relative bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 p-5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group cursor-pointer ${
                pinnedIds.includes(project.id) ? 'ring-2 ring-blue-500/30' : ''
              }`}
              onClick={() => navigate(`/student/challenge/${project.id}?sandbox=true`)}
            >
              {/* Pin Button */}
              <button 
                onClick={(e) => togglePin(e, project.id)}
                className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${
                  pinnedIds.includes(project.id) 
                    ? 'text-blue-400 bg-blue-500/20' 
                    : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-blue-400 hover:bg-blue-500/10'
                }`}
                title={pinnedIds.includes(project.id) ? "Unpin" : "Pin"}
              >
                {pinnedIds.includes(project.id) ? <Pin size={16} /> : <PinOff size={16} />}
              </button>

              {/* Header */}
              <div className="flex items-start gap-3 mb-3 pr-8">
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                  <FileCode size={20} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {project.status === 'saved' ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 size={12} /> Saved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <Circle size={12} /> Draft
                      </span>
                    )}
                    <span className="text-xs text-gray-500">• {formatRelativeTime(project.lastEdited)}</span>
                  </div>
                </div>
              </div>

              {/* Tags & Language */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getLanguageColor(project.language)}`}>
                  {project.language}
                </span>
                {project.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                    {tag}
                  </span>
                ))}
                {project.isTemplate && (
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold border border-purple-500/20 flex items-center gap-1">
                    <Sparkles size={10} /> Template
                  </span>
                )}
              </div>
              
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>
              
              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Target size={12} />
                    {project.lines} lines
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-[#1e293b] rounded-xl border border-gray-700 col-span-full">
            <Box size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No Projects Found</h3>
            <p className="text-gray-400 mb-4 max-w-md mx-auto">Try adjusting your filters or create a new sandbox to start experimenting.</p>
            <button 
              onClick={() => navigate('/student/challenge/new?sandbox=true')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 mx-auto"
            >
              <Plus size={16} /> Create Sandbox
            </button>
          </div>
        )}
      </div>

      {/* Quick Preview Modal */}
      {previewProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileCode size={20} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">{previewProject.title}</h3>
              </div>
              <button onClick={() => setPreviewProject(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getLanguageColor(previewProject.language)}`}>
                  {previewProject.language}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${
                  previewProject.status === 'saved' 
                    ? 'text-green-400 bg-green-400/10 border-green-400/20' 
                    : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                }`}>
                  {previewProject.status === 'saved' ? '✓ Saved' : '● Draft'}
                </span>
                {previewProject.isTemplate && (
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold border border-purple-500/20">📦 Template</span>
                )}
              </div>
              
              <p className="text-gray-300 leading-relaxed">{previewProject.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-gray-400 mb-1">Lines of Code</div>
                  <div className="font-bold text-white">{previewProject.lines}</div>
                </div>
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-gray-400 mb-1">Last Edited</div>
                  <div className="font-bold text-white">{formatRelativeTime(previewProject.lastEdited)}</div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Box size={16} className="text-blue-400" />
                  <span className="font-bold text-blue-400">Sandbox Mode</span>
                </div>
                <p className="text-sm text-gray-300">
                  Free-form environment with no test cases. Experiment freely, save progress, and iterate without pressure.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setPreviewProject(null);
                    navigate(`/student/challenge/${previewProject.id}?sandbox=true`);
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition"
                >
                  Open in Editor
                </button>
                <button onClick={() => setPreviewProject(null)} className="px-6 py-3 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg font-medium transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sandbox;