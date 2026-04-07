// Subject Page JavaScript

let currentUser = null;
let currentSubject = null;

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
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Upload error:', error);
            throw error;
        }

        const { data: urlData } = supabaseClient
            .storage
            .from('worksheets')
            .getPublicUrl(filePath);

        return {
            filePath: filePath,
            publicUrl: urlData.publicUrl
        };
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

const TIMER_DURATION_MS = 60 * 60 * 1000; // 60 minutes
let pdfTimerInterval = null;
let pdfExpiresAt = null;
let fiveMinWarnShown = false;
let currentOpenWorksheetId = null; // track which worksheet is currently open
let currentOpenRecordId = null;   // Supabase row id of the worksheet_opens record

// ── Track PDF open in Supabase worksheet_opens table ──
// Status values: 'active' = PDF opened, 'submitted' = submitted before expire, 'expired' = time ran out
async function trackPDFOpen(worksheetId) {
    const openRecord = {
        user_id: currentUser.user_id,
        student_name: currentUser.full_name || currentUser.username || 'Unknown',
        subject: currentSubject,
        worksheet_id: worksheetId,
        opened_at: new Date().toISOString(),
        status: 'active'
    };

    currentOpenRecordId = null; // reset

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('worksheet_opens')
                .insert([openRecord])
                .select()
                .single();

            if (error) {
                console.warn('worksheet_opens insert error:', error.message);
            } else {
                currentOpenRecordId = data.id;
                console.log('✓ PDF open tracked in Supabase, record id:', currentOpenRecordId);
            }
        } catch (err) {
            console.warn('Could not track PDF open in Supabase:', err);
        }
    }

    // Backup in localStorage
    const localId = Date.now();
    if (!currentOpenRecordId) currentOpenRecordId = `local_${localId}`;
    const opens = JSON.parse(localStorage.getItem('worksheet_opens') || '[]');
    opens.push({ ...openRecord, id: currentOpenRecordId });
    localStorage.setItem('worksheet_opens', JSON.stringify(opens));
    console.log('✓ PDF open tracked in localStorage');
}

// ── Update worksheet_opens status in backend ──
async function updateOpenStatus(status) {
    if (!currentOpenRecordId) return;

    const updateData = { status, updated_at: new Date().toISOString() };

    // Update Supabase (only if it's a real DB id, not local_xxx)
    if (supabaseClient && !String(currentOpenRecordId).startsWith('local_')) {
        try {
            const { error } = await supabaseClient
                .from('worksheet_opens')
                .update(updateData)
                .eq('id', currentOpenRecordId);

            if (error) {
                console.warn('Status update error:', error.message);
            } else {
                console.log(`✓ worksheet_opens status updated to "${status}" in Supabase`);
            }
        } catch (err) {
            console.warn('Could not update status in Supabase:', err);
        }
    }

    // Update localStorage
    const opens = JSON.parse(localStorage.getItem('worksheet_opens') || '[]');
    const idx = opens.findIndex(o => String(o.id) === String(currentOpenRecordId));
    if (idx !== -1) {
        opens[idx].status = status;
        opens[idx].updated_at = updateData.updated_at;
        localStorage.setItem('worksheet_opens', JSON.stringify(opens));
    }
    console.log(`✓ worksheet_opens status updated to "${status}" in localStorage`);
}

// ── Upload file from inside the PDF overlay ──
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

        // Save to Supabase
        if (supabaseClient) {
            try {
                await supabaseClient
                    .from('submissions')
                    .insert([submission])
                    .select();
                console.log('✓ Submission saved to Supabase');
            } catch (error) {
                console.log('Supabase error, saving to localStorage only');
            }
        }

        // Save to localStorage
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

        // ── Update backend status to 'submitted' ──
        await updateOpenStatus('submitted');

        // ── Expire PDF immediately after submit ──
        if (pdfTimerInterval) {
            clearInterval(pdfTimerInterval);
            pdfTimerInterval = null;
        }
        expirePDFOverlay('submitted');

        alert('Worksheet submitted successfully!');

        // Refresh worksheet cards in background
        loadWorksheets();

    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file. Please try again.');
        btn.textContent = '📤 Submit Worksheet';
        btn.disabled = false;
    }

    // Reset file input so same file can be re-selected
    event.target.value = '';
}

// Open PDF inside the same page overlay with 60-min timer
async function openTimedPDF(worksheetId) {
    console.log('Opening timed PDF for worksheet:', worksheetId);
    const allSubmissions = JSON.parse(localStorage.getItem('submissions') || '[]');
    const alreadySubmitted = allSubmissions.find(s =>
        s.user_id === currentUser.user_id &&
        s.subject === currentSubject &&
        Number(s.worksheet_id) === Number(worksheetId)
    );
    if (alreadySubmitted) {
        alert('🔒 Yeh worksheet aap pehle submit kar chuke hain. Ab ise dobara open nahi kar sakte.');
        return;
    }

    let pdfUrl = null;

    // 1️⃣ Fetch PDF URL from Supabase
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('admin_worksheets')
                .select('file_url')
                .eq('subject', currentSubject)
                .eq('worksheet_number', worksheetId)
                .single();

            if (data && data.file_url) {
                pdfUrl = data.file_url;
            }
        } catch (error) {
            console.log('Supabase fetch failed, checking localStorage');
        }
    }

    // 2️⃣ Fallback: localStorage
    if (!pdfUrl) {
        const adminWorksheets = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
        const worksheet = adminWorksheets.find(w =>
            w.subject === currentSubject && w.worksheet_number === worksheetId
        );
        if (worksheet && worksheet.file_url) {
            pdfUrl = worksheet.file_url;
        }
    }

    // 3️⃣ PDF not found
    if (!pdfUrl) {
        alert(`Worksheet ${worksheetId} PDF not available yet. Please contact your instructor.`);
        return;
    }

    // 4️⃣ Set current worksheet ID
    currentOpenWorksheetId = worksheetId;

    // 5️⃣ Load PDF into overlay iframe
    document.getElementById('pdfFrame').src = pdfUrl;
    document.getElementById('expiredScreen').classList.remove('show');
    document.getElementById('pdfFrame').style.display = 'block';
    document.getElementById('pdfWorksheetLabel').textContent =
        `${currentSubject} — Worksheet ${worksheetId}`;

    // 6️⃣ Reset submit button state
    const btn = document.getElementById('btnSubmitInPDF');
    btn.textContent = '📤 Submit Worksheet';
    btn.style.background = '';
    btn.style.display = '';
    btn.disabled = false;

    // 7️⃣ Show overlay
    document.getElementById('pdfOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';

    // 8️⃣ Track PDF open in backend
    await trackPDFOpen(worksheetId);

    // 9️⃣ Start 60-minute countdown
    pdfExpiresAt = Date.now() + TIMER_DURATION_MS;
    fiveMinWarnShown = false;

    if (pdfTimerInterval) clearInterval(pdfTimerInterval);
    pdfTimerInterval = setInterval(tickPDFTimer, 1000);
    tickPDFTimer();
}

function tickPDFTimer() {
    const now = Date.now();
    const remaining = Math.max(0, pdfExpiresAt - now);
    const secondsLeft = Math.ceil(remaining / 1000);

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;

    // Update display
    document.getElementById('timerDisplay').textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Progress bar
    const pct = (remaining / TIMER_DURATION_MS) * 100;
    const fill = document.getElementById('pdfProgressFill');
    fill.style.width = pct + '%';

    // Color stages
    const wrapper = document.getElementById('timerWrapper');
    if (secondsLeft <= 300) {
        // Under 5 min — danger
        wrapper.classList.remove('warn');
        wrapper.classList.add('danger');
        fill.style.background = '#ff4d6d';

        if (!fiveMinWarnShown) {
            fiveMinWarnShown = true;
            showFiveMinToast();
        }
    } else if (secondsLeft <= 900) {
        // Under 15 min — warning
        wrapper.classList.add('warn');
        fill.style.background = '#ffd166';
    }

    // Time up — expire PDF
    if (remaining <= 0) {
        clearInterval(pdfTimerInterval);
        pdfTimerInterval = null;
        expirePDFOverlay('expired');
    }
}

function expirePDFOverlay(reason = 'expired') {
    // Update backend status
    updateOpenStatus(reason);

    // Destroy PDF content
    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('pdfFrame').style.display = 'none';

    // Hide submit button
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
        // Show "View Answers" button only after submit
        btnAnswers.classList.add('visible');
    } else {
        expIcon.textContent = '🔒';
        expTitle.textContent = 'Session Expired';
        expTitle.style.color = '#ff4d6d';
        expMsg.innerHTML = 'Your 60-minute access window has ended.<br>This worksheet is no longer available.<br>Please contact your instructor if you need more time.';
        // Hide "View Answers" on expire
        btnAnswers.classList.remove('visible');
    }

    expiredScreen.classList.add('show');
    document.getElementById('timerDisplay').textContent = '00:00';
}

// ── Fetch and open answer PDF from backend ──
async function openAnswerPDF() {
    const btn = document.getElementById('btnViewAnswers');
    btn.textContent = 'Loading...';
    btn.disabled = true;

    let answerUrl = null;

    // Fetch from Supabase admin_worksheets table (answer_url column)
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('admin_worksheets')
                .select('answer_url')
                .eq('subject', currentSubject)
                .eq('worksheet_number', currentOpenWorksheetId)
                .single();

            if (data && data.answer_url) {
                answerUrl = data.answer_url;
            }
        } catch (error) {
            console.log('Supabase answer fetch failed, checking localStorage');
        }
    }

    // Fallback: localStorage
    if (!answerUrl) {
        const adminWorksheets = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
        const ws = adminWorksheets.find(w =>
            w.subject === currentSubject && w.worksheet_number === currentOpenWorksheetId
        );
        if (ws && ws.answer_url) answerUrl = ws.answer_url;
    }

    btn.textContent = '📋 View Answers';
    btn.disabled = false;

    if (!answerUrl) {
        alert('Answer PDF has not been uploaded yet by your instructor.');
        return;
    }

    // Open in new tab
    window.open(answerUrl, '_blank');
}

// ── Close overlay and go back to subject page ──
function closeAndGoBack() {
    // Stop timer if still running
    if (pdfTimerInterval) {
        clearInterval(pdfTimerInterval);
        pdfTimerInterval = null;
    }

    // Hide overlay
    document.getElementById('pdfOverlay').classList.remove('active');
    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('expiredScreen').classList.remove('show');
    document.getElementById('pdfFrame').style.display = 'block';
    document.body.style.overflow = '';

    // Reset submit button
    const btn = document.getElementById('btnSubmitInPDF');
    btn.textContent = '📤 Submit Worksheet';
    btn.style.background = '';
    btn.style.display = '';
    btn.disabled = false;

    // Reset timer UI
    document.getElementById('timerDisplay').textContent = '60:00';
    document.getElementById('timerWrapper').classList.remove('warn', 'danger');
    document.getElementById('pdfProgressFill').style.width = '100%';
    document.getElementById('pdfProgressFill').style.background =
        'linear-gradient(90deg, #6c63ff, #06d6a0)';
    document.getElementById('btnViewAnswers').classList.remove('visible');
}

function showFiveMinToast() {
    const toast = document.getElementById('fiveMinToast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 6000);
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
        // ESC to close
        if (e.key === 'Escape') {
            closePDFOverlay();
        }
    }
});

// ══════════════════════════════════════════
//  PAGE INITIALIZATION
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    console.log('=== SUBJECT PAGE LOADING ===');

    if (typeof initSupabase === 'function') {
        initSupabase();
    }

    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = JSON.parse(userStr);
    console.log('Current user:', currentUser.full_name || currentUser.username);

    currentSubject = localStorage.getItem('selectedSubject');
    console.log('Selected subject:', currentSubject);

    if (!currentSubject) {
        window.location.href = 'dashboard.html';
        return;
    }

    loadSubjectPage();
});

async function loadSubjectPage() {
    await syncWorksheets();

    document.getElementById('studentName').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('subjectTitle').textContent = currentSubject;

    loadTopics();
    loadWorksheets();
}

async function syncWorksheets() {
    if (supabaseClient) {
        try {
            const { data: submissionsData } = await supabaseClient
                .from('submissions')
                .select('*')
                .eq('user_id', currentUser.user_id);

            if (submissionsData && submissionsData.length > 0) {
                let localSubmissions = JSON.parse(localStorage.getItem('submissions') || '[]');
                localSubmissions = localSubmissions.filter(s => s.user_id !== currentUser.user_id);
                localSubmissions.push(...submissionsData);
                localStorage.setItem('submissions', JSON.stringify(localSubmissions));
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

    const topicsHTML = topics.map((topic, index) => `
        <div style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem;">
            <span style="font-weight: 700; color: var(--primary-color); font-size: 1.25rem;">${index + 1}</span>
            <span style="font-weight: 500;">${topic}</span>
        </div>
    `).join('');

    topicsList.innerHTML = topicsHTML;
}

async function loadWorksheets() {
    const worksheetsGrid = document.getElementById('worksheetsGrid');

    // Show loading
    worksheetsGrid.innerHTML = `<p style="color:#7c7f96;padding:1rem;">Loading worksheets...</p>`;

    const worksheets = [];
    for (let i = 1; i <= 26; i++) {
        worksheets.push({
            id: i,
            title: `Worksheet ${i}`,
            description: `Practice problems and exercises for ${currentSubject}`
        });
    }

    // ── Fetch submissions directly from Supabase (source of truth) ──
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

            // Sync back to localStorage
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

    console.log('Total submissions for this subject:', userSubmissions.length);

    worksheetsGrid.innerHTML = worksheets.map(worksheet => {
        const submission = userSubmissions.find(s =>
            Number(s.worksheet_id) === Number(worksheet.id)
        );
        const isSubmitted = !!submission;

        return `
    <div class="worksheet-card ${isSubmitted ? 'worksheet-submitted' : ''}">
        <h3>${worksheet.title}</h3>
        <p>${worksheet.description}</p>

        ${isSubmitted ? `
            <div class="worksheet-actions">
                <button class="btn-view btn-disabled" disabled
                    style="opacity:0.5; cursor:not-allowed; background:#ccc; color:#555;">
                    🔒 Locked — Already Submitted
                </button>
            </div>
            <div class="submission-status completed">
                ✓ Submitted on ${new Date(submission.submission_date).toLocaleDateString()}
            </div>
        ` : `
            <div class="worksheet-actions">
                <button class="btn-view" onclick="openTimedPDF(${worksheet.id})">
                    View PDF
                </button>
                <input type="file" id="upload-${worksheet.id}" class="upload-input"
                       accept=".pdf,.doc,.docx"
                       onchange="handleUpload(event, ${worksheet.id})">
            </div>
            <div class="submission-status">
                Not submitted yet
            </div>
        `}
    </div>
`;
    }).join('');
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
        console.log('=== UPLOADING WORKSHEET ===');

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

        console.log('Submission:', submission);

        if (supabaseClient) {
            try {
                await supabaseClient
                    .from('submissions')
                    .insert([submission])
                    .select();
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

function goBack() {
    window.location.href = 'dashboard.html';
}

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