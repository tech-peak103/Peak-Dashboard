// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================
// IMPORTANT: Replace these with your actual Supabase credentials
// Get them from: Supabase Dashboard → Settings → API

const SUPABASE_URL = 'https://gkloowizszlxzxdhnszm.supabase.co'; // ← Replace this
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbG9vd2l6c3pseHp4ZGhuc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTY5MzQsImV4cCI6MjA3OTc5MjkzNH0.0ZQXY5xKMkP1_pY0mb2RxGFGCMeQZbPU0Zu6DVTRc1o'; // ← Replace this

// Initialize Supabase Client
let supabase = null;
let supabaseEnabled = false;

// Try to initialize Supabase
try {
    // Check if Supabase library is loaded
    if (typeof window.supabase !== 'undefined') {
        // Create client even if credentials look like defaults
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

        // Check if credentials are actually configured
        // Check if credentials are placeholder values only
        if (SUPABASE_URL.includes('your-project') || SUPABASE_KEY === 'your-anon-key') {
            // console.warn('⚠️ SUPABASE NOT CONFIGURED!');
            // console.warn('📝 To enable Supabase backend:');
            // console.warn('1. Go to https://supabase.com');
            // console.warn('2. Create project and run SQL script');
            // console.warn('3. Get URL and Key from Settings → API');
            // console.warn('4. Update main.js lines 6-7 with your credentials');
            // console.warn('5. Currently using localStorage only');
            supabaseEnabled = false;
        } else {
            supabaseEnabled = true;
            // console.log('✅ Supabase connected successfully!');
            // console.log('📊 Data will be saved to Supabase backend');
        }
    } else {
        // console.error('❌ Supabase library not loaded');
        supabaseEnabled = false;
    }
} catch (error) {
    // console.error('❌ Supabase initialization error:', error);
    supabaseEnabled = false;
}

// Razorpay Configuration
const RAZORPAY_KEY = 'rzp_test_YOUR_KEY'; // Replace with your Razorpay Key

const VERIFICATION_INTERVAL = 30000;
let verificationTimer = null;


// Subject data for checkboxes
const subjectsByGradeBoardCheckbox = {
    '10-ISC': ['Accounts', 'Physics', 'Mathematics', 'Chemistry', 'Biology', 'English'],
    '10-CBSE': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi'],
    '10-ICSE': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
    '12-ISC': ['Psychology', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Accounts'],
    '12-CBSE': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'],
    '12-ICSE': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English']
};

// Function to update subjects checkboxes
function updateSubjectsCheckboxes() {
    const grade = document.getElementById('studentGrade').value;
    const board = document.getElementById('studentBoard').value;
    const container = document.getElementById('subjectsCheckboxContainer');

    if (!grade || !board) {
        container.innerHTML = '<p style="grid-column: 1/-1; color: #666; font-size: 14px; margin: 0;">Please select grade and board first</p>';
        return;
    }

    const key = grade + '-' + board;
    const subjects = subjectsByGradeBoardCheckbox[key] || [];

    if (subjects.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; color: #666; font-size: 14px; margin: 0;">No subjects available</p>';
        return;
    }

    container.innerHTML = '';
    subjects.forEach(subject => {
        const div = document.createElement('div');
        div.className = 'subject-checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="subject_${subject}" name="subjects" value="${subject}">
            <label for="subject_${subject}">${subject}</label>
        `;
        container.appendChild(div);
    });
}

// Global State
let currentUser = null;
let currentSubject = null;
let pdfTimer = null;
let testStartTime = null;


// Subject Data for Different Grades and Boards
const subjectsByGradeBoard = {
    '10-ISC': [
        { name: 'Accounts', code: 'ISC-X' },
        { name: 'Physics', code: 'ISC-X' },
        { name: 'Mathematics', code: 'ISC-X' },
        { name: 'Chemistry', code: 'ISC-X' },
        { name: 'Biology', code: 'ISC-X' },
        { name: 'English', code: 'ISC-X' }
    ],
    '10-CBSE': [
        { name: 'Mathematics', code: 'CBSE-X' },
        { name: 'Science', code: 'CBSE-X' },
        { name: 'Social Science', code: 'CBSE-X' },
        { name: 'English', code: 'CBSE-X' },
        { name: 'Hindi', code: 'CBSE-X' }
    ],
    '10-ICSE': [
        { name: 'Mathematics', code: 'ICSE-X' },
        { name: 'Physics', code: 'ICSE-X' },
        { name: 'Chemistry', code: 'ICSE-X' },
        { name: 'Biology', code: 'ICSE-X' },
        { name: 'English', code: 'ICSE-X' }
    ],
    '12-ISC': [
        { name: 'Psychology', code: 'ISC-XII' },
        { name: 'Physics', code: 'ISC-XII' },
        { name: 'Chemistry', code: 'ISC-XII' },
        { name: 'Mathematics', code: 'ISC-XII' },
        { name: 'Biology', code: 'ISC-XII' },
        { name: 'Accounts', code: 'ISC-XII' }
    ],
    '12-CBSE': [
        { name: 'Physics', code: 'CBSE-XII' },
        { name: 'Chemistry', code: 'CBSE-XII' },
        { name: 'Mathematics', code: 'CBSE-XII' },
        { name: 'Biology', code: 'CBSE-XII' },
        { name: 'English', code: 'CBSE-XII' }
    ],
    '12-ICSE': [
        { name: 'Physics', code: 'ICSE-XII' },
        { name: 'Chemistry', code: 'ICSE-XII' },
        { name: 'Mathematics', code: 'ICSE-XII' },
        { name: 'Biology', code: 'ICSE-XII' },
        { name: 'English', code: 'ICSE-XII' }
    ]
};

async function verifyStudentExists() {
    if (!currentUser || !currentUser.email || !supabaseEnabled || !supabase) {
        return;
    }

    try {
        console.log('🔍 Verifying student account...');

        const { data, error } = await supabase
            .from('students')
            .select('id, email, name')
            .eq('email', currentUser.email)
            .single();

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('No rows')) {
                console.warn('⚠️ Student account not found in database!');
                handleStudentRemoved();
                return;
            }
            console.error('❌ Verification error:', error);
            return;
        }

        if (data) {
            console.log('✅ Student account verified');
        } else {
            console.warn('⚠️ Student account has been removed!');
            handleStudentRemoved();
        }

    } catch (error) {
        console.error('❌ Verification check failed:', error);
    }
}

// Handle student removal
function handleStudentRemoved() {
    if (verificationTimer) {
        clearInterval(verificationTimer);
        verificationTimer = null;
    }

    currentUser = null;
    localStorage.removeItem('peakTestUser');

    if (pdfTimer) {
        clearInterval(pdfTimer);
        pdfTimer = null;
    }

    alert('⚠️ Your account has been deactivated.\n\nPlease contact support for more information.\n\nEmail: tech@peakpotentia.com\nPhone: +91 98181 84460');

    window.location.reload();

    console.log('🚪 Student logged out - account removed from backend');
}

// Start verification timer
function startVerificationTimer() {
    if (!supabaseEnabled || !supabase || !currentUser) {
        console.log('ℹ️ Verification not started - Supabase not enabled');
        return;
    }

    console.log('🔐 Starting student verification timer (every 30 seconds)...');

    if (verificationTimer) {
        clearInterval(verificationTimer);
    }

    verifyStudentExists();

    verificationTimer = setInterval(() => {
        verifyStudentExists();
    }, VERIFICATION_INTERVAL);

    console.log('✅ Verification timer started');
}

// Stop verification timer
function stopVerificationTimer() {
    if (verificationTimer) {
        clearInterval(verificationTimer);
        verificationTimer = null;
        console.log('🛑 Verification timer stopped');
    }
}




// Check if user is already logged in
window.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('peakTestUser');
    if (userData) {
        currentUser = JSON.parse(userData);

        if (supabaseEnabled && supabase) {
            console.log('🔍 Verifying student account on page load...');

            try {
                // ✅ FIXED: Fetch dashboard_access
                const { data, error } = await supabase
                    .from('students')
                    .select('id, email, dashboard_access, paid_subjects, test_access')
                    .eq('email', currentUser.email)
                    .single();

                if (error || !data) {
                    console.warn('⚠️ Student not found in database - logging out');
                    currentUser = null;
                    localStorage.removeItem('peakTestUser');
                    alert('⚠️ Your account is not active.\n\nPlease contact support.\n\ntech@peakpotentia.com');
                    return;
                }

                // ✅ UPDATE currentUser with fresh data from database
                currentUser.dashboard_access = data.dashboard_access;
                currentUser.paid_subjects = data.paid_subjects || {};
                currentUser.test_access = data.test_access || {};

                // ✅ UPDATE localStorage
                localStorage.setItem('peakTestUser', JSON.stringify(currentUser));

                console.log('✅ Student verified - Dashboard access:', data.dashboard_access);
            } catch (error) {
                console.error('❌ Verification failed:', error);
            }
        }

        showDashboard();
    }
});

// Registration Handler
async function handleRegistration() {
    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();
    const grade = document.getElementById('studentGrade').value;
    const board = document.getElementById('studentBoard').value;
    const address = document.getElementById('studentAddress').value.trim();

    // Get selected subjects
    const selectedSubjects = [];
    const subjectCheckboxes = document.querySelectorAll('input[name="subjects"]:checked');
    subjectCheckboxes.forEach(cb => selectedSubjects.push(cb.value));

    const password = document.getElementById('studentPassword').value;

    // Validation
    if (!name || !email || !phone || !grade || !board || !address || !password) {
        showError('Please fill all required fields!', {
            'Required': 'Name, Email, Phone, Grade, Board, Address, Subjects, Password'
        });
        return;
    }

    // Phone validation
    if (phone.length !== 10 || !/^[0-9]{10}$/.test(phone)) {
        showError('Invalid phone number!', {
            'Phone': phone,
            'Required': '10 digits',
            'Example': '9818184460'
        });
        return;
    }

    // Subjects validation
    if (selectedSubjects.length === 0) {
        showError('Please select at least one subject!', {
            'Action': 'Select subjects you are interested in'
        });
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address!');
        return;
    }

    // Create user object
    const userData = {
        name: name,
        email: email,
        phone: phone,
        grade: grade,
        board: board,
        address: address,
        interested_subjects: selectedSubjects,
        password: password,
        registered_at: new Date().toISOString(),
        dashboard_access: false,  // Will be enabled from backend
        paid_subjects: {},
        test_access: {}
    };

    try {
        let savedToSupabase = false;

        // Try to save to Supabase if enabled
        if (supabaseEnabled && supabase) {
            try {
                // console.log('📤 Attempting to save to Supabase...');

                // Check if email already exists
                const { data: existingUsers, error: checkError } = await supabase
                    .from('students')
                    .select('email')
                    .eq('email', email);

                if (checkError) {
                    // console.error('❌ Error checking existing user:', checkError);
                    throw checkError;
                }

                if (existingUsers && existingUsers.length > 0) {
                    alert('This email is already registered! Please use a different email.');
                    return;
                }

                // Insert new student
                const { data: insertedData, error: insertError } = await supabase
                    .from('students')
                    .insert([userData])
                    .select();

                if (insertError) {
                    // console.error('❌ Supabase insert error:', insertError);
                    // console.error('Error details:', JSON.stringify(insertError, null, 2));
                    throw insertError;
                }

                if (insertedData && insertedData.length > 0) {
                    userData.id = insertedData[0].id;
                    savedToSupabase = true;
                    // console.log('✅ Student data saved to Supabase successfully!');
                    // console.log('💾 Saved data:', insertedData[0]);
                }
            } catch (supabaseError) {
                // console.error('❌ Supabase save failed:', supabaseError);
                // console.warn('⚠️ Falling back to localStorage only');
                savedToSupabase = false;
            }
        } else {
            // console.log('ℹ️ Supabase not enabled. Using localStorage only.');
        }


        // Always save to localStorage as backup
        localStorage.setItem('peakTestUser', JSON.stringify(userData));

        // Set current user
        currentUser = userData;

        // Log registration
        // console.log('═══════════════════════════════════════════════');
        // console.log('📝 NEW STUDENT REGISTRATION');
        // console.log('═══════════════════════════════════════════════');
        // console.log('Name:', userData.name);
        // console.log('Email:', userData.email);
        // console.log('Grade:', userData.grade);
        // console.log('Board:', userData.board);
        // console.log('Address:', userData.address);
        // console.log('Registered At:', new Date(userData.registered_at).toLocaleString());
        // console.log('Backend Status:');
        // console.log('  • Supabase:', savedToSupabase ? '✅ SAVED' : '❌ NOT SAVED');
        // console.log('  • localStorage: ✅ SAVED');
        // console.log('═══════════════════════════════════════════════');

        if (savedToSupabase) {
            alert('Registration Successful!');
        } else {
            alert('Registration Successful!');
        }

        showDashboard();
    } catch (error) {
        // console.error('❌ Registration error:', error);
        alert('Registration failed: ' + (error.message || 'Please try again.'));
    }
}


// Show Thank You Page
function showThankYouPage() {
    document.getElementById('registrationContainer').classList.add('hidden');
    document.getElementById('thankYouContainer').classList.remove('hidden');
    document.getElementById('dashboardFooter').classList.add('hidden');


    // Populate registration details
    const detailsHTML = `
        <h3>📋 Your Registration Details</h3>
        <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span class="detail-value">${currentUser.name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${currentUser.email}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${currentUser.phone}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Grade:</span>
            <span class="detail-value">${currentUser.grade}th</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Board:</span>
            <span class="detail-value">${currentUser.board}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Interested Subjects:</span>
            <div class="subjects-list">
                ${currentUser.interested_subjects.map(s => `<span class="subject-badge">${s}</span>`).join('')}
            </div>
        </div>
    `;

    document.getElementById('registrationDetails').innerHTML = detailsHTML;
}


// Show Dashboard Locked Message
function showDashboardLocked() {
    const lockedHTML = `
        <div class="dashboard-locked">
            <div class="locked-message">
                <div class="locked-icon">🔒</div>
                <h2>Dashboard Access Pending</h2>
                <p>Thank you for registering with Peak Test Series!</p>
                <p>Your dashboard access is currently being activated by our team.</p>
                <div class="locked-contact">
                    <h3 style="color: #003f5c; margin-bottom: 15px;">📞 Contact Us for Immediate Access</h3>
                    <p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:+919818184460" style="color: #58508d; text-decoration: none; font-weight: 700;">+91 98181 84460</a></p>
                    <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:info@peakpotentia.com" style="color: #58508d; text-decoration: none; font-weight: 700;">info@peakpotentia.com</a></p>
                </div>
                <button class="submit-btn" onclick="handleLogout()" style="margin-top: 25px;">← Back to Login</button>
            </div>
        </div>
    `;

    document.getElementById('registrationContainer').classList.add('hidden');
    document.getElementById('thankYouContainer').classList.add('hidden');
    document.getElementById('dashboardContainer').innerHTML = lockedHTML;
    document.getElementById('dashboardContainer').classList.remove('hidden');
    document.getElementById('dashboardFooter').classList.add('hidden');

}

// Show Dashboard
function showDashboard() {
    // Check if dashboard access is enabled
    if (!currentUser.dashboard_access) {
        showDashboardLocked();
        return;
    }

    document.getElementById('registrationContainer').classList.add('hidden');
    document.getElementById('thankYouContainer').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    document.getElementById('dashboardFooter').classList.remove('hidden');

    // Update header with user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userGradeBoard').textContent = `Grade ${currentUser.grade} - ${currentUser.board}`;

    // Load subjects
    loadSubjects();
}

// Load Subjects Based on Interested Subjects (Selected during registration)
function loadSubjects() {
    const key = `${currentUser.grade}-${currentUser.board}`;
    const allSubjects = subjectsByGradeBoard[key] || [];

    // Get interested subjects (selected during registration)
    const interestedSubjects = currentUser.interested_subjects || [];

    const subjectsGrid = document.getElementById('subjectsGrid');
    subjectsGrid.innerHTML = '';

    // If no interested subjects, show message
    if (interestedSubjects.length === 0) {
        subjectsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: white;">
                <h3 style="font-size: 24px; margin-bottom: 10px;">No Subjects Selected</h3>
                <p style="font-size: 16px; opacity: 0.8;">You haven't selected any subjects during registration.</p>
                <p style="font-size: 14px; margin-top: 20px;">Contact admin to update your subjects.</p>
            </div>
        `;
        return;
    }

    // Filter to show only interested subjects
    const filteredSubjects = allSubjects.filter(subject =>
        interestedSubjects.includes(subject.name)
    );

    // If no matching subjects found
    if (filteredSubjects.length === 0) {
        subjectsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: white;">
                <h3 style="font-size: 24px; margin-bottom: 10px;">No Matching Subjects</h3>
                <p style="font-size: 16px; opacity: 0.8;">Your selected subjects: ${interestedSubjects.join(', ')}</p>
                <p style="font-size: 14px; margin-top: 20px;">Contact admin if this is incorrect.</p>
            </div>
        `;
        return;
    }

    // Show only interested subjects
    filteredSubjects.forEach(subject => {
        const subjectKey = `${subject.name}-${subject.code}`;
        const isPaid = currentUser.paid_subjects && currentUser.paid_subjects[subjectKey];

        const card = document.createElement('div');
        card.className = 'subject-card';
        card.setAttribute('data-subject', subject.name);
        card.innerHTML = `
            ${!isPaid ? '<span class="locked-icon">🔒</span>' : '<span class="locked-icon">✅</span>'}
            <h3>${subject.name}</h3>
            <p>${subject.code}</p>
            ${isPaid ? '<p style="color: #4caf50; font-weight: 600; margin-top: 10px;">Paid ✓</p>' : '<p style="color: #f44336; font-weight: 600; margin-top: 10px;">₹15,000</p>'}
        `;

        card.onclick = () => openSubject(subject);
        subjectsGrid.appendChild(card);
    });

    console.log(`✅ Showing ${filteredSubjects.length} subjects from ${interestedSubjects.length} interested subjects`);
}

// Open Subject
function openSubject(subject) {
    // console.log("Hello")
    const subjectKey = `${subject.name}-${subject.code}`;
    const isPaid = currentUser.paid_subjects && currentUser.paid_subjects[subjectKey];

    if (!isPaid) {
        currentSubject = subject;
        showPaymentModal();
        return;
    }

    currentSubject = subject;
    document.getElementById('subjectsView').classList.add('hidden');
    document.getElementById('testsView').classList.remove('hidden');
    document.getElementById('subjectTitle').textContent = `${subject.name} ${subject.code}`;

    loadTests();
}

// Load Tests for Subject
async function loadTests() {
    const testsGrid = document.getElementById('testsGrid');
    testsGrid.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const testKey = `${currentSubject.name}-Test${i}`;
        const testAccess = currentUser.test_access[testKey];

        const card = document.createElement('div');
        card.className = 'test-card';

        let statusHTML = '';
        let clickable = true;

        if (testAccess) {
            const startTime = new Date(testAccess.start_time);
            const endTime = new Date(startTime.getTime() + (3 * 60 * 60 * 1000) + (15 * 60 * 1000)); // 3 hours 15 minutes
            const now = new Date();

            // Hide completed or expired tests
            if (testAccess.status === 'completed') {
                continue; // Skip this test, don't show it
            }

            // Check if time expired
            if (now >= endTime && testAccess.status === 'active') {
                // Mark as expired
                testAccess.status = 'expired';
                currentUser.test_access[testKey].status = 'expired';
                localStorage.setItem('peakTestUser', JSON.stringify(currentUser));

                // Update in Supabase
                if (supabaseEnabled && currentUser.email) {
                    try {
                        await supabase
                            .from('test_attempts')
                            .update({ status: 'expired' })
                            .eq('student_email', currentUser.email)
                            .eq('test_key', testKey);
                        
                        // Also update students table
                        await supabase
                            .from('students')
                            .update({ test_access: currentUser.test_access })
                            .eq('email', currentUser.email);
                    } catch (error) {
                        console.error('Error updating expired test:', error);
                    }
                }
                continue; // Skip expired test, don't show it
            }

            if (now < endTime && testAccess.status === 'active') {
                const remainingMs = endTime - now;
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                statusHTML = `
                    <span class="test-status active">Active</span>
                    <div class="test-timer">⏰ ${hours}h ${minutes}m remaining</div>
                `;
            } else if (testAccess.status === 'completed') {
                statusHTML = '<span class="test-status locked">Completed</span>';
                clickable = false;
                
            }else {
                statusHTML = '<span class="test-status locked">Expired</span>';
                clickable = false;
            }
        } else {
            statusHTML = '<span class="test-status">Available</span>';
        }

        card.innerHTML = `
            <h4>📝 Test ${i}</h4>
            ${statusHTML}
        `;

        if (clickable) {
            card.onclick = () => openTest(i);
        } else {
            card.style.opacity = '0.6';
            card.style.cursor = 'not-allowed';
        }

        testsGrid.appendChild(card);
    }
    console.log('🔄 Calling loadSubmittedTests...');
    await loadSubmittedTests();
}

// Open Test PDF
async function openTest(testNumber) {
    const testKey = `${currentSubject.name}-Test${testNumber}`;

    // If test not started, start it now
    if (!currentUser.test_access[testKey]) {
        const testData = {
            start_time: new Date().toISOString(),
            status: 'active',
            test_number: testNumber,
            subject: currentSubject.name
        };

        currentUser.test_access[testKey] = testData;
        localStorage.setItem('peakTestUser', JSON.stringify(currentUser));

        try {
            // Save to Supabase if enabled
            if (supabaseEnabled && currentUser.email) {
                // Insert into test_attempts
                const { error } = await supabase
                    .from('test_attempts')
                    .insert([{
                        student_email: currentUser.email,
                        student_name: currentUser.name,
                        subject: currentSubject.name,
                        test_number: testNumber,
                        start_time: testData.start_time,
                        status: 'active'
                    }]);

                if (error) {
                    console.error('Error saving test attempt:', error);
                } else {
                    console.log('✅ Test attempt saved to Supabase');
                }
                
                // ✅ FIX 1: Update students table test_access
                console.log('📝 Updating students.test_access on test start...');
                const { error: updateError } = await supabase
                    .from('students')
                    .update({
                        test_access: currentUser.test_access
                    })
                    .eq('email', currentUser.email);

                if (updateError) {
                    console.error('❌ Failed to update students.test_access:', updateError);
                } else {
                    console.log('✅ Students.test_access updated on test start!');
                }
            }
        } catch (error) {
            console.error('Supabase test save error:', error);
        }

        // Backend Log
        // console.log('═══════════════════════════════════════════════');
        // console.log('📝 TEST STARTED');
        // console.log('═══════════════════════════════════════════════');
        // console.log('Student:', currentUser.name);
        // console.log('Email:', currentUser.email);
        // console.log('Subject:', currentSubject.name);
        // console.log('Test Number:', testNumber);
        // console.log('Start Time:', new Date().toLocaleString());
        // console.log('Backend:', supabaseEnabled ? '✅ Saved to Supabase' : '⚠️ Saved to localStorage only');
        // console.log('═══════════════════════════════════════════════');
    }

    testStartTime = new Date(currentUser.test_access[testKey].start_time);

    // Show PDF viewer
    document.getElementById('pdfTestTitle').textContent = `${currentSubject.name} - Test ${testNumber}`;

    try {
        if (supabaseEnabled) {
            // Get PDF URL from database
            const { data, error } = await supabase
                .from('test_files')
                .select('file_url')
                .eq('subject', currentSubject.name)
                .eq('board', currentUser.board)
                .eq('grade', currentUser.grade)
                .eq('test_number', testNumber)
                .single();

            if (error) {
                // console.error('Error loading PDF URL:', error);
                throw error;
            }

            if (data && data.file_url) {
                // Load actual PDF from Supabase Storage
                document.getElementById('pdfFrame').src = data.file_url;
                // console.log('✅ PDF loaded from Supabase Storage:', data.file_url);
            } else {
                // console.warn('⚠️ PDF not found in database');
                alert('Test PDF not available. Please contact administrator.');
                return;
            }
        } else {
            // Fallback: Use demo PDF if Supabase not configured
            // console.warn('⚠️ Supabase not configured. Using demo PDF.');
            document.getElementById('pdfFrame').src = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        }
    } catch (error) {
        // console.error('Failed to load PDF:', error);
        alert('Failed to load test PDF. Please try again.');
        return;
    }

    document.getElementById('pdfViewer').classList.remove('hidden');

    // Start timer
    startPdfTimer();
}

// Submit Test Function
async function submitTest() {
    if (confirm('Are you sure you want to submit this test?\n\nOnce submitted, you cannot reopen it.')) {
        const testTitle = document.getElementById('pdfTestTitle').textContent;
        const timerElement = document.getElementById('pdfTimer');
        const timeRemaining = timerElement.textContent;

        // Find the test key
        let testKey = null;
        for (const key in currentUser.test_access) {
            if (currentUser.test_access[key].subject === currentSubject.name &&
                currentUser.test_access[key].status === 'active') {
                testKey = key;
                break;
            }
        }

        // Mark test as completed
        if (testKey && currentUser.test_access[testKey]) {
            currentUser.test_access[testKey].status = 'completed';
            currentUser.test_access[testKey].submitted_at = new Date().toISOString();
            currentUser.test_access[testKey].time_remaining = timeRemaining;
            localStorage.setItem('peakTestUser', JSON.stringify(currentUser));

            try {
                // Update in Supabase if enabled
                if (supabaseEnabled && currentUser.email) {
                    const { error } = await supabase
                        .from('test_attempts')
                        .update({
                            status: 'completed',
                            submit_time: new Date().toISOString(),
                            time_remaining: timeRemaining
                        })
                        .eq('student_email', currentUser.email)
                        .eq('subject', currentUser.test_access[testKey].subject)
                        .eq('test_number', currentUser.test_access[testKey].test_number)
                        .eq('status', 'active');

                    if (error) {
                        console.error('Error updating test in Supabase:', error);
                    } else {
                        console.log('✅ Test submission saved to Supabase');
                    }
                    
                    // ✅ FIX 2: Update students table test_access on submit
                    console.log('📝 Updating students.test_access on submit...');
                    const { error: studentError } = await supabase
                        .from('students')
                        .update({
                            test_access: currentUser.test_access
                        })
                        .eq('email', currentUser.email);

                    if (studentError) {
                        console.error('❌ Failed to update students.test_access:', studentError);
                        alert('⚠️ Warning: Test submitted but may reappear after refresh. Please contact support.');
                    } else {
                        console.log('✅✅✅ Students.test_access updated! Test will stay hidden forever.');
                    }
                }
            } catch (error) {
                console.error('Supabase test update error:', error);
            }
        }

        // // Backend Log
        // console.log('═══════════════════════════════════════════════');
        // console.log('✅ TEST SUBMITTED');
        // console.log('═══════════════════════════════════════════════');
        // console.log('Student:', currentUser.name);
        // console.log('Email:', currentUser.email);
        // console.log('Test:', testTitle);
        // console.log('Submitted At:', new Date().toLocaleString());
        // console.log('Time Remaining:', timeRemaining);
        // console.log('Backend:', supabaseEnabled ? '✅ Saved to Supabase' : '⚠️ Saved to localStorage only');
        // console.log('═══════════════════════════════════════════════');

        closePdfViewer();
        alert('Test submitted successfully! ✅');
    }
}

// Start PDF Timer
function startPdfTimer() {
    const endTime = new Date(testStartTime.getTime() + (3 * 60 * 60 * 1000) + (15 * 60 * 1000)); // 3 hours 15 minutes from start

    pdfTimer = setInterval(async () => {
        const now = new Date();
        const remainingMs = endTime - now;

        if (remainingMs <= 0) {
            clearInterval(pdfTimer);

            // Close PDF viewer
            closePdfViewer();

            alert('⏰ Time Up!\n\nTest time has expired. Your test has been automatically submitted.');

            // Mark test as expired
            let testKey = null;
            for (const key in currentUser.test_access) {
                if (currentUser.test_access[key].subject === currentSubject.name &&
                    currentUser.test_access[key].status === 'active') {
                    testKey = key;
                    break;
                }
            }

            if (testKey) {
                currentUser.test_access[testKey].status = 'expired';
                currentUser.test_access[testKey].expired_at = new Date().toISOString();
                localStorage.setItem('peakTestUser', JSON.stringify(currentUser));

                try {
                    // Update in Supabase if enabled
                    if (supabaseEnabled && currentUser.email) {
                        const { error } = await supabase
                            .from('test_attempts')
                            .update({
                                status: 'expired',
                                submit_time: new Date().toISOString(),
                                time_remaining: '00:00:00'
                            })
                            .eq('student_email', currentUser.email)
                            .eq('subject', currentUser.test_access[testKey].subject)
                            .eq('test_number', currentUser.test_access[testKey].test_number)
                            .eq('status', 'active');

                        if (error) {
                            console.error('Error updating expired test in Supabase:', error);
                        } else {
                            console.log('✅ Test expiry saved to Supabase');
                        }
                    }
                } catch (error) {
                    console.error('Supabase test expiry error:', error);
                }
            }

            // // Backend Log
            // console.log('═══════════════════════════════════════════════');
            // console.log('⏰ TEST TIME EXPIRED');
            // console.log('═══════════════════════════════════════════════');
            // console.log('Student:', currentUser.name);
            // console.log('Test:', document.getElementById('pdfTestTitle').textContent);
            // console.log('Expired At:', new Date().toLocaleString());
            // console.log('Backend:', supabaseEnabled ? '✅ Saved to Supabase' : '⚠️ Saved to localStorage only');
            // console.log('═══════════════════════════════════════════════');

            closePdfViewer();
            alert('Time is up! Test has been automatically submitted.');
            return;
        }

        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

        document.getElementById('pdfTimer').textContent =
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// Close PDF Viewer
function closePdfViewer() {
    if (pdfTimer) {
        clearInterval(pdfTimer);
        pdfTimer = null;
    }
    document.getElementById('pdfViewer').classList.add('hidden');
    document.getElementById('pdfFrame').src = '';
    loadTests(); // Refresh test list
}

// Back to Subjects
function backToSubjects() {
    document.getElementById('testsView').classList.add('hidden');
    document.getElementById('subjectsView').classList.remove('hidden');
    currentSubject = null;
}

// Show Payment Modal
function showPaymentModal() {
    const subjectName = `${currentSubject.name} ${currentSubject.code}`;
    document.getElementById('paymentSubjectName').textContent = subjectName;
    document.getElementById('paymentModal').classList.add('active');
}

// Close Payment Modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

// Process Payment
function processPayment() {
    if (!currentSubject) {
        alert('Please select a subject first!');
        return;
    }

    // Check if Razorpay is configured
    if (RAZORPAY_KEY === 'rzp_test_YOUR_KEY') {
        // Demo mode - simulate payment
        if (confirm(`Demo Mode: Pay ₹15,000 for ${currentSubject.name}?\n\nNote: Replace RAZORPAY_KEY in main.js with your actual key for real payments.`)) {
            handlePaymentSuccess({ razorpay_payment_id: 'demo_payment_' + Date.now() });
        }
        return;
    }

    // Real Razorpay payment
    const options = {
        key: RAZORPAY_KEY,
        amount: 1500000, // ₹15,000 in paise
        currency: 'INR',
        name: 'Peak Test Series',
        description: `${currentSubject.name} ${currentSubject.code} - Test Series`,
        image: 'https://your-logo-url.com/logo.png',
        handler: function (response) {
            handlePaymentSuccess(response);
        },
        prefill: {
            name: currentUser.name,
            email: currentUser.email
        },
        theme: {
            color: '#667eea'
        }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
        alert('Payment Failed. Please try again.');
        console.error(response.error);
    });
    rzp.open();
}

// Handle Payment Success
async function handlePaymentSuccess(response) {
    const subjectKey = `${currentSubject.name}-${currentSubject.code}`;

    // Initialize paid_subjects if not exists
    if (!currentUser.paid_subjects) {
        currentUser.paid_subjects = {};
    }

    // Payment data
    const paymentData = {
        paid: true,
        payment_id: response.razorpay_payment_id,
        payment_date: new Date().toISOString(),
        amount: 15000
    };

    // Mark this subject as paid
    currentUser.paid_subjects[subjectKey] = paymentData;

    try {
        // Save to Supabase if enabled
        if (supabaseEnabled && currentUser.email) {
            // Insert payment record
            const { data: paymentRecord, error: paymentError } = await supabase
                .from('payments')
                .insert([{
                    student_email: currentUser.email,
                    student_name: currentUser.name,
                    subject: subjectKey,
                    amount: 15000,
                    payment_id: response.razorpay_payment_id,
                    payment_date: new Date().toISOString()
                }]);

            if (paymentError) {
                console.error('Error saving payment to Supabase:', paymentError);
            } else {
                console.log('✅ Payment saved to Supabase');
            }

            // Update student's paid_subjects in students table
            const { error: updateError } = await supabase
                .from('students')
                .update({ paid_subjects: currentUser.paid_subjects })
                .eq('email', currentUser.email);

            if (updateError) {
                console.error('Error updating student record:', updateError);
            }
        }
    } catch (error) {
        console.error('Supabase payment save error:', error);
    }

    // Save to localStorage
    localStorage.setItem('peakTestUser', JSON.stringify(currentUser));

    // Backend Log
    // console.log('═══════════════════════════════════════════════');
    // console.log('💳 PAYMENT SUCCESSFUL');
    // console.log('═══════════════════════════════════════════════');
    // console.log('Student Name:', currentUser.name);
    // console.log('Student Email:', currentUser.email);
    // console.log('Subject:', subjectKey);
    // console.log('Amount:', '₹15,000');
    // console.log('Payment ID:', response.razorpay_payment_id);
    // console.log('Payment Date:', new Date().toLocaleString());
    // console.log('Backend:', supabaseEnabled ? '✅ Saved to Supabase' : '⚠️ Saved to localStorage only');
    // console.log('═══════════════════════════════════════════════');

    closePaymentModal();
    alert(`Payment Successful! 🎉\n\nYou now have access to ${currentSubject.name} ${currentSubject.code} test series.`);
    loadSubjects();

    // Auto open the subject tests
    setTimeout(() => {
        openSubject(currentSubject);
    }, 500);
}

// Logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('peakTestUser');

    // Hide dashboard
    document.getElementById('dashboardContainer').classList.add('hidden');

    // ✅ ADD THIS LINE - Hide footer
    document.getElementById('dashboardFooter').classList.add('hidden');

    // Show registration
    document.getElementById('registrationContainer').classList.remove('hidden');

    console.log('👋 Logged out');
}
// ============================================================================
// FILE UPLOAD FUNCTIONS FOR ANSWER SUBMISSION
// ============================================================================

// Show upload dialog when student clicks submit
function showUploadDialog() {
    document.getElementById('uploadModal').style.display = 'flex';
}

// Close upload dialog
function closeUploadDialog() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('answerFile').value = '';
    document.getElementById('uploadProgress').style.display = 'none';
}

// Upload answer file to Supabase Storage
async function uploadAnswerFile() {
    const fileInput = document.getElementById('answerFile');
    const file = fileInput.files[0];

    // Validation
    if (!file) {
        alert('Please select a file to upload!');
        return;
    }

    // File size check (50 MB = 50 * 1024 * 1024 bytes)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size too large! Maximum 50 MB allowed.');
        return;
    }

    // File type check
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type! Only PDF, Word, and Image files are allowed.');
        return;
    }

    try {
        // Show progress bar
        document.getElementById('uploadProgress').style.display = 'block';
        document.getElementById('uploadProgressBar').style.width = '0%';
        document.getElementById('uploadProgressBar').textContent = '0%';
        document.getElementById('uploadStatus').textContent = 'Uploading...';

        // Get current test info
        const testTitle = document.getElementById('pdfTestTitle').textContent;
        const timerElement = document.getElementById('pdfTimer');
        const timeRemaining = timerElement ? timerElement.textContent : '00:00:00';

        if (!supabaseEnabled || !supabase) {
            throw new Error('Supabase not configured. Cannot upload file.');
        }

        // Generate unique file name
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${currentUser.email}/${currentSubject.name}/Test${getCurrentTestNumber()}/${timestamp}_${sanitizedFileName}`;

        console.log('📤 Uploading file to Supabase Storage...');
        console.log('File:', file.name);
        console.log('Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('Type:', file.type);
        console.log('Path:', storagePath);

        // Simulate progress (for user experience)
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 10;
                document.getElementById('uploadProgressBar').style.width = progress + '%';
                document.getElementById('uploadProgressBar').textContent = progress + '%';
            }
        }, 200);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('answer-submissions')
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        clearInterval(progressInterval);

        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            throw uploadError;
        }

        console.log('✅ File uploaded successfully!');

        // Update progress to 100%
        document.getElementById('uploadProgressBar').style.width = '100%';
        document.getElementById('uploadProgressBar').textContent = '100%';
        document.getElementById('uploadStatus').textContent = 'Processing...';

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('answer-submissions')
            .getPublicUrl(storagePath);

        const fileUrl = urlData.publicUrl;
        console.log('📎 File URL:', fileUrl);

        // Save submission record to database
        const submissionData = {
            student_email: currentUser.email,
            student_name: currentUser.name,
            subject: currentSubject.name,
            test_number: getCurrentTestNumber(),
            file_name: file.name,
            file_url: fileUrl,
            file_type: file.type,
            file_size: file.size,
            submitted_at: new Date().toISOString(),
            status: 'submitted'
        };

        const { data: dbData, error: dbError } = await supabase
            .from('answer_submissions')
            .insert([submissionData])
            .select();

        if (dbError) {
            console.error('❌ Database error:', dbError);
            throw dbError;
        }

        console.log('✅ Submission record saved to database!');
        console.log('💾 Database record:', dbData);

        // Update test status
        const testKey = `${currentSubject.name}-Test${getCurrentTestNumber()}`;
        if (currentUser.test_access[testKey]) {
            currentUser.test_access[testKey].status = 'submitted';
            currentUser.test_access[testKey].submitted_at = new Date().toISOString();
            currentUser.test_access[testKey].time_remaining = timeRemaining;
            currentUser.test_access[testKey].answer_file_url = fileUrl;
            localStorage.setItem('peakTestUser', JSON.stringify(currentUser));
        }

        // Update test attempt in database
        try {
            await supabase
                .from('test_attempts')
                .update({
                    status: 'submitted',
                    submit_time: new Date().toISOString(),
                    time_remaining: timeRemaining
                })
                .eq('student_email', currentUser.email)
                .eq('subject', currentSubject.name)
                .eq('test_number', getCurrentTestNumber())
                .eq('status', 'active');
        } catch (updateError) {
            console.warn('⚠️ Could not update test attempt:', updateError);
        }

        // Backend Log
        // console.log('═══════════════════════════════════════════════');
        // console.log('✅ ANSWER SUBMITTED SUCCESSFULLY');
        // console.log('═══════════════════════════════════════════════');
        // console.log('Student:', currentUser.name);
        // console.log('Email:', currentUser.email);
        // console.log('Test:', testTitle);
        // console.log('File Name:', file.name);
        // console.log('File Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        // console.log('File Type:', file.type);
        // console.log('File URL:', fileUrl);
        // console.log('Submitted At:', new Date().toLocaleString());
        // console.log('Time Remaining:', timeRemaining);
        // console.log('Backend: ✅ SAVED TO SUPABASE');
        // console.log('═══════════════════════════════════════════════');

        // Success message
        document.getElementById('uploadStatus').textContent = 'Upload successful!';
        document.getElementById('uploadStatus').style.color = '#4caf50';

        setTimeout(() => {
            closeUploadDialog();
            closePdfViewer();
            alert('Answer submitted successfully! ✅\n\nYour answer has been uploaded and saved.\n\nFile: ' + file.name);
        }, 1000);

    } catch (error) {
        console.error('❌ Upload failed:', error);

        document.getElementById('uploadProgress').style.display = 'none';

        let errorMessage = 'Upload failed: ' + (error.message || 'Unknown error');

        if (error.message && error.message.includes('Bucket not found')) {
            errorMessage = 'Upload failed: Storage bucket "answer-submissions" not found.\n\nPlease create the bucket in Supabase Dashboard → Storage.';
        } else if (error.message && error.message.includes('row-level security')) {
            errorMessage = 'Upload failed: Database permission error.\n\nPlease disable RLS on answer_submissions table.';
        }

        alert(errorMessage);
    }
}

// Helper function to get current test number from test title
function getCurrentTestNumber() {
    const testTitle = document.getElementById('pdfTestTitle').textContent;
    const match = testTitle.match(/Test\s+(\d+)/i);
    return match ? parseInt(match[1]) : 1;
}

// ============================================================================
// ADD THIS TO YOUR EXISTING main.js FILE
// ============================================================================
// Copy the above functions and add them to your main.js file
// Make sure to add them BEFORE the closing script tag


// ============================================================================
// BALANCED PDF PROTECTION SYSTEM
// Scrolling: ENABLED ✅
// Download: BLOCKED ❌
// Screenshot: BLOCKED ❌
// Right-click: BLOCKED ❌
// ============================================================================
// Add this code to the END of your main.js file
// ============================================================================

// Initialize PDF Protection System
function initializePdfProtection() {
    console.log('🔒 Initializing Balanced PDF Protection System...');

    // ========================================================================
    // 1. DISABLE RIGHT-CLICK (But allow scrolling)
    // ========================================================================
    document.addEventListener('contextmenu', function (e) {
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('⚠️ Right-click is disabled during test!');
            return false;
        }
    }, true);

    // ========================================================================
    // 2. DISABLE TEXT SELECTION & COPY (But allow scrolling)
    // ========================================================================
    document.addEventListener('selectstart', function (e) {
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
            e.preventDefault();
            return false;
        }
    });

    document.addEventListener('copy', function (e) {
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
            e.preventDefault();
            e.clipboardData.setData('text/plain', '');
            showProtectionAlert('⚠️ Copying is disabled during test!');
            return false;
        }
    });

    // ========================================================================
    // 3. DISABLE PRINT
    // ========================================================================
    window.addEventListener('beforeprint', function (e) {
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('⚠️ Printing is disabled during test!');
            return false;
        }
    });

    // ========================================================================
    // 4. DISABLE KEYBOARD SHORTCUTS (Allow arrow keys for scrolling)
    // ========================================================================
    document.addEventListener('keydown', function (e) {
        const pdfViewer = document.getElementById('pdfViewer');
        if (!pdfViewer || pdfViewer.classList.contains('hidden')) {
            return; // PDF not open, allow normal keyboard
        }

        const key = e.key;
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        // ALLOW these keys for scrolling:
        const allowedKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'PageUp', 'PageDown', 'Home', 'End',
            'Space' // Spacebar for page down
        ];

        if (allowedKeys.includes(key)) {
            return; // Allow scrolling keys
        }

        // BLOCK screenshot and download keys
        if (
            key === 'PrintScreen' ||
            (ctrl && shift && key === 'S') || // Chrome screenshot
            (ctrl && shift && (key === '3' || key === '4' || key === '5')) || // Mac screenshot
            (key === 'F12') || // DevTools
            (ctrl && shift && (key === 'I' || key === 'C' || key === 'J')) || // DevTools variants
            (ctrl && key === 'U') || // View Source
            (ctrl && key === 'S') || // Save Page
            (ctrl && key === 'P') || // Print
            (ctrl && key === 'D') // Bookmark
        ) {
            e.preventDefault();
            e.stopPropagation();
            activateScreenshotBlocker();
            showProtectionAlert('⚠️ This action is disabled during test!');
            logSuspiciousActivity(`Blocked key: ${key} (Ctrl: ${ctrl}, Shift: ${shift})`);
            return false;
        }
    }, true);

    // PrintScreen key release detection
    document.addEventListener('keyup', function (e) {
        if (e.key === 'PrintScreen') {
            const pdfViewer = document.getElementById('pdfViewer');
            if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
                activateScreenshotBlocker();
                logSuspiciousActivity('PrintScreen key detected');
            }
        }
    });

    // ========================================================================
    // 5. ALLOW DRAG (for scrollbar) but DISABLE content drag
    // ========================================================================
    document.addEventListener('dragstart', function (e) {
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
            // Only block if dragging actual content (not scrollbar)
            if (e.target.tagName !== 'SCROLLBAR') {
                e.preventDefault();
                return false;
            }
        }
    });

    // ========================================================================
    // 6. MONITOR TAB SWITCHES
    // ========================================================================
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            const pdfViewer = document.getElementById('pdfViewer');
            if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
                console.warn('⚠️ User switched tab during test!');
                logSuspiciousActivity('Tab switch detected');
            }
        }
    });

    // ========================================================================
    // 7. MONITOR WINDOW BLUR
    // ========================================================================
    window.addEventListener('blur', function () {
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer && !pdfViewer.classList.contains('hidden')) {
            console.warn('⚠️ Window lost focus during test!');
            logSuspiciousActivity('Window focus lost');
        }
    });

    // console.log('✅ Balanced PDF Protection Activated');
    // console.log('✅ Scrolling: ENABLED');
    // console.log('🔒 Download: BLOCKED');
    // console.log('🔒 Screenshot: BLOCKED');
}

// ============================================================================
// SCREENSHOT BLOCKER
// ============================================================================
function activateScreenshotBlocker() {
    let blocker = document.getElementById('screenshotBlocker');

    if (!blocker) {
        blocker = document.createElement('div');
        blocker.id = 'screenshotBlocker';
        blocker.className = 'screenshot-blocker';
        document.body.appendChild(blocker);
    }

    blocker.classList.add('active');
    blocker.style.background = 'rgba(0, 0, 0, 0.98)';
    blocker.style.animation = 'flashWarning 0.5s';
    blocker.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
            <div style="font-size: 80px; margin-bottom: 20px;">⚠️</div>
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 10px;">SCREENSHOT BLOCKED</div>
            <div style="font-size: 18px; opacity: 0.8;">This action has been logged</div>
        </div>
    `;

    setTimeout(() => {
        blocker.classList.remove('active');
        blocker.style.background = '';
        blocker.innerHTML = '';
    }, 1500);
}

// ============================================================================
// PROTECTION ALERT
// ============================================================================
function showProtectionAlert(message) {
    const toast = document.createElement('div');
    toast.className = 'protection-toast';
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 24px;">🔒</div>
            <div>${message}</div>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        toast.style.transition = 'all 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);

    console.warn('🔒 PROTECTION:', message);
}

// ============================================================================
// SET WATERMARK
// ============================================================================
function setWatermark(studentName, studentEmail) {
    let watermark = document.getElementById('pdfWatermark');

    if (!watermark) {
        const pdfContent = document.querySelector('.pdf-content');
        if (pdfContent) {
            watermark = document.createElement('div');
            watermark.id = 'pdfWatermark';
            watermark.className = 'pdf-watermark';
            pdfContent.appendChild(watermark);
        }
    }

    if (watermark) {
        watermark.setAttribute('data-watermark', `${studentName} • ${studentEmail}`);
        console.log('✅ Watermark set:', studentName);
    }
}

// ============================================================================
// LOG SUSPICIOUS ACTIVITY
// ============================================================================
async function logSuspiciousActivity(activity) {
    const timestamp = new Date().toLocaleString();
    console.log(`📊 [${timestamp}] Suspicious Activity:`, activity);

    // Optional: Save to database
    if (typeof supabaseEnabled !== 'undefined' && supabaseEnabled && typeof currentUser !== 'undefined' && currentUser) {
        try {
            if (typeof supabase !== 'undefined') {
                await supabase
                    .from('test_activity_logs')
                    .insert([{
                        student_email: currentUser.email,
                        student_name: currentUser.name,
                        activity: activity,
                        timestamp: new Date().toISOString(),
                        test_info: document.getElementById('pdfTestTitle')?.textContent || 'Unknown Test'
                    }]);
                console.log('✅ Activity logged to database');
            }
        } catch (error) {
            console.error('❌ Failed to log activity:', error);
        }
    }
}

// ============================================================================
// APPLY IFRAME PROTECTION (Allow scrolling)
// ============================================================================
function applyIframeProtection() {
    const pdfFrame = document.getElementById('pdfFrame');
    if (pdfFrame) {
        // Sandbox attribute for security
        pdfFrame.setAttribute('sandbox', 'allow-same-origin allow-scripts');

        // IMPORTANT: Keep pointer events AUTO for scrolling
        pdfFrame.style.pointerEvents = 'auto';

        // Add event listener for right-click
        pdfFrame.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            showProtectionAlert('⚠️ Right-click disabled!');
            return false;
        });

        console.log('✅ Iframe protection applied (scrolling enabled)');
    }
}

// ============================================================================
// INITIALIZE ON PAGE LOAD
// ============================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePdfProtection);
} else {
    initializePdfProtection();
}

// ============================================================================
// INSTRUCTIONS FOR INTEGRATION
// ============================================================================
/*

ADD THESE LINES TO YOUR openTest() FUNCTION:

// After loading the PDF URL, add:

// Set watermark with student info
setWatermark(currentUser.name, currentUser.email);

// Apply iframe protection (allows scrolling)
applyIframeProtection();

// Log test opening
console.log('🔒 PDF Protection Active - Scrolling: ✅ | Download: ❌ | Screenshot: ❌');

*/

// console.log('📄 Balanced PDF Protection Module Loaded');



// ============================================================================
// STUDENT RESULTS & FEEDBACK SYSTEM
// ============================================================================
// Add this code to your main.js file
// ============================================================================

// Load and display submitted test results
async function loadSubmittedTests() {
    if (!supabaseEnabled || !currentUser || !currentSubject) {
        return;
    }

    const container = document.getElementById('submittedTestsContainer');
    if (!container) return;

    try {
        console.log('📊 Loading submitted tests and results...');

        // Fetch submissions for current subject

        const { data, error } = await supabase
            .from('answer_submissions')
            .select('*')
            .eq('student_email', currentUser.email)
            .eq('subject', currentSubject.name)
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error('Error loading results:', error);
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p style="font-size: 18px;">📝 No test submissions yet</p>
                    <p style="font-size: 14px; opacity: 0.8;">Submit your first test to see results here</p>
                </div>
            `;
            return;
        }

        console.log(`✅ Found ${data.length} submissions`);

        // Build results HTML
        let resultsHTML = '';

        data.forEach(submission => {
            const hasMarks = submission.marks !== null && submission.marks !== undefined;
            const percentage = hasMarks ? Math.round((submission.marks / (submission.max_marks || 80)) * 100) : null;

            // Determine grade
            let grade = '';
            let gradeClass = '';
            if (hasMarks) {
                const percent = (submission.marks / (submission.max_marks || 80)) * 100;
                if (percent >= 70) {
                    grade = 'Excellent! 🌟';
                    gradeClass = 'grade-excellent';
                } else if (percent >= 65) {
                    grade = 'Good! 👍';
                    gradeClass = 'grade-good';
                } else if (percent >= 50) {
                    grade = 'Average';
                    gradeClass = 'grade-average';
                } else {
                    grade = 'Needs Improvement';
                    gradeClass = 'grade-improve';
                }
            }

            // Format dates
            const submittedDate = new Date(submission.submitted_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const checkedDate = submission.checked_at
                ? new Date(submission.checked_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                })
                : null;

            // Build card HTML
            resultsHTML += `
                <div class="result-card">
                    <div class="result-header">
                        <div class="result-title">
                            📄 Test ${submission.test_number}
                        </div>
                        <div class="result-status ${hasMarks ? 'status-checked' : 'status-pending'}">
                            ${hasMarks ? '✓ Checked' : '⏳ Pending'}
                        </div>
                    </div>
                    
                    ${hasMarks ? `
                        <!-- Results Available -->
                        <div class="result-marks">
                            <div class="marks-display">
                                ${submission.marks}/${submission.max_marks || 80}
                            </div>
                            <div class="marks-info">
                                <div class="percentage">${percentage}%</div>
                                <span class="grade-badge ${gradeClass}">${grade}</span>
                            </div>
                        </div>
                        
                        ${submission.feedback ? `
                            <div class="feedback-section">
                                <div class="feedback-title">
                                    💬 Teacher's Feedback
                                </div>
                                <div class="feedback-text">
                                    ${submission.feedback}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="result-meta">
                            <div>📅 Submitted: ${submittedDate}</div>
                            <div>✓ Checked: ${checkedDate || 'N/A'}</div>
                            ${submission.checked_by ? `<div>👨‍🏫 By: ${submission.checked_by}</div>` : ''}
                        </div>
                    ` : `
                        <!-- Pending Results -->
                        <div class="pending-message">
                            <div style="font-size: 24px;">⏳</div>
                            <div>
                                <strong>Evaluation Pending</strong>
                                <p style="margin: 5px 0 0 0; font-size: 13px;">
                                    Your test is being evaluated. Results will be available soon.
                                </p>
                            </div>
                        </div>
                        
                        <div class="result-meta">
                            <div>📅 Submitted: ${submittedDate}</div>
                            <div>📎 File: ${submission.file_name}</div>
                        </div>
                    `}
                </div>
            `;
        });

        container.innerHTML = resultsHTML;

        console.log('✅ Results displayed successfully');

    } catch (error) {
        console.error('❌ Error loading submitted tests:', error);
        container.innerHTML = `
            <div class="no-results">
                <p style="color: #f44336;">❌ Failed to load results</p>
                <p style="font-size: 14px;">${error.message}</p>
            </div>
        `;
    }
}

// Call this function when opening subject page
// Add to your openSubject() or selectSubject() function:
/*
async function openSubject(subject) {
    // ... your existing code ...
    
    // Load submitted tests and results
    await loadSubmittedTests();
}
*/

// ============================================================================
// STATISTICS & SUMMARY
// ============================================================================

async function loadStudentStatistics() {
    if (!supabaseEnabled || !currentUser) return null;

    try {
        const { data, error } = await supabase
            .from('answer_submissions')
            .select('marks, max_marks, subject')
            .eq('student_email', currentUser.email)
            .not('marks', 'is', null);

        if (error) throw error;

        if (!data || data.length === 0) return null;

        // Calculate statistics
        const totalTests = data.length;
        const totalMarks = data.reduce((sum, item) => sum + item.marks, 0);
        const totalMaxMarks = data.reduce((sum, item) => sum + (item.max_marks || 100), 0);
        const averagePercentage = (totalMarks / totalMaxMarks) * 100;

        // Count by subject
        const bySubject = {};
        data.forEach(item => {
            if (!bySubject[item.subject]) {
                bySubject[item.subject] = {
                    count: 0,
                    total: 0,
                    maxTotal: 0
                };
            }
            bySubject[item.subject].count++;
            bySubject[item.subject].total += item.marks;
            bySubject[item.subject].maxTotal += (item.max_marks || 100);
        });

        return {
            totalTests,
            averagePercentage: averagePercentage.toFixed(2),
            bySubject
        };

    } catch (error) {
        console.error('Error loading statistics:', error);
        return null;
    }
}

// Display statistics (optional - add to dashboard)
async function displayStudentStatistics() {
    const stats = await loadStudentStatistics();

    if (!stats) return;

    // console.log('═══════════════════════════════════════');
    // console.log('📊 STUDENT STATISTICS');
    // console.log('═══════════════════════════════════════');
    // console.log('Total Tests Completed:', stats.totalTests);
    // console.log('Average Score:', stats.averagePercentage + '%');
    // console.log('By Subject:', stats.bySubject);
    // console.log('═══════════════════════════════════════');
}

// ============================================================================
// AUTO-REFRESH RESULTS (Optional)
// ============================================================================

let resultsRefreshInterval = null;

function startResultsAutoRefresh(intervalMinutes = 5) {
    // Clear existing interval
    if (resultsRefreshInterval) {
        clearInterval(resultsRefreshInterval);
    }

    // Auto-refresh every X minutes
    resultsRefreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing results...');
        loadSubmittedTests();
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ Auto-refresh enabled (every ${intervalMinutes} minutes)`);
}

function stopResultsAutoRefresh() {
    if (resultsRefreshInterval) {
        clearInterval(resultsRefreshInterval);
        resultsRefreshInterval = null;
        console.log('🛑 Auto-refresh stopped');
    }
}

// ============================================================================
// INTEGRATION EXAMPLE
// ============================================================================

/*
// Add to your selectSubject() or openSubject() function:

async function selectSubject(subject) {
    currentSubject = subject;
    
    // Hide subjects page
    document.getElementById('subjectsPage').classList.add('hidden');
    
    // Show tests page
    document.getElementById('testsPage').classList.remove('hidden');
    
    // Update page title
    document.getElementById('subjectTitle').textContent = subject.name + ' ' + subject.subtitle;
    
    // Load test cards
    loadTestCards();
    
    // ✅ Load submitted tests and results (NEW!)
    await loadSubmittedTests();
    
    // ✅ Optional: Start auto-refresh (NEW!)
    startResultsAutoRefresh(5); // Refresh every 5 minutes
}

// When going back to subjects
function backToSubjects() {
    // Stop auto-refresh when leaving subject page
    stopResultsAutoRefresh();
    
    // ... your existing back navigation code ...
}
*/

console.log('📊 Results & Feedback Module Loaded');