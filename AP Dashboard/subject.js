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
    'AP Calculus AB': ['Limits and Continuity', 'Derivatives: Definition and Fundamental Properties', 'Derivatives: Applications', 'Integration and Accumulation of Change', 'Differential Equations', 'Applications of Integration'],
    'AP Calculus BC': ['Limits and Continuity', 'Derivatives', 'Integration and Accumulation', 'Differential Equations and Mathematical Modeling', 'Series and Sequences', 'Parametric Equations, Polar Coordinates, and Vector-Valued Functions'],
    'AP Physics 1': ['Kinematics', 'Dynamics', 'Circular Motion and Gravitation', 'Energy', 'Momentum', 'Simple Harmonic Motion', 'Torque and Rotational Motion', 'Electric Charge and Electric Force', 'DC Circuits', 'Mechanical Waves and Sound'],
    'AP Physics 2': ['Fluids', 'Thermodynamics', 'Electric Force, Field, and Potential', 'Electric Circuits', 'Magnetism and Electromagnetic Induction', 'Geometric and Physical Optics', 'Quantum, Atomic, and Nuclear Physics'],
    'AP Physics C: Mechanics': ['Kinematics', 'Newton\'s Laws of Motion', 'Work, Energy and Power', 'Systems of Particles and Linear Momentum', 'Circular Motion and Rotation', 'Oscillations', 'Gravitation'],
    'AP Physics C: E&M': ['Electrostatics', 'Conductors, Capacitors, Dielectrics', 'Electric Circuits', 'Magnetic Fields', 'Electromagnetism', 'Electromagnetic Induction'],
    'AP Chemistry': ['Atomic Structure and Properties', 'Molecular and Ionic Compound Structure and Properties', 'Intermolecular Forces and Properties', 'Chemical Reactions', 'Kinetics', 'Thermodynamics', 'Equilibrium', 'Acids and Bases', 'Applications of Thermodynamics'],
    'AP Biology': ['Chemistry of Life', 'Cell Structure and Function', 'Cellular Energetics', 'Cell Communication and Cell Cycle', 'Heredity', 'Gene Expression and Regulation', 'Natural Selection', 'Ecology'],
    'AP Statistics': ['Exploring One-Variable Data', 'Exploring Two-Variable Data', 'Collecting Data', 'Probability, Random Variables, and Probability Distributions', 'Sampling Distributions', 'Inference for Categorical Data: Proportions', 'Inference for Quantitative Data: Means', 'Inference for Categorical Data: Chi-Square', 'Inference for Quantitative Data: Slopes'],
    'AP Computer Science A': ['Primitive Types', 'Using Objects', 'Boolean Expressions and if Statements', 'Iteration', 'Writing Classes', 'Array', 'ArrayList', '2D Array', 'Inheritance', 'Recursion'],
    'AP Computer Science Principles': ['Creative Development', 'Data', 'Algorithms and Programming', 'Computer Systems and Networks', 'Impact of Computing'],
    'AP English Language': ['Rhetorical Situation', 'Claims and Evidence', 'Reasoning and Organization', 'Style', 'Argumentation'],
    'AP English Literature': ['Short Fiction', 'Poetry', 'Longer Fiction or Drama', 'Literary Argumentation'],
    'AP US History': ['Period 1: 1491-1607', 'Period 2: 1607-1754', 'Period 3: 1754-1800', 'Period 4: 1800-1848', 'Period 5: 1844-1877', 'Period 6: 1865-1898', 'Period 7: 1890-1945', 'Period 8: 1945-1980', 'Period 9: 1980-Present'],
    'AP World History': ['The Global Tapestry (1200-1450)', 'Networks of Exchange (1200-1450)', 'Land-Based Empires (1450-1750)', 'Transoceanic Interconnections (1450-1750)', 'Revolutions (1750-1900)', 'Consequences of Industrialization (1750-1900)', 'Global Conflict (1900-present)', 'Cold War and Decolonization (1900-present)', 'Globalization (1900-present)']
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== SUBJECT PAGE LOADING ===');
    
    // Initialize Supabase
    if (typeof initSupabase === 'function') {
        initSupabase();
    }
    
    // Check authentication
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    console.log('Current user:', currentUser.full_name || currentUser.username);
    
    // Get selected subject
    currentSubject = localStorage.getItem('selectedSubject');
    console.log('Selected subject:', currentSubject);
    
    if (!currentSubject) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Load page with latest data
    loadSubjectPage();
});

async function loadSubjectPage() {
    // Sync worksheets from database
    await syncWorksheets();
    
    // Display student name
    document.getElementById('studentName').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('subjectTitle').textContent = currentSubject;
    
    // Load topics
    loadTopics();
    
    // Load worksheets
    loadWorksheets();
}

async function syncWorksheets() {
    // Get latest admin worksheets and submissions from Supabase
    if (supabaseClient) {
        try {
            // Sync submissions
            const { data: submissionsData } = await supabaseClient
                .from('submissions')
                .select('*')
                .eq('user_id', currentUser.user_id);
            
            if (submissionsData && submissionsData.length > 0) {
                // Merge with localStorage
                let localSubmissions = JSON.parse(localStorage.getItem('submissions') || '[]');
                
                // Remove old entries for this user
                localSubmissions = localSubmissions.filter(s => s.user_id !== currentUser.user_id);
                
                // Add latest from database
                localSubmissions.push(...submissionsData);
                
                // Save back
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

function loadWorksheets() {
    const worksheetsGrid = document.getElementById('worksheetsGrid');
    
    // Generate 10 worksheets
    const worksheets = [];
    for (let i = 1; i <= 10; i++) {
        worksheets.push({
            id: i,
            title: `Worksheet ${i}`,
            description: `Practice problems and exercises for ${currentSubject}`
        });
    }
    
    // Get user submissions (synced data)
    const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
    const userSubmissions = submissions.filter(s => 
        s.user_id === currentUser.user_id && s.subject === currentSubject
    );
    
    console.log('User has submitted', userSubmissions.length, 'worksheets for', currentSubject);
    
    worksheetsGrid.innerHTML = worksheets.map(worksheet => {
        const submission = userSubmissions.find(s => s.worksheet_id === worksheet.id);
        const isSubmitted = !!submission;
        
        return `
            <div class="worksheet-card">
                <h3>${worksheet.title}</h3>
                <p>${worksheet.description}</p>
                
                <div class="worksheet-actions">
                    <button class="btn-view" onclick="viewWorksheet(${worksheet.id})">
                        View PDF
                    </button>
                    <button class="btn-upload" onclick="document.getElementById('upload-${worksheet.id}').click()">
                        ${isSubmitted ? 'Resubmit' : 'Upload'}
                    </button>
                    <input type="file" id="upload-${worksheet.id}" class="upload-input" 
                           accept=".pdf,.doc,.docx" 
                           onchange="handleUpload(event, ${worksheet.id})">
                </div>
                
                ${isSubmitted ? `
                    <div class="submission-status completed">
                        ✓ Submitted on ${new Date(submission.submission_date).toLocaleDateString()}
                    </div>
                ` : `
                    <div class="submission-status">
                        Not submitted yet
                    </div>
                `}
            </div>
        `;
    }).join('');
}

async function viewWorksheet(worksheetId) {
    console.log('Viewing worksheet:', worksheetId, 'for', currentSubject);
    
    // Try Supabase first
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('admin_worksheets')
                .select('*')
                .eq('subject', currentSubject)
                .eq('worksheet_number', worksheetId);
            
            if (data && data.length > 0 && data[0].file_url) {
                console.log('✓ Opening worksheet from Supabase');
                window.open(data[0].file_url, '_blank');
                return;
            }
        } catch (error) {
            console.log('Checking localStorage...');
        }
    }
    
    // Fallback to localStorage
    const adminWorksheets = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
    const worksheet = adminWorksheets.find(w => 
        w.subject === currentSubject && w.worksheet_number === worksheetId
    );
    
    if (worksheet && worksheet.file_url) {
        console.log('✓ Opening worksheet from localStorage');
        window.open(worksheet.file_url, '_blank');
    } else {
        alert(`Worksheet ${worksheetId} has not been uploaded yet.\n\nPlease contact your instructor.`);
    }
}

async function handleUpload(event, worksheetId) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
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
        
        // Upload file
        const uploadResult = await uploadWorksheet(file, currentSubject, worksheetId);
        
        // Create submission
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
        
        // Save to Supabase
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
        
        // Always save to localStorage for immediate update
        let submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
        
        // Remove previous submission
        submissions = submissions.filter(s => 
            !(s.user_id === currentUser.user_id && 
              s.subject === currentSubject && 
              s.worksheet_id === worksheetId)
        );
        
        submissions.push(submission);
        localStorage.setItem('submissions', JSON.stringify(submissions));
        
        alert('Worksheet uploaded successfully!');
        
        // Reload to show updated status
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

// Auto-refresh every 30 seconds to show new admin worksheets
setInterval(async function() {
    if (currentUser && currentSubject) {
        console.log('Auto-refreshing worksheet data...');
        await syncWorksheets();
        loadWorksheets();
    }
}, 30000);