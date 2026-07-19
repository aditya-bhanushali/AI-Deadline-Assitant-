import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Calendar, 
  List, 
  Trash2, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  History, 
  BookOpen, 
  Plus, 
  Check, 
  CalendarDays,
  Activity,
  ArrowRight,
  RefreshCw,
  Mail,
  AlertCircle
} from 'lucide-react';
import { PRESETS, INITIAL_DEADLINES, COURSES, simulateAgentParser, MOCK_INGEST_LOGS, MOCK_EXPORT_LOGS, MOCK_TEAMS_MESSAGES, simulateTeamsParser } from './mockData';

function App() {
  // Navigation State: 'overview' | 'ingest-logs' | 'export-logs'
  const [activeTab, setActiveTab] = useState('overview');
  
  // Deadlines State
  const [deadlines, setDeadlines] = useState(() => {
    const saved = localStorage.getItem('agent_deadlines');
    return saved ? JSON.parse(saved) : INITIAL_DEADLINES;
  });

  // Ingest Mode State: 'agent' (email/chat text) | 'teams' (MS Teams API sync) | 'manual' (manual form)
  const [ingestMode, setIngestMode] = useState('agent');

  // Textarea and Input State
  const [rawText, setRawText] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);

  // Microsoft Teams API connection settings (polling variables)
  const [teamsTenantId, setTeamsTenantId] = useState('aditya-university-tenant');
  const [teamsClientId, setTeamsClientId] = useState('ms-graph-application-id');
  const [teamsClientSecret, setTeamsClientSecret] = useState('teams_azure_secret_x92k');
  const [teamsChannel, setTeamsChannel] = useState('General Announcements');
  const [selectedTeamsMsgIdx, setSelectedTeamsMsgIdx] = useState(0);
  const [isTeamsSyncing, setIsTeamsSyncing] = useState(false);
  const [teamsSyncSteps, setTeamsSyncSteps] = useState([]);
  const [currentTeamsStepIdx, setCurrentTeamsStepIdx] = useState(-1);
  
  // Custom manual entry states
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualDue, setManualDue] = useState('2026-07-25T23:59');
  const [manualUrgency, setManualUrgency] = useState('Medium');

  // Ingest Logs States
  const [ingestLogs, setIngestLogs] = useState(MOCK_INGEST_LOGS);

  // Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Notification Toast State
  const [toast, setToast] = useState(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('agent_deadlines', JSON.stringify(deadlines));
  }, [deadlines]);

  // Show self-dismissing toast notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Preset loading helper
  const handleLoadPreset = (presetId) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setRawText(preset.text);
      setSelectedCourse(preset.course);
      showToast(`Loaded template: "${preset.label}"`, 'info');
    }
  };

  // Agent Parsing Simulation Trigger
  const handleProcessText = () => {
    if (!rawText.trim()) {
      showToast('Please paste email or chat text first!', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessingSteps([
      'Initializing Syllabus Agent parsing pipeline...',
      'Analyzing syntax structures and metadata headers...',
      `Contextualizing course mapping to "${selectedCourse}"...`,
      'Running named-entity recognition (NER) on dates & schedules...',
      'Extracting upcoming assignments, quiz topics & midterms...',
      'Evaluating urgency thresholds & calendar alignment...',
      'Generating calendar events and importing payload...'
    ]);
    setCurrentStepIndex(0);
  };

  // Step-by-step terminal simulation
  useEffect(() => {
    if (isProcessing && currentStepIndex < processingSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 700); // Progress every 700ms
      return () => clearTimeout(timer);
    } else if (isProcessing && currentStepIndex >= processingSteps.length) {
      // Done processing, parse the deadlines
      const newEvents = simulateAgentParser(rawText, selectedCourse);
      
      setDeadlines(prev => {
        // Filter out duplicates (simple key match on title and course)
        const filteredNew = newEvents.filter(
          ne => !prev.some(pe => pe.title.toLowerCase() === ne.title.toLowerCase() && pe.course === ne.course)
        );
        
        if (filteredNew.length === 0) {
          showToast('No new deadlines detected or already imported.', 'info');
          return prev;
        }

        showToast(`Agent successfully extracted ${filteredNew.length} deadline(s)!`, 'success');
        return [...filteredNew, ...prev];
      });

      // Add to Ingest Logs
      const newLog = {
        id: `log-new-${Date.now()}`,
        timestamp: new Date().toISOString().substring(0, 19),
        source: 'Manual Paste Sync',
        status: 'Success',
        message: `Parsed ${newEvents.length} event(s) for ${selectedCourse} from paste buffer.`
      };
      setIngestLogs(prev => [newLog, ...prev]);

      setIsProcessing(false);
      setProcessingSteps([]);
      setCurrentStepIndex(-1);
    }
  }, [isProcessing, currentStepIndex]);

  // Teams Sync Simulation Trigger
  const handleTeamsSync = () => {
    setIsTeamsSyncing(true);
    setTeamsSyncSteps([
      'Establishing connection to Microsoft Graph API Endpoint...',
      `Authenticating client credentials for tenant ID "${teamsTenantId}"...`,
      'Token acquired. Accessing MS Teams Channel Feed...',
      `Querying messages for Channel: "${teamsChannel}"...`,
      'Message stream retrieved. Scanning for syllabus keywords...',
      'Matching parsed Teams payload against active deadlines...',
      'Inserting newly synced Teams events into schedule logs...'
    ]);
    setCurrentTeamsStepIdx(0);
  };

  // Step-by-step Teams poller simulation
  useEffect(() => {
    if (isTeamsSyncing && currentTeamsStepIdx < teamsSyncSteps.length) {
      const timer = setTimeout(() => {
        setCurrentTeamsStepIdx(prev => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    } else if (isTeamsSyncing && currentTeamsStepIdx >= teamsSyncSteps.length) {
      const message = MOCK_TEAMS_MESSAGES[selectedTeamsMsgIdx];
      const newEvents = simulateTeamsParser(message.text);

      setDeadlines(prev => {
        const filteredNew = newEvents.filter(
          ne => !prev.some(pe => pe.title.toLowerCase() === ne.title.toLowerCase() && pe.course === ne.course)
        );

        if (filteredNew.length === 0) {
          showToast(`Teams Sync: Feed up to date. No new deadlines found.`, 'info');
          return prev;
        }

        showToast(`Teams Sync: Extracted ${filteredNew.length} deadline(s) from channel message!`, 'success');
        return [...filteredNew, ...prev];
      });

      // Add to Ingest Logs
      const newLog = {
        id: `log-new-teams-${Date.now()}`,
        timestamp: new Date().toISOString().substring(0, 19),
        source: `MS Teams API (#${teamsChannel.toLowerCase().replace(/\s+/g, '-')})`,
        status: 'Success',
        message: `Synced feed. Extracted ${newEvents.length} event(s) from post by ${message.sender}.`
      };
      setIngestLogs(prev => [newLog, ...prev]);

      setIsTeamsSyncing(false);
      setTeamsSyncSteps([]);
      setCurrentTeamsStepIdx(-1);
    }
  }, [isTeamsSyncing, currentTeamsStepIdx]);

  // Handle addition of a manually created event
  const handleAddManualDeadline = (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      showToast('Title is required!', 'error');
      return;
    }

    const newDl = {
      id: `dl-manual-${Date.now()}`,
      course: selectedCourse,
      title: manualTitle,
      description: manualDesc || 'No additional description details provided.',
      dueDate: manualDue,
      urgency: manualUrgency,
      status: 'Pending'
    };

    setDeadlines(prev => [newDl, ...prev]);
    showToast('New deadline added manually!', 'success');
    
    // Reset Form
    setManualTitle('');
    setManualDesc('');
    setIsManualMode(false);
  };

  // Toggle deadline completion
  const handleToggleStatus = (id) => {
    setDeadlines(prev => prev.map(dl => {
      if (dl.id === id) {
        const nextStatus = dl.status === 'Completed' ? 'Pending' : 'Completed';
        showToast(`Marked "${dl.title}" as ${nextStatus.toLowerCase()}`, 'info');
        return { ...dl, status: nextStatus };
      }
      return dl;
    }));
  };

  // Delete deadline
  const handleDeleteDeadline = (id) => {
    setDeadlines(prev => {
      const match = prev.find(dl => dl.id === id);
      if (match) {
        showToast(`Removed deadline: "${match.title}"`, 'warning');
      }
      return prev.filter(dl => dl.id !== id);
    });
  };

  // Clear all deadlines
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all active deadlines?')) {
      setDeadlines([]);
      showToast('All deadlines have been cleared.', 'warning');
    }
  };

  // Reset to default presets
  const handleResetToDefaults = () => {
    setDeadlines(INITIAL_DEADLINES);
    showToast('Dashboard reset to default syllabus deadlines.', 'info');
  };

  // Calculate stats
  const totalParsed = deadlines.length;
  const pendingSubmissions = deadlines.filter(dl => dl.status === 'Pending').length;
  
  // Calculate academic urgency level based on due dates and levels
  const calculateUrgency = () => {
    const activeHigh = deadlines.filter(dl => dl.status === 'Pending' && dl.urgency === 'High');
    const activeMed = deadlines.filter(dl => dl.status === 'Pending' && dl.urgency === 'Medium');
    
    if (activeHigh.length > 1) {
      return { label: 'CRITICAL ALERT', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50' };
    } else if (activeHigh.length === 1 || activeMed.length >= 2) {
      return { label: 'ELEVATED RISK', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50' };
    } else if (pendingSubmissions > 0) {
      return { label: 'STABLE / ACTIVE', color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50' };
    } else {
      return { label: 'ALL CLEARED', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' };
    }
  };

  const academicUrgency = calculateUrgency();

  // Export to standard ICS calendar file
  const handleExportICS = () => {
    const activeDeadlines = deadlines.filter(dl => dl.status === 'Pending');
    if (activeDeadlines.length === 0) {
      showToast('No pending deadlines available to export!', 'error');
      return;
    }

    // Helper to format Date objects to YYYYMMDDTHHmmSSZ
    const formatICSDate = (date) => {
      const pad = (num) => String(num).padStart(2, '0');
      const yyyy = date.getUTCFullYear();
      const mm = pad(date.getUTCMonth() + 1);
      const dd = pad(date.getUTCDate());
      const hh = pad(date.getUTCHours());
      const min = pad(date.getUTCMinutes());
      const ss = pad(date.getUTCSeconds());
      return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
    };

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Deadlines Syllabus Agent//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";
    
    activeDeadlines.forEach(dl => {
      // Parse local dueDate string
      const startDate = new Date(dl.dueDate);
      
      // Fallback if parsing fails
      let startStr, endStr;
      if (isNaN(startDate.getTime())) {
        // Fallback using original replace logic if string isn't standard ISO
        let dtString = dl.dueDate.replace(/[-:]/g, "");
        if (dtString.length === 13) dtString += "00";
        startStr = dtString;
        endStr = dtString; // Fallback
      } else {
        startStr = formatICSDate(startDate);
        // Set end date to 1 hour after start date for standard client compatibility
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        endStr = formatICSDate(endDate);
      }
      
      // Clean description for ICS layout rules
      const summary = `${dl.course}: ${dl.title}`;
      const description = dl.description.replace(/\n/g, " ");

      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:dl-${dl.id}@syllabusagent.edu\n`;
      icsContent += `DTSTAMP:${formatICSDate(new Date())}\n`;
      icsContent += `DTSTART:${startStr}\n`;
      icsContent += `DTEND:${endStr}\n`;
      icsContent += `SUMMARY:${summary}\n`;
      icsContent += `DESCRIPTION:${description}\n`;
      icsContent += "PRIORITY:" + (dl.urgency === 'High' ? '1' : dl.urgency === 'Medium' ? '5' : '9') + "\n";
      icsContent += "STATUS:CONFIRMED\n";
      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    try {
      // Commented out physical file download to run in mock simulation mode
      /*
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "academic_deadlines.ics");
      document.body.appendChild(link);
      link.click();
      
      // Postpone link removal to avoid browser aborting the download stream
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 150);
      */

      // Export simulation completed (Mock Export Logs history tracking removed)
      showToast(`Mock Export: Generated .ics calendar sync schema for ${activeDeadlines.length} events!`, 'success');
    } catch (error) {
      showToast('Failed to simulate calendar export.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' :
          toast.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800' :
          toast.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/90 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800' :
          'bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
        }`}>
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-500" />}
          {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          {toast.type === 'info' && <BookOpen className="h-5 w-5 text-blue-500" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-colors duration-200">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Syllabus Agent
              </h1>
              <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                Microproject
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                activeTab === 'overview' 
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Inbox className="h-4.5 w-4.5 transition-transform group-hover:scale-110" />
              <span>Dashboard Overview</span>
            </button>

            <button 
              onClick={() => setActiveTab('ingest-logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                activeTab === 'ingest-logs' 
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <History className="h-4.5 w-4.5 transition-transform group-hover:scale-110" />
              <span>Ingest Logs / Emails</span>
            </button>

            {/* Calendar Export Logs tab removed */}
          </nav>
        </div>

        {/* Sidebar Info Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
            Microproject v1.0.0
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
            Deadlines & Syllabus Inbox Agent
          </p>
        </div>
      </aside>

      {/* Main Core Container */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Top Header stats area */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeTab === 'overview' && 'Deadlines Management'}
                {activeTab === 'ingest-logs' && 'Ingestion History Log'}
                {activeTab === 'export-logs' && 'Calendar Exports History'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {activeTab === 'overview' && 'Process emails or chat logs to extract academic agendas.'}
                {activeTab === 'ingest-logs' && 'Verify and audit raw syllabus email synchronization streams.'}
                {activeTab === 'export-logs' && 'Review exported calendars download events logs.'}
              </p>
            </div>
            
            {activeTab === 'overview' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetToDefaults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                  title="Reload default deadlines for testing"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset Defaults
                </button>
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-xs font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Standard Modern Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Stat 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 shadow-xs flex items-center justify-between group transition-all hover:border-violet-300 dark:hover:border-violet-800">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Total Deadlines Parsed
                </p>
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {totalParsed}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 shadow-xs flex items-center justify-between group transition-all hover:border-violet-300 dark:hover:border-violet-800">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Pending Submissions
                </p>
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {pendingSubmissions}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {/* Stat 3 - Academic Urgency Level */}
            <div className={`rounded-2xl p-5 border shadow-xs flex items-center justify-between group transition-all ${academicUrgency.color}`}>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  Academic Urgency Level
                </p>
                <h3 className="text-2xl font-extrabold tracking-tight">
                  {academicUrgency.label}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/60 dark:bg-slate-900/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </div>
        </header>

        {/* Conditionally render different pages based on active navigation tab */}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Data-entry interface */}
            <section className="lg:col-span-5 space-y-6">
              
              {/* Presets Card removed to simplify UI layout */}

              {/* Data Ingest Workstation */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6 space-y-5">
                
                {/* Segmented Ingest Mode Controller */}
                <div className="flex border-b border-slate-100 dark:border-slate-850 pb-3 gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => setIngestMode('agent')}
                    className={`flex-1 py-2 text-center rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                      ingestMode === 'agent'
                        ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    Email Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestMode('teams')}
                    className={`flex-1 py-2 text-center rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                      ingestMode === 'teams'
                        ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    MS Teams API
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestMode('manual')}
                    className={`flex-1 py-2 text-center rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                      ingestMode === 'manual'
                        ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    Manual Input
                  </button>
                </div>

                {ingestMode === 'agent' && (
                  /* Standard LLM Inbox Ingest Form */
                  <div className="space-y-4 pt-1">
                    {/* Course Selection dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Targeted Course Area
                      </label>
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        {COURSES.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Copy-paste textarea */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Raw Text Content (Email / Discord / Chat)
                      </label>
                      <textarea
                        rows={8}
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Paste unread university emails, WhatsApp announcements or Discord chat logs containing syllabus/deadline details here..."
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-y"
                      ></textarea>
                    </div>

                    {/* Agent Run Action Button */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleProcessText}
                      className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isProcessing 
                          ? 'bg-violet-500/70 cursor-not-allowed'
                          : 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-500/25 hover:translate-y-[-1px] active:translate-y-0'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing Parsing Stream...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4.5 w-4.5" />
                          Process Text with Agent
                        </>
                      )}
                    </button>

                    {/* Processing Terminal Box */}
                    {isProcessing && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-900 dark:bg-black border border-slate-800/80 font-mono text-[11px] text-emerald-400 space-y-1.5 shadow-inner overflow-hidden animate-pulse">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 text-slate-500">
                          <span>AGENT RUNTIME CONSOLE</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded">ONLINE</span>
                        </div>
                        {processingSteps.slice(0, currentStepIndex + 1).map((step, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-emerald-600 select-none">&gt;</span>
                            <span className="leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {ingestMode === 'teams' && (
                  /* Microsoft Teams API Sync Simulator */
                  <div className="space-y-4 pt-1">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-400">Teams Endpoint:</span>
                        <span className="text-slate-700 dark:text-slate-350">Active (/channels/messages)</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-400">Target Channel:</span>
                        <span className="text-violet-600 dark:text-violet-400 font-bold">#{teamsChannel.toLowerCase().replace(/\s+/g, '-')}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Select Target Teams Message (Graph Mock Feed)
                      </label>
                      <select
                        value={selectedTeamsMsgIdx}
                        onChange={(e) => setSelectedTeamsMsgIdx(parseInt(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        {MOCK_TEAMS_MESSAGES.map((msg, idx) => (
                          <option key={msg.id} value={idx}>
                            {msg.sender.split(' ')[0]}'s Post: {msg.text.substring(0, 45)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Show preview of the selected Teams channel message */}
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 font-medium text-xs leading-relaxed space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5 text-slate-400 font-semibold">
                        <span>From: {MOCK_TEAMS_MESSAGES[selectedTeamsMsgIdx].sender}</span>
                        <span>{new Date(MOCK_TEAMS_MESSAGES[selectedTeamsMsgIdx].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-mono italic">
                        "{MOCK_TEAMS_MESSAGES[selectedTeamsMsgIdx].text}"
                      </p>
                    </div>

                    {/* Sync Trigger Button */}
                    <button
                      type="button"
                      disabled={isTeamsSyncing}
                      onClick={handleTeamsSync}
                      className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isTeamsSyncing 
                          ? 'bg-violet-500/70 cursor-not-allowed'
                          : 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-500/25 hover:translate-y-[-1px] active:translate-y-0'
                      }`}
                    >
                      {isTeamsSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Querying Graph API...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4.5 w-4.5" />
                          Sync Teams Channel Feed
                        </>
                      )}
                    </button>

                    {/* Teams Sync Terminal Console Output */}
                    {isTeamsSyncing && (
                      <div className="p-4 rounded-xl bg-slate-900 dark:bg-black border border-slate-800/80 font-mono text-[11px] text-emerald-400 space-y-1.5 shadow-inner overflow-hidden animate-pulse">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 text-slate-500">
                          <span>MICROSOFT GRAPH API DEPLOYER</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded">CONNECTED</span>
                        </div>
                        {teamsSyncSteps.slice(0, currentTeamsStepIdx + 1).map((step, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-emerald-600 select-none">&gt;</span>
                            <span className="leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {ingestMode === 'manual' && (
                  /* Manual Entry Form */
                  <form onSubmit={handleAddManualDeadline} className="space-y-4 pt-1">
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Course
                      </label>
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        {COURSES.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Deadline Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lab 3: B+ Tree Indexing"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Description / Syllabus Detail
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detail syllabus requirements or submission guidelines..."
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all text-slate-700 dark:text-slate-300 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Due Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={manualDue}
                          onChange={(e) => setManualDue(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Urgency
                        </label>
                        <select
                          value={manualUrgency}
                          onChange={(e) => setManualUrgency(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/25 transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <option value="High">High Urgency</option>
                          <option value="Medium">Medium Urgency</option>
                          <option value="Low">Low Urgency</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-slate-950 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      Create Event Record
                    </button>
                  </form>
                )}

              </div>
            </section>

            {/* RIGHT COLUMN: structured feed of deadlines */}
            <section className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6 flex flex-col min-h-[500px] justify-between">
                
                <div>
                  {/* Right feed header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-violet-600" />
                      <h3 className="font-bold text-slate-950 dark:text-white">
                        Upcoming Academic Schedule
                      </h3>
                    </div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold px-2.5 py-1 rounded-full">
                      {deadlines.length} Items Loaded
                    </span>
                  </div>

                  {/* Deadlines List */}
                  {deadlines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                      <div className="h-14 w-14 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center text-slate-400">
                        <Inbox className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          Inbox Agenda Empty
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Use the Left Ingestion Column to parse incoming syllabus messages, emails, or chat threads via LLM Agent heuristic.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deadlines.map((dl) => {
                        // Date formatting helper
                        const dateObj = new Date(dl.dueDate);
                        const formattedDate = isNaN(dateObj.getTime()) 
                          ? dl.dueDate 
                          : dateObj.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });

                        return (
                          <div
                            key={dl.id}
                            className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row items-start justify-between gap-4 group ${
                              dl.status === 'Completed'
                                ? 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/40 dark:border-slate-800/30 opacity-70'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:shadow-md dark:hover:bg-slate-850/40 hover:border-slate-300 dark:hover:border-slate-700/80'
                            }`}
                          >
                            <div className="space-y-2 flex-1">
                              {/* Meta Badge area */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                                  {dl.course}
                                </span>
                                
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  dl.urgency === 'High' 
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30' 
                                    : dl.urgency === 'Medium' 
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' 
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                                }`}>
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  {dl.urgency} Urgency
                                </span>

                                {dl.status === 'Completed' && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                                    <Check className="h-2.5 w-2.5" /> Done
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <h4 className={`text-sm font-bold tracking-tight ${
                                dl.status === 'Completed' 
                                  ? 'text-slate-500 line-through' 
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {dl.title}
                              </h4>

                              {/* Description */}
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                {dl.description}
                              </p>

                              {/* Calendar timestamp */}
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Due: {formattedDate}</span>
                              </div>
                            </div>

                            {/* Actions on card */}
                            <div className="flex sm:flex-col items-center gap-2 self-stretch justify-end border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800/80 pt-3 sm:pt-0 sm:pl-3 min-w-[70px]">
                              <button
                                onClick={() => handleToggleStatus(dl.id)}
                                className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                  dl.status === 'Completed'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-900/50 border-slate-200 dark:border-slate-800'
                                }`}
                                title={dl.status === 'Completed' ? 'Mark Pending' : 'Mark Completed'}
                              >
                                <Check className="h-4.5 w-4.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteDeadline(dl.id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 transition-all cursor-pointer"
                                title="Delete Deadline"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* EXPORT MODULE: ICS Calendar export */}
                {deadlines.length > 0 && (
                  <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                    <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/15 border border-violet-100 dark:border-violet-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1 text-center sm:text-left">
                        <h4 className="text-sm font-bold text-violet-950 dark:text-violet-300">
                          Export Schedule to Calendar
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Generate standard iCalendar (.ics) format file to sync deadlines with Google Calendar, Apple Calendar or Outlook.
                        </p>
                      </div>
                      
                      <button
                        onClick={handleExportICS}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 hover:translate-y-[-1px] active:translate-y-0 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                        Download .ics Calendar File
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </section>

          </div>
        )}

        {/* View 2: Ingest logs */}
        {activeTab === 'ingest-logs' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-slate-950 dark:text-white">
                  Syllabus Message Ingestion Streams
                </h3>
              </div>
              <button 
                onClick={() => setIngestLogs(MOCK_INGEST_LOGS)}
                className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer"
              >
                Reset Log History
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Source Channel</th>
                    <th className="py-3 px-4">Parser Status</th>
                    <th className="py-3 px-4">Activity Log Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {ingestLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-850 dark:text-slate-350">
                        {log.source}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          log.status === 'Success' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-450 font-medium">
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export logs view removed */}

      </main>

    </div>
  );
}

export default App;
