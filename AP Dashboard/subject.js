// Subject Page JavaScript

let currentUser = null;
let currentSubject = null;
let activeSessionId = null; // worksheet_opens row id (backend session tracking)

// Initialize Supabase if not already initialized
if (typeof initSupabase === 'function' && !supabaseClient) {
    console.log('Initializing Supabase in subject.js...');
    initSupabase();
}

// Upload worksheet file to Supabase Storage
async function uploadWorksheet(file, subject, worksheetId) {
    if (!supabaseClient) {
        console.log('Supabase not configured, skipping file upload to storage');
        return null;
    }

    const filePath = `${subject}/${worksheetId}/${file.name}`;

    try {
        const { data, error } = await supabaseClient
            .storage
            .from('worksheets')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (error) throw error;

        const { data: urlData } = supabaseClient
            .storage
            .from('worksheets')
            .getPublicUrl(filePath);

        return { filePath, publicUrl: urlData.publicUrl };
    } catch (error) {
        console.error('Worksheet upload failed:', error);
        return null;
    }
}

// Subject topics database
const subjectTopics = {
    ' Microeconomics': ['Limits and Continuity', 'Derivatives: Definition and Fundamental Properties', 'Derivatives: Applications', 'Integration and Accumulation of Change', 'Differential Equations', 'Applications of Integration'],
    ' Macroeconomics': ['Limits and Continuity', 'Derivatives', 'Integration and Accumulation', 'Differential Equations and Mathematical Modeling', 'Series and Sequences', 'Parametric Equations, Polar Coordinates, and Vector-Valued Functions'],
    'Math Calculus': ['Kinematics', 'Dynamics', 'Circular Motion and Gravitation', 'Energy', 'Momentum', 'Simple Harmonic Motion', 'Torque and Rotational Motion', 'Electric Charge and Electric Force', 'DC Circuits', 'Mechanical Waves and Sound'],
    'Computer Science': ['Fluids', 'Thermodynamics', 'Electric Force, Field, and Potential', 'Electric Circuits', 'Magnetism and Electromagnetic Induction', 'Geometric and Physical Optics', 'Quantum, Atomic, and Nuclear Physics'],
    'Chemistry': ['Kinematics', 'Newton\'s Laws of Motion', 'Work, Energy and Power', 'Systems of Particles and Linear Momentum', 'Circular Motion and Rotation', 'Oscillations', 'Gravitation'],
    'Psychology': ['Chemistry of Life', 'Cell Structure and Function', 'Cellular Energetics', 'Cell Communication and Cell Cycle', 'Heredity', 'Gene Expression and Regulation', 'Natural Selection', 'Ecology'],
};

// ══════════════════════════════════════════
//  PDF OVERLAY TIMER LOGIC
// ══════════════════════════════════════════

function getTimerDuration(worksheetId) {
    if (Number(worksheetId) === 1) return 120 * 60 * 1000; // Worksheet 1: 120 min
    return 60 * 60 * 1000; // Baaki sab: 60 min
}let pdfTimerInterval = null;
let pdfExpiresAt = null;
let fiveMinWarnShown = false;
let currentOpenWorksheetId = null;
let currentOpenRecordId = null;

// ── Toast live countdown interval ──
let toastCountdownInterval = null;



// ── CREATE session in worksheet_opens (backend) ──
async function createBackendSession(worksheetId, pdfUrl) {
 const duration = getTimerDuration(worksheetId);
    const expiresAt = new Date(Date.now() + duration).toISOString();

    const record = {
        user_id: currentUser.user_id,
        student_name: currentUser.full_name || currentUser.username || 'Unknown',
        subject: currentSubject,
        worksheet_id: Number(worksheetId),
        opened_at: new Date().toISOString(),
        expires_at: expiresAt,
        pdf_url: pdfUrl,
        status: 'active'
    };

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('worksheet_opens')
                .insert([record])
                .select()
                .single();

            if (error) throw error;

            activeSessionId = data.id;
            currentOpenRecordId = data.id;
            console.log('✓ Backend session created, id:', activeSessionId, '| expires:', expiresAt);
            return data;
        } catch (err) {
            console.warn('Could not create backend session:', err);
        }
    }

    // Fallback localStorage
    activeSessionId = `local_${Date.now()}`;
    currentOpenRecordId = activeSessionId;
    return { ...record, id: activeSessionId, expires_at: expiresAt };
}

// ── FETCH active session from backend ──
async function fetchActiveSession() {
    if (!supabaseClient) return null;

    try {
        const now = new Date().toISOString();

        const { data, error } = await supabaseClient
            .from('worksheet_opens')
            .select('*')
            .eq('user_id', currentUser.user_id)
            .eq('subject', currentSubject)
            .eq('status', 'active')
            .gt('expires_at', now)
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            console.log('✓ Active session found in backend:', data.id,
                '| expires:', data.expires_at);
        } else {
            console.log('No active session found in backend');
        }

        return data;
    } catch (err) {
        console.error('fetchActiveSession error:', err);
        return null;
    }
}

// ── UPDATE session status ──
async function updateOpenStatus(status) {
    if (!currentOpenRecordId) return;

    const updateData = { status, updated_at: new Date().toISOString() };

    if (supabaseClient && !String(currentOpenRecordId).startsWith('local_')) {
        try {
            const { error } = await supabaseClient
                .from('worksheet_opens')
                .update(updateData)
                .eq('id', currentOpenRecordId);

            if (error) throw error;
            console.log(`✓ Session status → "${status}" in Supabase`);
        } catch (err) {
            console.warn('Could not update status in Supabase:', err);
        }
    }
}

// ── Fetch PDF URL from backend ──
async function fetchPdfUrl(worksheetId) {
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('admin_worksheets')
                .select('file_url')
                .eq('subject', currentSubject)
                .eq('worksheet_number', worksheetId)
                .single();
            if (data?.file_url) return data.file_url;
        } catch (e) {
            console.warn('Supabase PDF fetch failed, trying localStorage');
        }
    }
    const local = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
    const ws = local.find(w =>
        w.subject === currentSubject && w.worksheet_number === worksheetId
    );
    return ws?.file_url || null;
}

// ── Check if already submitted ──
async function checkIfSubmitted(worksheetId) {
    if (supabaseClient) {   
        try {
            const { data } = await supabaseClient
                .from('submissions')
                .select('id')
                .eq('user_id', currentUser.user_id)
                .eq('subject', currentSubject)
                .eq('worksheet_id', Number(worksheetId))
                .maybeSingle();
            if (data) return true;
        } catch (e) { /* fallback */ }
    }
    const local = JSON.parse(localStorage.getItem('submissions') || '[]');
    return local.some(s =>
        s.user_id === currentUser.user_id &&
        s.subject === currentSubject &&
        Number(s.worksheet_id) === Number(worksheetId)
    );
}

// ── Open PDF overlay UI ──
function openPDFOverlay(pdfUrl, worksheetId) {
    document.getElementById('pdfFrame').src = pdfUrl;
    document.getElementById('expiredScreen').classList.remove('show');
    document.getElementById('pdfFrame').style.display = 'block';
    document.getElementById('pdfWorksheetLabel').textContent =
        `${currentSubject} — Worksheet ${worksheetId}`;

    const btn = document.getElementById('btnSubmitInPDF');
    btn.textContent = '📤 Submit Worksheet';
    btn.style.background = '';
    btn.style.display = '';
    btn.disabled = false;

    document.getElementById('pdfOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ── Check if admin has opened this worksheet ──
async function checkAdminPermission(worksheetId) {
    if (!supabaseClient) return true;

    try {
        const { data, error } = await supabaseClient
            .from('admin_worksheets')
            .select('is_open')
            .eq('subject', currentSubject)
            .eq('worksheet_number', Number(worksheetId))
            .maybeSingle();

        if (error) throw error;
        if (!data) return false;
        return data.is_open === true;

    } catch (err) {
        console.error('Permission check failed:', err);
        return false;
    }
}

// ── FIX 1: Check if worksheet session has expired (never submitted) ──
async function checkIfSessionExpired(worksheetId) {
    if (!supabaseClient) return false;

    try {
        const now = new Date().toISOString();

        // Check karein: koi session thi is worksheet ke liye jo expire ho gayi
        const { data, error } = await supabaseClient
            .from('worksheet_opens')
            .select('id, expires_at, status')
            .eq('user_id', currentUser.user_id)
            .eq('subject', currentSubject)
            .eq('worksheet_id', Number(worksheetId))
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!data) return false; // Koi session hi nahi thi

        // Agar status 'expired' hai ya time nikal gaya
        if (data.status === 'expired') return true;
        if (data.status === 'active' && new Date(data.expires_at) < new Date()) {
            // Backend update karo
            await supabaseClient
                .from('worksheet_opens')
                .update({ status: 'expired', updated_at: now })
                .eq('id', data.id);
            return true;
        }

        return false;
    } catch (err) {
        console.error('checkIfSessionExpired error:', err);
        return false;
    }
}

// ── Open PDF with fresh 120-min timer ──
async function openTimedPDF(worksheetId) {
    console.log('Opening timed PDF for worksheet:', worksheetId);

    const allowed = await checkAdminPermission(worksheetId);
    if (!allowed) {
        alert('🔒 Yeh worksheet abhi band hai.\nAapke instructor ne abhi ise open nahi kiya.\nThodi der baad try karein.');
        return;
    }

    // Already submitted? Block karo
    const alreadySubmitted = await checkIfSubmitted(worksheetId);
    if (alreadySubmitted) {
        alert('🔒 Yeh worksheet aap pehle submit kar chuke hain. Ab ise dobara open nahi kar sakte.');
        return;
    }

    // Backend mein active session check karo
    const existingSession = await fetchActiveSession();
    if (existingSession && Number(existingSession.worksheet_id) === Number(worksheetId)) {
        console.log('Active session found — resuming instead of new session');
        await resumeSession(existingSession);
        return;
    }

    // PDF URL fetch karo
    const pdfUrl = await fetchPdfUrl(worksheetId);
    if (!pdfUrl) {
        alert(`Worksheet ${worksheetId} PDF not available yet. Please contact your instructor.`);
        return;
    }

    // Backend mein nayi session banao
    const session = await createBackendSession(worksheetId, pdfUrl);
    if (!session) {
        alert('Could not start session. Please try again.');
        return;
    }

    currentOpenWorksheetId = worksheetId;
    pdfExpiresAt = new Date(session.expires_at).getTime();
    fiveMinWarnShown = false;

    openPDFOverlay(pdfUrl, worksheetId);

    if (pdfTimerInterval) clearInterval(pdfTimerInterval);
    pdfTimerInterval = setInterval(tickPDFTimer, 1000);
    tickPDFTimer();
}

// ── Resume existing backend session ──
async function resumeSession(session) {
    console.log('=== RESUMING SESSION FROM BACKEND ===');

    activeSessionId = session.id;
    currentOpenRecordId = session.id;
    currentOpenWorksheetId = session.worksheet_id;
    pdfExpiresAt = new Date(session.expires_at).getTime();
    fiveMinWarnShown = (pdfExpiresAt - Date.now()) <= 5 * 60 * 1000;

    let pdfUrl = session.pdf_url;
    if (!pdfUrl) pdfUrl = await fetchPdfUrl(session.worksheet_id);

    if (!pdfUrl) {
        alert('Could not reload PDF. Please contact your instructor.');
        await updateOpenStatus('expired');
        return;
    }

    openPDFOverlay(pdfUrl, session.worksheet_id);

    if (pdfTimerInterval) clearInterval(pdfTimerInterval);
    pdfTimerInterval = setInterval(tickPDFTimer, 1000);
    tickPDFTimer();

    // Toast band karo agar khula hua hai
    stopToastCountdown();

    const minsLeft = Math.ceil((pdfExpiresAt - Date.now()) / 60000);
    console.log(`✓ Session resumed — ${minsLeft} min remaining`);
}

function tickPDFTimer() {
    const now = Date.now();
    const remaining = Math.max(0, pdfExpiresAt - now);
    const secondsLeft = Math.ceil(remaining / 1000);

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;

    document.getElementById('timerDisplay').textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const duration = getTimerDuration(currentOpenWorksheetId);
    const pct = duration > 0 ? (remaining / duration) * 100 : 100;    
    const fill = document.getElementById('pdfProgressFill');
        fill.style.width = pct + '%';
    
    const wrapper = document.getElementById('timerWrapper');
    if (secondsLeft <= 300) {
        wrapper.classList.remove('warn');
        wrapper.classList.add('danger');
        fill.style.background = '#ff4d6d';
        if (!fiveMinWarnShown) {
            fiveMinWarnShown = true;
            showFiveMinToast();
        }
    } else if (secondsLeft <= 900) {
        wrapper.classList.add('warn');
        fill.style.background = '#ffd166';
    }

    if (remaining <= 0) {
        clearInterval(pdfTimerInterval);
        pdfTimerInterval = null;
        expirePDFOverlay('expired');
        // Worksheet cards reload karo taaki expired card show ho
        loadWorksheets();
    }
}

function expirePDFOverlay(reason = 'expired') {
    updateOpenStatus(reason);
    activeSessionId = null;

    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('pdfFrame').style.display = 'none';
    document.getElementById('btnSubmitInPDF').style.display = 'none';

    const expiredScreen = document.getElementById('expiredScreen');
    const expIcon = expiredScreen.querySelector('.exp-icon');
    const expTitle = expiredScreen.querySelector('.exp-title');
    const expMsg = expiredScreen.querySelector('.exp-msg');
    const btnAnswers = document.getElementById('btnViewAnswers');

    if (reason === 'submitted') {
        expIcon.textContent = '✅';
        expTitle.textContent = 'Submitted!';
        expTitle.style.color = '#06d6a0';
        expMsg.textContent = 'Your worksheet has been submitted successfully. This PDF session is now closed.';
        btnAnswers.classList.add('visible');
    } else {
        expIcon.textContent = '🔒';
        expTitle.textContent = 'Session Expired';
        expTitle.style.color = '#ff4d6d';
        expMsg.innerHTML = 'Your 120-minute access window has ended.<br>This worksheet is no longer available.<br>Please contact your instructor if you need more time.';
        btnAnswers.classList.remove('visible');
    }

    expiredScreen.classList.add('show');
    document.getElementById('timerDisplay').textContent = '00:00';
}

// ── Upload from inside PDF overlay ──
async function handlePDFInlineUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF or Word document.');
        return;
    }

    const btn = document.getElementById('btnSubmitInPDF');
    btn.textContent = 'Uploading...';
    btn.disabled = true;

    try {
        const uploadResult = await uploadWorksheet(file, currentSubject, currentOpenWorksheetId);

        const submission = {
            id: Date.now(),
            user_id: currentUser.user_id,
            student_name: currentUser.full_name || currentUser.username || 'Unknown',
            subject: currentSubject,
            worksheet_id: currentOpenWorksheetId,
            worksheet_title: `Worksheet ${currentOpenWorksheetId}`,
            file_name: file.name,
            file_size: file.size,
            file_path: uploadResult ? uploadResult.filePath : null,
            file_url: uploadResult ? uploadResult.publicUrl : null,
            submission_date: new Date().toISOString()
        };

        if (supabaseClient) {
            try {
                await supabaseClient.from('submissions').insert([submission]).select();
                console.log('✓ Submission saved to Supabase');
            } catch (error) {
                console.log('Supabase error, saving to localStorage only');
            }
        }

        let submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
        submissions = submissions.filter(s =>
            !(s.user_id === currentUser.user_id &&
                s.subject === currentSubject &&
                s.worksheet_id === currentOpenWorksheetId)
        );
        submissions.push(submission);
        localStorage.setItem('submissions', JSON.stringify(submissions));

        btn.textContent = '✓ Submitted!';
        btn.style.background = '#06d6a0';
        btn.disabled = true;

        if (pdfTimerInterval) {
            clearInterval(pdfTimerInterval);
            pdfTimerInterval = null;
        }
        expirePDFOverlay('submitted');
        alert('Worksheet submitted successfully!');
        loadWorksheets();

    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file. Please try again.');
        btn.textContent = '📤 Submit Worksheet';
        btn.disabled = false;
    }

    event.target.value = '';
}

// ── Fetch and open answer PDF ──
async function openAnswerPDF() {
    const btn = document.getElementById('btnViewAnswers');
    btn.textContent = 'Loading...';
    btn.disabled = true;

    let answerUrl = null;

    if (supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('admin_worksheets')
                .select('answer_url')
                .eq('subject', currentSubject)
                .eq('worksheet_number', currentOpenWorksheetId)
                .single();
            if (data?.answer_url) answerUrl = data.answer_url;
        } catch (error) {
            console.log('Supabase answer fetch failed');
        }
    }

    if (!answerUrl) {
        const adminWorksheets = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
        const ws = adminWorksheets.find(w =>
            w.subject === currentSubject && w.worksheet_number === currentOpenWorksheetId
        );
        if (ws?.answer_url) answerUrl = ws.answer_url;
    }

    btn.textContent = '📋 View Answers';
    btn.disabled = false;

    if (!answerUrl) {
        alert('Answer PDF has not been uploaded yet by your instructor.');
        return;
    }

    window.open(answerUrl, '_blank');
}

// ── Close overlay (timer backend mein chhalta rehta hai) ──
function closeAndGoBack() {
    if (pdfTimerInterval) {
        clearInterval(pdfTimerInterval);
        pdfTimerInterval = null;
    }

    document.getElementById('pdfOverlay').classList.remove('active');
    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('expiredScreen').classList.remove('show');
    document.getElementById('pdfFrame').style.display = 'block';
    document.body.style.overflow = '';

    const btn = document.getElementById('btnSubmitInPDF');
    btn.textContent = '📤 Submit Worksheet';
    btn.style.background = '';
    btn.style.display = '';
    btn.disabled = false;

    document.getElementById('timerDisplay').textContent = '60:00';
    document.getElementById('timerWrapper').classList.remove('warn', 'danger');
    document.getElementById('pdfProgressFill').style.width = '100%';
    document.getElementById('pdfProgressFill').style.background =
        'linear-gradient(90deg, #6c63ff, #06d6a0)';
    document.getElementById('btnViewAnswers').classList.remove('visible');

    // Overlay band hone ke baad toast live countdown restart karo
    const activeExp = pdfExpiresAt;
    if (activeExp && activeExp > Date.now()) {
        const worksheetId = currentOpenWorksheetId;
        const minsLeft = Math.ceil((activeExp - Date.now()) / 60000);
        // Fake session object for toast
        showResumeToast(worksheetId, minsLeft, {
            id: currentOpenRecordId,
            worksheet_id: worksheetId,
            expires_at: new Date(activeExp).toISOString(),
            pdf_url: null
        });
    }
}

function showFiveMinToast() {
    const toast = document.getElementById('fiveMinToast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 6000);
}

// ── FIX 2: Stop toast countdown ──
function stopToastCountdown() {
    if (toastCountdownInterval) {
        clearInterval(toastCountdownInterval);
        toastCountdownInterval = null;
    }
    const toast = document.getElementById('resumeSessionToast');
    if (toast) toast.remove();
}

// Block right-click and keyboard shortcuts when overlay is open
document.addEventListener('contextmenu', e => {
    if (document.getElementById('pdfOverlay').classList.contains('active')) {
        e.preventDefault();
    }
});
document.addEventListener('keydown', e => {
    if (document.getElementById('pdfOverlay').classList.contains('active')) {
        if (e.ctrlKey && ['s', 'p', 'c', 'u'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
        if (e.key === 'Escape') closeAndGoBack();
    }
});

// ══════════════════════════════════════════
//  PAGE INITIALIZATION
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    console.log('=== SUBJECT PAGE LOADING ===');

    if (typeof initSupabase === 'function') initSupabase();

    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { window.location.href = 'index.html'; return; }

    currentUser = JSON.parse(userStr);
    console.log('Current user:', currentUser.full_name || currentUser.username);

    currentSubject = localStorage.getItem('selectedSubject');
    console.log('Selected subject:', currentSubject);

    if (!currentSubject) { window.location.href = 'dashboard.html'; return; }

    loadSubjectPage();
});

async function loadSubjectPage() {
    await syncWorksheets();

    document.getElementById('studentName').textContent =
        currentUser.full_name || currentUser.username;
    document.getElementById('subjectTitle').textContent = currentSubject;

    loadTopics();
    await loadWorksheets();

    // Backend se active session check karo
    const activeSession = await fetchActiveSession();
    if (activeSession) {
        const minsLeft = Math.ceil(
            (new Date(activeSession.expires_at) - Date.now()) / 60000
        );
        showResumeToast(activeSession.worksheet_id, minsLeft, activeSession);
    }
}

// ── FIX 3: Resume toast with LIVE countdown ──
function showResumeToast(worksheetId, minsLeft, session) {
    // Pehle purana toast aur interval saaf karo
    stopToastCountdown();

    let toast = document.createElement('div');
    toast.id = 'resumeSessionToast';
    toast.style.cssText = `
        position: fixed; bottom: 2rem; left: 50%;
        transform: translateX(-50%);
        background: #6c63ff; color: white;
        padding: 1rem 1.5rem; border-radius: 12px;
        font-size: 0.95rem; font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(108,99,255,0.4);
        display: flex; align-items: center;
        gap: 1rem; max-width: 90vw;
    `;
    document.body.appendChild(toast);

    const expiresAtMs = new Date(session.expires_at).getTime();

    // Live time calculate karne ka function
    function getTimeLeft() {
        const diff = Math.max(0, expiresAtMs - Date.now());
        const totalSecs = Math.ceil(diff / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;

        if (h > 0) {
            return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function renderToast(timeStr) {
        toast.innerHTML = `
            <span>⏱️ Worksheet ${worksheetId} session active — <strong>${timeStr}</strong> left</span>
            <button id="resumeBtn"
                style="background:white; color:#6c63ff; border:none;
                       padding:0.4rem 0.8rem; border-radius:8px;
                       cursor:pointer; font-weight:700; font-size:0.85rem;">
                Resume →
            </button>
            <button id="dismissToastBtn"
                style="background:transparent; color:white; border:none;
                       cursor:pointer; font-size:1.1rem; line-height:1;">✕</button>
        `;

        document.getElementById('resumeBtn').addEventListener('click', () => {
            stopToastCountdown();
            resumeSession(session);
        });

        document.getElementById('dismissToastBtn').addEventListener('click', () => {
            stopToastCountdown();
        });
    }

    // Pehli render
    renderToast(getTimeLeft());

    // Har second update karo
    toastCountdownInterval = setInterval(() => {
        const remaining = expiresAtMs - Date.now();
        if (remaining <= 0) {
            stopToastCountdown();
            // Worksheets reload karo taaki expired card dikhaye
            loadWorksheets();
            return;
        }
        // Sirf time span update karo (bina pura re-render ke)
        const timeSpan = toast.querySelector('strong');
        if (timeSpan) timeSpan.textContent = getTimeLeft();
    }, 1000);
}

async function syncWorksheets() {
    if (supabaseClient) {
        try {
            const { data: submissionsData } = await supabaseClient
                .from('submissions')
                .select('*')
                .eq('user_id', currentUser.user_id);

            if (submissionsData?.length > 0) {
                let local = JSON.parse(localStorage.getItem('submissions') || '[]');
                local = local.filter(s => s.user_id !== currentUser.user_id);
                local.push(...submissionsData);
                localStorage.setItem('submissions', JSON.stringify(local));
                console.log('✓ Synced', submissionsData.length, 'submissions from Supabase');
            }
        } catch (error) {
            console.log('Using local submissions data');
        }
    }
}

function loadTopics() {
    const topicsList = document.getElementById('topicsList');
    const topics = subjectTopics[currentSubject] || ['Topics coming soon...'];

    topicsList.innerHTML = topics.map((topic, index) => `
        <div style="padding: 1rem; border-bottom: 1px solid var(--border-color);
                    display: flex; align-items: center; gap: 1rem;">
            <span style="font-weight: 700; color: var(--primary-color);
                         font-size: 1.25rem;">${index + 1}</span>
            <span style="font-weight: 500;">${topic}</span>
        </div>
    `).join('');
}

function downloadCheckedPaper(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function loadWorksheets() {
    const worksheetsGrid = document.getElementById('worksheetsGrid');
    worksheetsGrid.innerHTML = `<p style="color:#7c7f96;padding:1rem;">Loading worksheets...</p>`;

    const worksheets = [];
    for (let i = 1; i <= 26; i++) {
        worksheets.push({
            id: i,
            title: `Worksheet ${i}`,
            description: `Practice problems and exercises for ${currentSubject}`
        });
    }

    // ── Submissions fetch ──
    let userSubmissions = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('submissions')
                .select('*')
                .eq('user_id', currentUser.user_id)
                .eq('subject', currentSubject);

            if (error) throw error;
            userSubmissions = data || [];
            console.log('✓ Submissions fetched from Supabase:', userSubmissions.length);

            let local = JSON.parse(localStorage.getItem('submissions') || '[]');
            local = local.filter(s =>
                !(s.user_id === currentUser.user_id && s.subject === currentSubject)
            );
            local.push(...userSubmissions);
            localStorage.setItem('submissions', JSON.stringify(local));
        } catch (err) {
            console.warn('Supabase fetch failed, using localStorage:', err);
            const local = JSON.parse(localStorage.getItem('submissions') || '[]');
            userSubmissions = local.filter(s =>
                s.user_id === currentUser.user_id && s.subject === currentSubject
            );
        }
    } else {
        const local = JSON.parse(localStorage.getItem('submissions') || '[]');
        userSubmissions = local.filter(s =>
            s.user_id === currentUser.user_id && s.subject === currentSubject
        );
    }

    // ── Permissions fetch from admin_worksheets ──
    let permissions = {};
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('admin_worksheets')
                .select('worksheet_number, is_open')
                .eq('subject', currentSubject);

            if (data) {
                data.forEach(p => {
                    permissions[p.worksheet_number] = p.is_open;
                });
            }
            console.log('✓ Permissions fetched:', permissions);
        } catch (err) {
            console.warn('Permissions fetch failed:', err);
        }
    }
    // Permissions fetch ke neeche yeh add karo
        let section1Urls = {};
        if (supabaseClient) {
            try {
                const { data } = await supabaseClient
                    .from('admin_worksheets')
                    .select('worksheet_number, section1_url')
                    .eq('subject', currentSubject);

                if (data) {
                    data.forEach(p => {
                        section1Urls[p.worksheet_number] = p.section1_url;
                    });
                }
                console.log('✓ Section1 URLs fetched:', section1Urls);
            } catch (err) {
                console.warn('Section1 URLs fetch failed:', err);
            }
        }

    // ── Grades fetch ──
    let userGrades = [];
    if (supabaseClient) {
        try {
           const { data } = await supabaseClient
            .from('submissions')
            .select('worksheet_id, grade')
            .eq('user_id', currentUser.user_id)
            .eq('subject', currentSubject)
            .not('grade', 'is', null);
            if (data) userGrades = data;
        } catch (e) { console.warn('Grades fetch failed'); }
    }

    // ── FIX 4: Expired sessions fetch ──
    // Woh worksheets jinki session expire ho gayi aur submit nahi hui
    let expiredWorksheetIds = new Set();
    if (supabaseClient) {
        try {
            const now = new Date().toISOString();
            const { data: expiredSessions } = await supabaseClient
                .from('worksheet_opens')
                .select('worksheet_id, expires_at, status')
                .eq('user_id', currentUser.user_id)
                .eq('subject', currentSubject);

            if (expiredSessions) {
                expiredSessions.forEach(s => {
                    // Status expired hai ya time nikal gaya
                    if (s.status === 'expired' || new Date(s.expires_at) < new Date()) {
                        expiredWorksheetIds.add(Number(s.worksheet_id));
                    }
                });
            }
            console.log('✓ Expired worksheet IDs:', [...expiredWorksheetIds]);
        } catch (err) {
            console.warn('Expired sessions fetch failed:', err);
        }
    }

    // ── Cards render ──
    worksheetsGrid.innerHTML = worksheets.map(worksheet => {
        const submission = userSubmissions.find(s =>
            Number(s.worksheet_id) === Number(worksheet.id)
        );
        const isSubmitted = !!submission;
        const isOpen = permissions[worksheet.id] === true;

        // Already submitted
        if (isSubmitted) {
            const hasChecked = !!submission.checked_paper_url;
          const gradeData = userGrades.find(g =>
    Number(g.worksheet_id) === Number(worksheet.id)
);
            return `
               <div class="worksheet-card worksheet-submitted">
                 <h3>${worksheet.title}</h3>
                 <p>${worksheet.description}</p>
                 <div class="worksheet-actions">
                     <button class="btn-view btn-disabled" disabled
                         style="opacity:0.5;cursor:not-allowed;background:#ccc;color:#555;">
                         🔒 Locked — Already Submitted
                     </button>
                 </div>
                 <div class="submission-status completed">
                     ✓ Submitted on ${new Date(submission.submission_date).toLocaleDateString()}
                 </div>

                 ${gradeData ? `
                 <div style="margin-top:0.75rem;padding:1rem;
                             background:linear-gradient(135deg,#ede7f6,#e8eaf6);
                             border-radius:12px;border:1px solid #b39ddb;text-align:center;">
                     <div style="font-size:0.8rem;font-weight:600;color:#6c63ff;margin-bottom:0.4rem;">
                         📊 Your Grade
                     </div>
                     <div style="font-size:2rem;font-weight:700;color:#4527a0;">
                         ${gradeData.grade}
                     </div>
                 </div>` : `
                 <div style="margin-top:0.75rem;padding:0.6rem;background:#f5f5f5;
                             border-radius:8px;color:#999;font-size:0.82rem;text-align:center;">
                     ⏳ Grade not available 
                 </div>`}
                 
                 ${hasChecked ? `
                     <div style="margin-top:0.75rem; padding:0.75rem;
                                 background:linear-gradient(135deg,#e8f5e9,#f1f8e9);
                                 border-radius:10px; border:1px solid #a5d6a7;">
                         <div style="font-weight:600; color:#2e7d32; margin-bottom:0.5rem; font-size:0.9rem;">
                             Your checked paper is ready!
                         </div>
                         <a href="${submission.checked_paper_url}" target="_blank"
                             style="display:block; width:100%; padding:0.6rem;
                                    background:#2e7d32; color:white; border-radius:8px;
                                    text-align:center; font-weight:600; font-size:0.85rem;
                                    text-decoration:none;">
                             ⬇️ Download Checked Paper
                         </a>
                     </div>
                 ` : `
                     <div style="margin-top:0.75rem; padding:0.6rem; background:#fff8e1;
                                 border-radius:8px; border:1px solid #ffe082;
                                 color:#f57f17; font-size:0.82rem; text-align:center;">
                         Checked paper not available yet – available soon
                     </div>
                 `}
             </div>`;
        }

        // ── FIX 5: Session expire ho gayi, submit nahi ki ──
        if (expiredWorksheetIds.has(Number(worksheet.id))) {
            return `
            <div class="worksheet-card" style="opacity:0.85; border: 1.5px solid #ff4d6d33;">
                <h3>${worksheet.title}</h3>
                <p>${worksheet.description}</p>
                <div class="worksheet-actions">
                    <button class="btn-view" disabled
                        style="opacity:0.5;cursor:not-allowed;background:#ff4d6d;color:white;">
                        ⏰ Session Expired
                    </button>
                </div>
                <div class="submission-status" style="color:#ff4d6d; font-weight:600;">
                    🔒 Time limit crossed — Not submitted
                </div>
                <div style="margin-top:0.6rem; padding:0.6rem; background:#fff0f0;
                            border-radius:8px; border:1px solid #ff4d6d55;
                            color:#c0392b; font-size:0.82rem; text-align:center;">
                    120-minute window expired. Contact your instructor for help.
                </div>
            </div>`;
        }

        // Admin ne abhi open nahi kiya
        if (!isOpen) {
            return `
            <div class="worksheet-card" style="opacity:0.75;">
                <h3>${worksheet.title}</h3>
                <p>${worksheet.description}</p>
                <div class="worksheet-actions">
                    <button class="btn-view" disabled
                        style="opacity:0.5;cursor:not-allowed;background:#aaa;color:#555;">
                        🔒 Not Available Yet
                    </button>
                </div>
                <div class="submission-status" style="color:#f4a261;">
                    Not opened yet
                </div>
            </div>`;
        }

        // Open hai — student khole
        return `
        <div class="worksheet-card">
            <h3>${worksheet.title}</h3>
            <p>${worksheet.description}</p>
            <div class="worksheet-actions">
                    ${section1Urls[worksheet.id] 
                ? `<button class="btn-view" onclick="window.open('${section1Urls[worksheet.id]}', '_blank')">
                    View Section - I
                </button>`
                : `<button class="btn-view" disabled style="opacity:0.5;cursor:not-allowed;background:#aaa;color:#555;">
                    🔒 Section I Not Available
                </button>`
            }
                <button class="btn-view" onclick="openTimedPDF(${worksheet.id})">
                    View Section -II
                </button>
                <input type="file" id="upload-${worksheet.id}"
                       class="upload-input" accept=".pdf,.doc,.docx"
                       onchange="handleUpload(event, ${worksheet.id})">
            </div>
            <div class="submission-status">Not submitted yet</div>
        </div>`;

    }).join('');
}
async function fetchSection1Url(worksheetId) {
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('admin_worksheets')
                .select('section1_url')
                .eq('subject', currentSubject)
                .eq('worksheet_number', worksheetId)
                .single();
            if (data?.section1_url) return data.section1_url;
        } catch (e) {
            console.warn('Section1 URL fetch failed');
        }
    }
    return null;
}

async function handleUpload(event, worksheetId) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF or Word document.');
        return;
    }

    const uploadBtn = event.target.previousElementSibling;
    const originalText = uploadBtn.textContent;
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;

    try {
        const uploadResult = await uploadWorksheet(file, currentSubject, worksheetId);

        const submission = {
            id: Date.now(),
            user_id: currentUser.user_id,
            student_name: currentUser.full_name || currentUser.username || 'Unknown',
            subject: currentSubject,
            worksheet_id: worksheetId,
            worksheet_title: `Worksheet ${worksheetId}`,
            file_name: file.name,
            file_size: file.size,
            file_path: uploadResult ? uploadResult.filePath : null,
            file_url: uploadResult ? uploadResult.publicUrl : null,
            submission_date: new Date().toISOString()
        };

        if (supabaseClient) {
            try {
                await supabaseClient.from('submissions').insert([submission]).select();
                console.log('✓ Saved to Supabase');
            } catch (error) {
                console.log('Supabase error, using localStorage');
            }
        }

        let submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
        submissions = submissions.filter(s =>
            !(s.user_id === currentUser.user_id &&
                s.subject === currentSubject &&
                s.worksheet_id === worksheetId)
        );
        submissions.push(submission);
        localStorage.setItem('submissions', JSON.stringify(submissions));

        alert('Worksheet uploaded successfully!');
        await loadSubjectPage();
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file. Please try again.');
        uploadBtn.textContent = originalText;
        uploadBtn.disabled = false;
    }
}

function goBack() { window.location.href = 'dashboard.html'; }

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedSubject');
    window.location.href = 'index.html';
}

// Auto-refresh every 30 seconds
setInterval(async function () {
    if (currentUser && currentSubject) {
        console.log('Auto-refreshing worksheet data...');
        await syncWorksheets();
        loadWorksheets();
    }
}, 30000);