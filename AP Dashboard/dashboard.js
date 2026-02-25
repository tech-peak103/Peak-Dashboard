// Dashboard JavaScript

let currentUser = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DASHBOARD LOADING ===');
    
    // Check authentication
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        console.log('No user, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    console.log('Logged in as:', currentUser.full_name || currentUser.username);
    
    // Check if admin trying to access student dashboard
    if (currentUser.role === 'admin') {
        console.log('Admin detected, redirecting to admin page');
        window.location.href = 'admin.html';
        return;
    }
    
    // Initialize Supabase if needed
    if (typeof initSupabase === 'function' && !supabaseClient) {
        initSupabase();
    }
    
    // Load dashboard with latest data
    loadDashboard();
});

async function loadDashboard() {
    console.log('Loading dashboard for user:', currentUser.user_id);
    
    // Sync user data from database first
    await syncUserData();
    
    // Display student name
    document.getElementById('studentName').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('welcomeName').textContent = (currentUser.full_name || currentUser.username).split(' ')[0];
    
    // Display subjects
    const subjectsDashboard = document.getElementById('subjectsDashboard');
    subjectsDashboard.innerHTML = ''; // Clear existing content
    
    if (!currentUser.subjects || currentUser.subjects.length === 0) {
        subjectsDashboard.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No subjects enrolled yet.</p>';
        return;
    }
    
    console.log('Loading subjects:', currentUser.subjects);
    
    // Create subject cards
    currentUser.subjects.forEach(subject => {
        const card = createSubjectCard(subject);
        subjectsDashboard.appendChild(card);
    });
}

async function syncUserData() {
    // Try to get latest data from Supabase
    if (supabaseClient && currentUser.user_id) {
        try {
            const { data, error } = await supabaseClient
                .from('students')
                .select('*')
                .eq('user_id', currentUser.user_id)
                .maybeSingle();
            
            if (data) {
                // Update currentUser with latest data
                currentUser = { ...data, role: 'student' };
                // Save back to localStorage
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                console.log('✓ User data synced from Supabase');
            }
        } catch (error) {
            console.log('Using cached user data');
        }
    }
}

function createSubjectCard(subjectName) {
    const card = document.createElement('div');
    card.className = 'subject-card';
    
    // Get worksheet completion with real-time sync
    const progress = getSubjectProgress(subjectName);
    
    card.innerHTML = `
        <h3>${subjectName}</h3>
        <p>Access course materials, view topics, and submit worksheets.</p>
        <div class="progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">${progress}% Complete</div>
        </div>
    `;
    
    card.addEventListener('click', function() {
        openSubject(subjectName);
    });
    
    return card;
}

function getSubjectProgress(subjectName) {
    // Get submissions from localStorage (this gets updated in real-time)
    const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
    
    // Filter for this user and this subject
    const userSubmissions = submissions.filter(s => 
        s.user_id === currentUser.user_id && s.subject === subjectName
    );
    
    console.log(`Subject "${subjectName}": ${userSubmissions.length} worksheets completed`);
    
    // Calculate progress based on number of worksheets submitted
    // Each subject has 10 worksheets
    const totalWorksheets = 10;
    const completedWorksheets = userSubmissions.length;
    const progress = Math.round((completedWorksheets / totalWorksheets) * 100);
    
    return progress;
}

function openSubject(subjectName) {
    console.log('Opening subject:', subjectName);
    
    // Store selected subject
    localStorage.setItem('selectedSubject', subjectName);
    
    // Navigate to subject page
    window.location.href = 'subject.html';
}

function logout() {
    console.log('Logging out user:', currentUser.full_name);
    
    // Clear only currentUser, keep other data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedSubject');
    
    // Redirect to login
    window.location.href = 'index.html';
}

// Auto-refresh dashboard every 30 seconds to show new worksheets
setInterval(async function() {
    if (currentUser && currentUser.role === 'student') {
        console.log('Auto-refreshing dashboard data...');
        await loadDashboard();
    }
}, 30000); // 30 seconds