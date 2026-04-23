import React, { useState, useEffect, useCallback } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

const App = () => {
  // --- VIEW & WIZARD STATE ---
  const [currentView, setCurrentView] = useState('landing');
  const [currentStep, setCurrentStep] = useState(1);

  // --- DATA STATE ---
  const [frontPage, setFrontPage] = useState({
    student_name: '', usn: '', branch: '', internal_guide: '', external_guide: '',
    external_guide_details: '', internship_nature: 'Online', internship_type: 'Paid',
    amount_paid: '', organization_address: '', internship_title: '', abstract: '',
    introduction: '', organization_profile: ''
  });

  const [schedule, setSchedule] = useState({
    company: '', domain: '', startDate: '', endDate: '', brief: '',
    workingDays: [1, 2, 3, 4, 5, 6]
  });

  const [mode, setMode] = useState('day');
  const [dynamicFields, setDynamicFields] = useState([]);
  const [entryValues, setEntryValues] = useState({});
  const [promptObj, setPromptObj] = useState({ text: '', show: false });
  const [pastedJson, setPastedJson] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- HANDLERS ---
  const handleFrontPageChange = (e) => setFrontPage({ ...frontPage, [e.target.name]: e.target.value });
  const handleScheduleChange = (e) => setSchedule({ ...schedule, [e.target.name]: e.target.value });

  const setInternshipNature = (val) => setFrontPage({ ...frontPage, internship_nature: val });
  const setInternshipType = (val) => {
    // If they switch to free, clear the amount paid automatically
    const newAmount = val === 'Free' ? '' : frontPage.amount_paid;
    setFrontPage({ ...frontPage, internship_type: val, amount_paid: newAmount });
  };

  const handleDateInput = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.substring(0, 8);
    let formatted = val;
    if (val.length > 4) formatted = val.substring(0, 2) + '-' + val.substring(2, 4) + '-' + val.substring(4, 8);
    else if (val.length > 2) formatted = val.substring(0, 2) + '-' + val.substring(2, 4);
    setSchedule({ ...schedule, [e.target.name]: formatted });
  };

  const handleCheckboxChange = (dayVal) => {
    setSchedule(prev => {
      const days = prev.workingDays.includes(dayVal) 
        ? prev.workingDays.filter(d => d !== dayVal)
        : [...prev.workingDays, dayVal].sort();
      return { ...prev, workingDays: days };
    });
  };

  const handleEntryChange = (id, value) => setEntryValues(prev => ({ ...prev, [id]: value }));

  // --- NAVIGATION HANDLERS ---
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- LOGIC ---
  const parseDateString = (str) => {
    const match = (str || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;
    const date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    return date.getFullYear() === parseInt(match[3]) ? date : null;
  };

  const formatDateWithDay = (dateObj) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[dateObj.getDay()]}, ${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
  };

  const calculateFields = useCallback(() => {
    const start = parseDateString(schedule.startDate);
    const end = parseDateString(schedule.endDate);
    if (!start || !end || start > end || schedule.workingDays.length === 0) {
      setDynamicFields([]); return;
    }
    let fields = [];
    if (mode === 'day') {
      let curr = new Date(start), count = 1;
      while (curr <= end) {
        if (schedule.workingDays.includes(curr.getDay())) {
          fields.push({ id: `day-${count}`, label: `Day ${count} • ${formatDateWithDay(curr)}` }); count++;
        }
        curr.setDate(curr.getDate() + 1);
      }
    } else if (mode === 'week') {
      let curr = new Date(start), count = 1;
      while (curr <= end) {
        let weekEnd = new Date(curr); weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > end) weekEnd = new Date(end);
        fields.push({ id: `week-${count}`, label: `Week ${count} • ${formatDateWithDay(curr)} to ${formatDateWithDay(weekEnd)}` });
        count++; curr.setDate(curr.getDate() + 7);
      }
    } else if (mode === 'month') {
      let curr = new Date(start), count = 1;
      while (curr <= end) {
        let monthEnd = new Date(curr); monthEnd.setMonth(monthEnd.getMonth() + 1); monthEnd.setDate(monthEnd.getDate() - 1);
        if (monthEnd > end) monthEnd = new Date(end);
        fields.push({ id: `month-${count}`, label: `Month ${count} • ${formatDateWithDay(curr)} to ${formatDateWithDay(monthEnd)}` });
        count++; curr = new Date(monthEnd); curr.setDate(curr.getDate() + 1);
      }
    }
    setDynamicFields(fields);
  }, [schedule.startDate, schedule.endDate, schedule.workingDays, mode]);

  useEffect(() => { calculateFields(); }, [calculateFields]);

  // --- GENERATE ---
  const generatePrompt = () => {
    const start = parseDateString(schedule.startDate);
    const end = parseDateString(schedule.endDate);
    
    if (!schedule.company || !schedule.domain || !schedule.brief || !start || !end || start > end) {
      alert("Please fill in all required fields and ensure dates are correct before generating."); return;
    }

    let validDates = []; let curr = new Date(start);
    while (curr <= end) {
      if (schedule.workingDays.includes(curr.getDay())) validDates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const exactDatesListStr = validDates.map((d, index) => `${index + 1}. ${formatDateWithDay(d)}`).join('\n');
    let logDataStr = "";
    dynamicFields.forEach(f => {
      const val = entryValues[f.id] || "";
      logDataStr += `* ${f.label}:\n  ${val || "[User left this blank - AI MUST infer and distribute realistic tasks]"}\n\n`;
    });

    const promptText = `You are an AI system generating a strict internship diary JSON.
Convert the provided Context and Log Data into a strict DAILY structured JSON.

RULES:
1. Generate EXACTLY ${validDates.length} daily entries matching the Valid Dates list below.
2. Intelligently break down user summaries into realistic DAILY tasks.
3. OUTPUT STRICT JSON FORMAT EXACT MATCH:
[
  {
    "day_number": "1",
    "date": "DD-MM-YYYY",
    "topic": "...",
    "hours": "8",
    "summary": "...",
    "outcomes": "* Point 1\\n* Point 2",
    "skills": "..."
  }
]

--- VALID WORKING DATES ---
${exactDatesListStr}

--- CONTEXT & LOGS ---
Company: ${schedule.company} | Domain: ${schedule.domain}
Brief: ${schedule.brief}

User Notes:
${logDataStr}`;

    setPromptObj({ text: promptText, show: true });
    nextStep();
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptObj.text);
    alert("Copied! Paste into ChatGPT to get your JSON.");
  };

  const processDocument = async () => {
    setIsGenerating(true);
    try {
      let aiData = JSON.parse(pastedJson.trim());
      const daysPerWeek = schedule.workingDays.length;
      const weekly_logs = []; let currentWeek = { week_number: 1, days: [] };

      aiData.forEach((dayObj, index) => {
        currentWeek.days.push(dayObj);
        if (currentWeek.days.length === daysPerWeek || index === aiData.length - 1) {
          weekly_logs.push(currentWeek);
          currentWeek = { week_number: weekly_logs.length + 1, days: [] };
        }
      });

      const finalReportData = { 
        ...frontPage, 
        branch: frontPage.branch.toUpperCase(), 
        ...schedule, 
        weekly_logs 
      };

      const response = await fetch("/template-frontpage.docx");
      if (!response.ok) throw new Error("Template not found in public folder.");
      const content = await response.arrayBuffer();
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(finalReportData);
      const blob = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      saveAs(blob, `VTU_Report_${frontPage.student_name.replace(/\s+/g, '_') || 'Internship'}.docx`);
    } catch (error) {
      alert(`Error generating report: Ensure your JSON is valid. Details: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderLandingPage = () => (
    <div className="landing-container animate-fade-in">
      <div className="hero-section">
        <div className="hero-badge animate-slide-up">
          <i className="fas fa-rocket"></i> DocuFlow v2.0 is Live
        </div>
        <h1 className="hero-title animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Automate your <span>VTU Reports</span>
        </h1>
        <p className="hero-subtitle animate-slide-up" style={{ animationDelay: '0.2s' }}>
          Stop wrestling with Word documents. Instantly convert your project notes into beautifully formatted, 100% college-compliant internship reports using AI.
        </p>
        
        <div className="btn-wrapper animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <button className="btn btn-hero" onClick={() => setCurrentView('app')}>
            Launch Generator <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <div className="features-bento animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <div className="bento-card">
          <div className="bento-glow"></div>
          <div className="bento-content">
            <i className="fas fa-bolt bento-icon"></i>
            <h3>Lightning Fast</h3>
            <p>Generate a complete 12-week report in less than 2 minutes. Skip the repetitive copy-pasting.</p>
          </div>
        </div>
        
        <div className="bento-card">
          <div className="bento-glow" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(255,255,255,0) 70%)' }}></div>
          <div className="bento-content">
            <i className="fas fa-brain bento-icon" style={{ color: '#10B981', background: '#ECFDF5' }}></i>
            <h3>AI Extrapolation</h3>
            <p>Only have rough weekly notes? Our smart JSON engine expands them into a perfect daily diary.</p>
          </div>
        </div>

        <div className="bento-card">
          <div className="bento-glow" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(255,255,255,0) 70%)' }}></div>
          <div className="bento-content">
            <i className="fas fa-check-double bento-icon" style={{ color: '#F59E0B', background: '#FFFBEB' }}></i>
            <h3>VTU Compliant</h3>
            <p>Maps perfectly to standard VTU `.docx` templates, preserving exact fonts, margins, and alignments.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWizardHeader = () => (
    <div className="stepper-wrapper animate-fade-in">
      <div className={`stepper-item ${currentStep >= 1 ? 'completed' : ''}`}>
        <div className="step-counter"><i className="fas fa-user-edit"></i></div>
        <div className="step-name">Cover Page</div>
      </div>
      <div className={`stepper-item ${currentStep >= 2 ? 'completed' : ''}`}>
        <div className="step-counter"><i className="fas fa-calendar-alt"></i></div>
        <div className="step-name">Schedule</div>
      </div>
      <div className={`stepper-item ${currentStep >= 3 ? 'completed' : ''}`}>
        <div className="step-counter"><i className="fas fa-magic"></i></div>
        <div className="step-name">Generate</div>
      </div>
    </div>
  );

  const renderFooter = () => (
    <footer className="saas-footer animate-fade-in">
      <div className="footer-container">
        <div className="footer-brand-col">
          <h3 className="footer-logo"><i className="fas fa-layer-group"></i> DocuFlow</h3>
          <p className="footer-tagline">
            Streamlining academic documentation for engineering students across VTU. Stop formatting, start building.
          </p>
        </div>
        
        <div className="footer-links-col">
          <h4>Ecosystem Tools</h4>
          <ul>
            <li><a href="https://github.com/Shreyas445/VTU-Internship-Report-filler" target="_blank" rel="noopener noreferrer"><i className="fas fa-file-word"></i> Internship Report</a></li>
            <li><a href="https://github.com/Shreyas445/VTU-Internship-diary-Automation" target="_blank" rel="noopener noreferrer"><i className="fas fa-book"></i> Internship Diary</a></li>
            <li><a href="https://github.com/Shreyas445/VTU-Project-Diary-Automation" target="_blank" rel="noopener noreferrer"><i className="fas fa-project-diagram"></i> Project Diary</a></li>
            <li><a href="https://github.com/Shreyas445/VTU-Course-Filler" target="_blank" rel="noopener noreferrer"><i className="fas fa-tasks"></i> Course Progress</a></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4>Developer</h4>
          <ul>
            <li><a href="https://github.com/Shreyas445" target="_blank" rel="noopener noreferrer"><i className="fab fa-github"></i> GitHub Profile</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}><i className="fas fa-bug"></i> Report an Issue</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2026 Dev. Built with precision for VTU students.</p>
      </div>
    </footer>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        body { margin: 0; background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        * { box-sizing: border-box; }
        
        /* --- ANIMATIONS --- */
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }

        /* --- LANDING PAGE --- */
        .landing-container { min-height: 100vh; display: flex; flex-direction: column; padding: 4rem 2rem; background: radial-gradient(100% 100% at 50% 0%, #EEF2FF 0%, #F8FAFC 100%); }
        .hero-section { max-width: 900px; margin: 0 auto 5rem auto; text-align: center; }
        .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #E0E7FF; color: #4338CA; border-radius: 99px; font-size: 0.875rem; font-weight: 600; margin-bottom: 2rem; border: 1px solid #C7D2FE; }
        .hero-title { font-size: 4.5rem; font-weight: 800; color: #0F172A; margin: 0 0 1.25rem 0; letter-spacing: -0.04em; line-height: 1.1; }
        .hero-title span { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-subtitle { font-size: 1.25rem; color: #475569; max-width: 650px; margin: 0 auto 2.5rem auto; line-height: 1.6; }
        
        .btn-wrapper { position: relative; display: inline-block; }
        .btn-wrapper::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 99px; box-shadow: 0 0 30px rgba(79, 70, 229, 0.4); z-index: -1; animation: float 3s infinite; }
        .btn-hero { background: #0F172A; color: white; font-size: 1.15rem; font-weight: 600; padding: 1.2rem 3rem; border-radius: 99px; border: none; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 0.75rem; z-index: 1; }
        .btn-hero:hover { background: #1E293B; transform: translateY(-2px); }

        .features-bento { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; max-width: 1100px; margin: 0 auto; text-align: left; }
        .bento-card { background: #FFFFFF; padding: 2.5rem; border-radius: 24px; border: 1px solid #F1F5F9; position: relative; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .bento-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px -4px rgba(0,0,0,0.08); border-color: #E2E8F0; }
        .bento-glow { position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(79,70,229,0.1) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; z-index: 0; }
        .bento-content { position: relative; z-index: 1; }
        .bento-icon { font-size: 2rem; color: #4F46E5; margin-bottom: 1.5rem; display: inline-block; padding: 1rem; background: #EEF2FF; border-radius: 16px; }
        .bento-card h3 { font-size: 1.25rem; margin: 0 0 0.75rem 0; color: #0F172A; font-weight: 700; }
        .bento-card p { color: #64748B; margin: 0; line-height: 1.6; font-size: 0.95rem; }

        /* --- APP CONTAINER & WIZARD --- */
        .app-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
        .app-container { max-width: 900px; width: 100%; margin: 0 auto; padding: 3rem 1.5rem; flex: 1; }
        .app-header { text-align: center; margin-bottom: 3rem; }
        .app-title { font-size: 2.5rem; font-weight: 800; color: #0F172A; cursor: pointer; display: inline-flex; align-items: center; gap: 0.75rem; letter-spacing: -0.03em; transition: color 0.2s; }
        .app-title:hover { color: #4F46E5; }
        .app-title i { color: #4F46E5; }
        
        /* Stepper */
        .stepper-wrapper { display: flex; justify-content: space-between; margin-bottom: 3.5rem; position: relative; padding: 0 10%; }
        .stepper-wrapper::before { content: ""; position: absolute; top: 20px; left: 10%; width: 80%; height: 2px; background: #E2E8F0; z-index: 1; }
        .stepper-item { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; transition: all 0.3s; }
        .step-counter { width: 44px; height: 44px; border-radius: 50%; background: #FFFFFF; border: 2px solid #CBD5E1; display: flex; align-items: center; justify-content: center; color: #94A3B8; font-size: 1.1rem; font-weight: bold; margin-bottom: 0.75rem; transition: all 0.3s; box-shadow: 0 0 0 6px #F8FAFC; }
        .step-name { font-size: 0.9rem; font-weight: 600; color: #94A3B8; transition: all 0.3s; }
        
        .stepper-item.completed .step-counter { background: #4F46E5; border-color: #4F46E5; color: white; box-shadow: 0 0 0 6px rgba(79, 70, 229, 0.1); }
        .stepper-item.completed .step-name { color: #0F172A; }
        .stepper-item.completed ~ .stepper-item::before { background: #E2E8F0; }

        /* --- FORM ELEMENTS --- */
        .modern-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); padding: 3rem; margin-bottom: 2rem; }
        
        .section-title { font-size: 1.5rem; font-weight: 700; color: #0F172A; margin: 0 0 2rem 0; display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 1rem; }
        .section-title i { color: #4F46E5; background: #EEF2FF; padding: 0.5rem; border-radius: 8px; }
        
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
        .input-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .input-label { font-size: 0.9rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 0.5rem; }
        .input-label i { color: #94A3B8; font-size: 0.9em; }
        
        .form-control { width: 100%; padding: 0.875rem 1rem; font-size: 0.95rem; color: #0F172A; background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 10px; transition: all 0.2s; outline: none; font-family: inherit; }
        .form-control:focus { background-color: #FFFFFF; border-color: #4F46E5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        textarea.form-control { resize: vertical; min-height: 100px; }
        
        /* OPTION TOGGLES (Nature & Type) */
        .option-group { display: flex; gap: 0.5rem; background: #F8FAFC; padding: 0.4rem; border-radius: 12px; border: 1px solid #E2E8F0; }
        .option-btn { flex: 1; padding: 0.75rem 1rem; font-size: 0.95rem; font-weight: 600; color: #64748B; background: transparent; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
        .option-btn:hover { color: #0F172A; }
        .option-btn.active { background: #FFFFFF; color: #4F46E5; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

        .days-container { display: flex; flex-wrap: wrap; gap: 1rem; background: #F8FAFC; padding: 1.25rem; border-radius: 10px; border: 1px solid #E2E8F0; }
        .day-checkbox { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: #334155; cursor: pointer; font-weight: 500; }
        .day-checkbox input { accent-color: #4F46E5; width: 1.2rem; height: 1.2rem; cursor: pointer; }
        
        .dynamic-field { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; border-left: 4px solid #4F46E5; transition: background 0.2s; }
        .dynamic-field:focus-within { background: #FFFFFF; border-color: #CBD5E1; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .field-label { font-size: 0.95rem; font-weight: 600; color: #4F46E5; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        
        /* Buttons */
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; font-size: 1rem; padding: 0.875rem 1.5rem; border-radius: 10px; border: none; cursor: pointer; transition: all 0.2s ease; }
        .btn-primary { background: #4F46E5; color: #FFFFFF; width: 100%; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2); }
        .btn-primary:hover { background: #4338CA; transform: translateY(-1px); box-shadow: 0 6px 10px rgba(79, 70, 229, 0.3); }
        .btn-primary:disabled { background: #94A3B8; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-outline { background: #FFFFFF; color: #0F172A; border: 1px solid #CBD5E1; padding: 0.875rem 1.5rem; font-size: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .btn-outline:hover { background: #F8FAFC; border-color: #94A3B8; }

        .nav-buttons { display: flex; justify-content: space-between; margin-top: 2.5rem; gap: 1rem; border-top: 1px solid #F1F5F9; padding-top: 2rem; }
        
        .code-block { background: #0F172A; color: #E2E8F0; font-family: 'ui-monospace', monospace; font-size: 0.875rem; padding: 1.5rem; border-radius: 12px; min-height: 250px; width: 100%; border: 1px solid #334155; line-height: 1.6; }

        /* --- MODERN SAAS FOOTER --- */
        .saas-footer { background-color: #0B1120; text-align: left; border-radius: 20px 20px 0 0;color: #94A3B8; padding: 5rem 2rem 2rem 2rem; border-top: 1px solid #1E293B; margin-top: auto; }
        .footer-container { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        
        .footer-brand-col { max-width: 350px; }
        .footer-logo { color: #FFFFFF; font-size: 1.5rem; font-weight: 800; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem; letter-spacing: -0.02em; }
        .footer-logo i { color: #4F46E5; }
        .footer-tagline { line-height: 1.6; font-size: 0.95rem; color: #94A3B8; margin: 0; }
        
        .footer-links-col h4 { color: #FFFFFF; font-size: 1rem; font-weight: 600; margin: 0 0 1.25rem 0; letter-spacing: 0.05em; text-transform: uppercase; }
        .footer-links-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.875rem; }
        .footer-links-col a { color: #94A3B8; text-decoration: none; font-size: 0.95rem; transition: color 0.2s ease; display: inline-flex; align-items: center; gap: 0.5rem; }
        .footer-links-col a i { width: 16px; opacity: 0.7; }
        .footer-links-col a:hover { color: #FFFFFF; }
        .footer-links-col a:hover i { color: #4F46E5; opacity: 1; }
        
        .footer-bottom { max-width: 1000px; margin: 0 auto; padding-top: 2rem; border-top: 1px solid #1E293B; text-align: center; font-size: 0.875rem; }
        
        @media (max-width: 768px) {
          .footer-container { grid-template-columns: 1fr; gap: 2rem; }
          .grid-2 { grid-template-columns: 1fr; }
          .features-bento { grid-template-columns: 1fr; }
          .stepper-wrapper { padding: 0; }
          .hero-title { font-size: 3rem; }
        }
      `}</style>

      {currentView === 'landing' ? renderLandingPage() : (
        <div className="app-wrapper">
          <div className="app-container">
            <header className="app-header animate-fade-in">
              <h1 className="app-title" onClick={() => setCurrentView('landing')} title="Back to Home">
                <i className="fas fa-layer-group"></i> DocuFlow
              </h1>
            </header>

            {renderWizardHeader()}

            {/* --- STEP 1 --- */}
            {currentStep === 1 && (
              <div className="modern-card animate-slide-up">
                <h2 className="section-title"><i className="fas fa-user-edit"></i> Cover Page Details</h2>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-id-card"></i> Student Name *</label>
                    <input name="student_name" className="form-control" placeholder="John Doe" value={frontPage.student_name} onChange={handleFrontPageChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-hashtag"></i> USN *</label>
                    <input name="usn" className="form-control" placeholder="1XY20CS001" value={frontPage.usn} onChange={handleFrontPageChange} />
                  </div>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label"><i className="fas fa-code-branch"></i> Engineering Branch *</label>
                    <input name="branch" className="form-control" placeholder="e.g. Computer Science and Engineering" value={frontPage.branch} onChange={handleFrontPageChange} />
                  </div>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label"><i className="fas fa-heading"></i> Internship Title *</label>
                    <input name="internship_title" className="form-control" placeholder="Embedded Systems & AI" value={frontPage.internship_title} onChange={handleFrontPageChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-chalkboard-teacher"></i> Internal Guide</label>
                    <input name="internal_guide" className="form-control" placeholder="Prof. Jane Smith" value={frontPage.internal_guide} onChange={handleFrontPageChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-user-tie"></i> External Guide</label>
                    <input name="external_guide" className="form-control" placeholder="Mr. Alex Tech" value={frontPage.external_guide} onChange={handleFrontPageChange} />
                  </div>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label"><i className="fas fa-info-circle"></i> External Guide Details</label>
                    <input name="external_guide_details" className="form-control" placeholder="e.g., Branch Head at EV Academy" value={frontPage.external_guide_details} onChange={handleFrontPageChange} />
                  </div>
                  
                  {/* --- INTERACTIVE TOGGLES --- */}
                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-globe"></i> Nature of Internship</label>
                    <div className="option-group">
                      {['Online', 'Offline', 'Hybrid'].map(opt => (
                        <button type="button" key={opt} className={`option-btn ${frontPage.internship_nature === opt ? 'active' : ''}`} onClick={() => setInternshipNature(opt)}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-briefcase"></i> Type of Internship</label>
                    <div className="option-group">
                      {['Paid', 'Free', 'Stipend'].map(opt => (
                        <button type="button" key={opt} className={`option-btn ${frontPage.internship_type === opt ? 'active' : ''}`} onClick={() => setInternshipType(opt)}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-map-marker-alt"></i> Organization Address</label>
                    <input name="organization_address" className="form-control" placeholder="123 Tech Park, City" value={frontPage.organization_address} onChange={handleFrontPageChange} />
                  </div>

                  {/* CONDITIONAL RENDER: Disappears if "Free" is selected */}
                  {frontPage.internship_type !== 'Free' ? (
                    <div className="input-group animate-fade-in">
                      <label className="input-label">
                        <i className="fas fa-rupee-sign"></i> 
                        Amount {frontPage.internship_type === 'Paid' ? 'Paid by you' : 'Received (Stipend)'}
                      </label>
                      <input name="amount_paid" className="form-control" placeholder="e.g. 5000/-" value={frontPage.amount_paid} onChange={handleFrontPageChange} />
                    </div>
                  ) : (
                    <div></div> // Empty div to keep the CSS Grid balanced
                  )}
                </div>
                
                <div className="input-group" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                  <label className="input-label"><i className="fas fa-align-left"></i> Abstract Paragraph</label>
                  <textarea name="abstract" className="form-control" placeholder="Brief summary of the entire internship..." value={frontPage.abstract} onChange={handleFrontPageChange} />
                </div>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label"><i className="fas fa-book-open"></i> Introduction</label>
                  <textarea name="introduction" className="form-control" placeholder="The internship offered an enriching learning experience..." value={frontPage.introduction} onChange={handleFrontPageChange} />
                </div>
                <div className="input-group">
                  <label className="input-label"><i className="fas fa-building"></i> Organization Profile</label>
                  <textarea name="organization_profile" className="form-control" placeholder="Brief details about the company..." value={frontPage.organization_profile} onChange={handleFrontPageChange} />
                </div>

                <div className="nav-buttons" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" style={{ width: 'auto' }} onClick={nextStep}>
                    Next Step <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 2 --- */}
            {currentStep === 2 && (
              <div className="modern-card animate-slide-up">
                <h2 className="section-title"><i className="fas fa-calendar-check"></i> Schedule & Logs</h2>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label"><i className="far fa-building"></i> Company Name *</label>
                    <input name="company" className="form-control" placeholder="TechCorp" value={schedule.company} onChange={handleScheduleChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label"><i className="fas fa-laptop-code"></i> Domain *</label>
                    <input name="domain" className="form-control" placeholder="IoT, Web Dev" value={schedule.domain} onChange={handleScheduleChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label"><i className="far fa-calendar-alt"></i> From Date *</label>
                    <input name="startDate" className="form-control" placeholder="DD-MM-YYYY" value={schedule.startDate} onChange={handleDateInput} />
                  </div>
                  <div className="input-group">
                    <label className="input-label"><i className="far fa-calendar-check"></i> To Date *</label>
                    <input name="endDate" className="form-control" placeholder="DD-MM-YYYY" value={schedule.endDate} onChange={handleDateInput} />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label"><i className="fas fa-sun"></i> Working Days per Week *</label>
                  <div className="days-container">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                      <label key={i} className="day-checkbox">
                        <input type="checkbox" checked={schedule.workingDays.includes(i)} onChange={() => handleCheckboxChange(i)} /> {day}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '2rem' }}>
                  <label className="input-label"><i className="fas fa-project-diagram"></i> Overall Project Brief *</label>
                  <textarea name="brief" className="form-control" placeholder="Explain the high-level goals. The AI uses this to fill in any blank days realistically." value={schedule.brief} onChange={handleScheduleChange} />
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="input-label"><i className="fas fa-layer-group"></i> Data Entry Mode</label>
                  </div>
                  <div className="option-group" style={{ width: 'fit-content' }}>
                    {['day', 'week', 'month'].map(opt => (
                      <button type="button" key={opt} className={`option-btn ${mode === opt ? 'active' : ''}`} onClick={() => setMode(opt)} style={{ textTransform: 'capitalize' }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "1.5rem" }}>
                  {dynamicFields.length === 0 ? (
                    <p style={{ color: "#94A3B8", textAlign: "center", fontStyle: "italic", padding: "1rem 0" }}>Enter valid Start and End dates to generate fields.</p>
                  ) : (
                    dynamicFields.map(field => (
                      <div key={field.id} className="dynamic-field animate-fade-in">
                        <span className="field-label"><i className="fas fa-pen-alt"></i> {field.label}</span>
                        <textarea className="form-control" placeholder="What did you do / learn?" value={entryValues[field.id] || ''} onChange={(e) => handleEntryChange(field.id, e.target.value)} style={{ minHeight: "80px", background: '#FFFFFF' }} />
                      </div>
                    ))
                  )}
                </div>

                <div className="nav-buttons">
                  <button className="btn btn-outline" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button className="btn btn-primary" style={{ width: 'auto' }} onClick={generatePrompt}>
                    Generate AI Prompt <i className="fas fa-magic"></i>
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 3 --- */}
            {currentStep === 3 && (
              <div className="modern-card animate-slide-up">
                <h2 className="section-title"><i className="fas fa-file-word"></i> Final Generation</h2>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '1.5rem' }}>
                  <label className="input-label" style={{ margin: 0, fontSize: '1.05rem', color: '#0F172A' }}><i className="fas fa-terminal"></i> 1. Copy Prompt to ChatGPT</label>
                  <button className="btn-outline" onClick={copyPrompt} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}><i className="far fa-copy"></i> Copy</button>
                </div>
                <textarea readOnly className="code-block" value={promptObj.text} style={{ marginBottom: "2.5rem" }} />
                
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ color: '#0F172A', fontWeight: '700', fontSize: '1.05rem' }}><i className="fas fa-code"></i> 2. Paste ChatGPT JSON Response Here:</label>
                  <textarea 
                    className="code-block"
                    style={{ background: '#F8FAFC', color: '#0F172A', border: '2px solid #CBD5E1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                    placeholder='[\n  {\n    "day_number": "1",\n    ...\n  }\n]' 
                    value={pastedJson} 
                    onChange={(e) => setPastedJson(e.target.value)} 
                  />
                </div>
                
                <div className="nav-buttons">
                  <button className="btn btn-outline" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button className="btn btn-primary" style={{ width: 'auto' }} onClick={processDocument} disabled={isGenerating || !pastedJson}>
                    <i className="fas fa-download"></i> {isGenerating ? "Compiling Document..." : "Download Report (.docx)"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {renderFooter()}
        </div>
      )}
    </>
  );
};

export default App;