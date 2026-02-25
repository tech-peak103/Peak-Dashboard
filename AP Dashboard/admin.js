// Admin Dashboard JavaScript

let currentUser = null;
let students = [];
let submissions = [];

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN PAGE LOADING ===');
    
    // Check authentication
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
        console.log('No user, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    console.log('User role:', currentUser.role);
    
    // Check if admin
    if (currentUser.role !== 'admin') {
        console.log('Not admin, redirecting to dashboard');
        window.location.href = 'admin.html';
        return;
    }
    
    console.log('✓ Admin authenticated');
    
    // Initialize Supabase
    if (typeof initSupabase === 'function' && !supabaseClient) {
        initSupabase();
    }
    
    // Load admin data
    loadAdminData();
});

async function loadAdminData() {
    console.log('Loading admin data...');
    
    // Reset arrays to force fresh load
    students = [];
    submissions = [];
    
    try {
        // Always try Supabase first
        if (supabaseClient) {
            console.log('Fetching from Supabase...');
            
            const { data: studentsData, error: studentsError } = await supabaseClient
                .from('students')
                .select('*')
                .order('registration_date', { ascending: false });
            
            if (studentsError) {
                console.error('Students query error:', studentsError);
            }
            
            if (studentsData) {
                students = studentsData;
                console.log('✓ Loaded', students.length, 'students from Supabase');
            } else {
                console.log('No students data from Supabase');
            }
            
            const { data: submissionsData, error: submissionsError } = await supabaseClient
                .from('submissions')
                .select('*')
                .order('submission_date', { ascending: false });
            
            if (submissionsError) {
                console.error('Submissions query error:', submissionsError);
            }
            
            if (submissionsData) {
                submissions = submissionsData;
                
                // Update localStorage with latest data
                localStorage.setItem('submissions', JSON.stringify(submissions));
                
                console.log('✓ Loaded', submissions.length, 'submissions from Supabase');
            } else {
                console.log('No submissions data from Supabase');
            }
        } else {
            console.log('⚠ Supabase client not initialized');
        }
    } catch (error) {
        console.error('Supabase error:', error);
    }
    
    // Only use localStorage as fallback if Supabase returned nothing
    if (students.length === 0) {
        students = JSON.parse(localStorage.getItem('students') || '[]');
        console.log('Fallback: Loaded', students.length, 'students from localStorage');
    }
    
    if (submissions.length === 0) {
        submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
        console.log('Fallback: Loaded', submissions.length, 'submissions from localStorage');
    }
    
    console.log('Final count - Students:', students.length, 'Submissions:', submissions.length);
    
    // Update UI
    updateStats();
    loadStudentsTable();
    loadSubmissionsTable();
    loadSubjectAnalytics();
}

function updateStats() {
    // Total students
    document.getElementById('totalStudents').textContent = students.length;
    
    // Active subjects
    const allSubjects = students.flatMap(s => s.subjects || []);
    const uniqueSubjects = [...new Set(allSubjects)];
    document.getElementById('activeSubjects').textContent = uniqueSubjects.length;
    
    // Total submissions
    document.getElementById('totalSubmissions').textContent = submissions.length;
    
    // Total revenue
    const totalRevenue = students.reduce((sum, student) => sum + (student.payment_amount || 0), 0);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
}

function loadStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No students registered yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => {
        // Count completed worksheets
        const studentSubmissions = submissions.filter(s => s.user_id === student.user_id);
        const completedCount = studentSubmissions.length;
        
        // Format date
        const regDate = new Date(student.registration_date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <tr>
                <td><strong>${student.user_id}</strong></td>
                <td>${student.full_name}</td>
                <td>${student.email}</td>
                <td>${student.phone}</td>
                <td>${student.subjects ? student.subjects.length : 0}</td>
                <td><strong style="color: var(--primary-color);">${completedCount}</strong></td>
                <td>${regDate}</td>
                <td><strong>₹${(student.payment_amount || 0).toLocaleString('en-IN')}</strong></td>
            </tr>
        `;
    }).join('');
}

function loadSubmissionsTable() {
    const tbody = document.getElementById('submissionsTableBody');
    
    if (submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No submissions yet</td></tr>';
        return;
    }
    
    // Show latest 20 submissions
    const recentSubmissions = submissions.slice(0, 20);
    
    tbody.innerHTML = recentSubmissions.map(submission => {
        const submissionDate = new Date(submission.submission_date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const fileSize = formatFileSize(submission.file_size);
        
        // Get student name with fallback
        let studentName = submission.student_name;
        
        if (!studentName || studentName === 'undefined') {
            const student = students.find(s => s.user_id === submission.user_id);
            studentName = student ? student.full_name : submission.user_id || 'Unknown';
        }
        
        return `
            <tr>
                <td><strong>${studentName}</strong></td>
                <td>${submission.subject}</td>
                <td>${submission.worksheet_title}</td>
                <td>${submission.file_name}</td>
                <td>${submissionDate}</td>
                <td>${fileSize}</td>
            </tr>
        `;
    }).join('');
}

function loadSubjectAnalytics() {
    const tbody = document.getElementById('subjectsTableBody');
    
    // Get all unique subjects
    const allSubjects = students.flatMap(s => s.subjects || []);
    const uniqueSubjects = [...new Set(allSubjects)];
    
    if (uniqueSubjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No subject data available</td></tr>';
        return;
    }
    
    // Calculate stats
    const subjectStats = uniqueSubjects.map(subject => {
        const enrolledStudents = students.filter(s => 
            s.subjects && s.subjects.includes(subject)
        ).length;
        
        const subjectSubmissions = submissions.filter(s => s.subject === subject).length;
        
        const totalPossibleSubmissions = enrolledStudents * 10;
        const completionRate = totalPossibleSubmissions > 0 
            ? Math.round((subjectSubmissions / totalPossibleSubmissions) * 100)
            : 0;
        
        return {
            subject,
            enrolledStudents,
            subjectSubmissions,
            completionRate
        };
    });
    
    // Sort by enrollment
    subjectStats.sort((a, b) => b.enrolledStudents - a.enrolledStudents);
    
    tbody.innerHTML = subjectStats.map(stat => `
        <tr>
            <td><strong>${stat.subject}</strong></td>
            <td>${stat.enrolledStudents}</td>
            <td>${stat.subjectSubmissions}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="flex: 1; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${stat.completionRate}%; height: 100%; background: var(--gradient-primary); border-radius: 4px;"></div>
                    </div>
                    <span style="font-weight: 600; color: var(--primary-color);">${stat.completionRate}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function logout() {
    console.log('Admin logging out');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Auto-refresh data every 10 seconds
setInterval(async function() {
    if (currentUser && currentUser.role === 'admin') {
        console.log('Auto-refreshing admin data...');
        await loadAdminData();
    }
}, 10000); // 10 seconds