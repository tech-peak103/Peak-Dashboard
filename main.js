// Application State - Declare first before everything
let currentUser = null;
let selectedBoard = null;
let selectedSubject = null;
let hasPaidSubscription = false;

// Supabase Configuration
const SUPABASE_URL = 'https://zggtadgymqkszwizvono.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZ3RhZGd5bXFrc3p3aXp2b25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMTg4NTAsImV4cCI6MjA3Nzg5NDg1MH0.A2R9qcrwKq7qSGbGXUwHYRzregQGy4SMYU7yQAZwm1Q';

// Initialize Supabase client
let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase client initialized successfully');
    }
} catch (error) {
    console.error('❌ Supabase initialization error:', error);
}

// Board and Subject Data
const boardsData = {
    'ISC-XI': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Accounts'],
    'ISC-XII': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Accounts'],
    'CBSE-XI': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Accounts'],
    'CBSE-XII': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Accounts'],
    'IB-XI': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
    'IB-XII': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
    'A LEVEL': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
    'AP': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
    'ICSE': ['Math', 'English', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science']
};

// Board & Subject Specific Content Data
const contentDatabase = {
    // AP Board - All subjects
    'AP-Math': {
        topics: [
            { id: 1, name: 'AP Calculus AB - Limits', description: 'Understanding limits and continuity' },
            { id: 2, name: 'AP Calculus AB - Derivatives', description: 'Differentiation rules and applications' },
            { id: 3, name: 'AP Calculus AB - Integrals', description: 'Integration techniques and applications' },
            { id: 4, name: 'AP Statistics - Probability', description: 'Probability distributions and inference' }
        ],
        classes: [
            { id: 1, name: 'AP Calculus Live Class', time: 'Today at 5:00 PM', instructor: 'Prof. Johnson' },
            { id: 2, name: 'AP Statistics Workshop', time: 'Tomorrow at 3:00 PM', instructor: 'Prof. Williams' },
            { id: 3, name: 'AP Math Review Session', time: 'Friday at 4:00 PM', instructor: 'Prof. Davis' }
        ],
        tests: [
            { id: 1, name: 'AP Calculus AB - Mock Test', questions: 45, duration: '90 mins', locked: true },
            { id: 2, name: 'AP Statistics Quiz', questions: 30, duration: '60 mins', locked: true },
            { id: 3, name: 'AP Math Practice Exam', questions: 50, duration: '120 mins', locked: true }
        ],
        recorded: [
            { id: 1, name: 'AP Calculus AB Complete Course', duration: '180 mins', locked: true },
            { id: 2, name: 'AP Statistics Fundamentals', duration: '150 mins', locked: true },
            { id: 3, name: 'AP Math Exam Strategies', duration: '90 mins', locked: true }
        ]
    },

    'AP-Physics': {
        topics: [
            { id: 1, name: 'AP Physics - Mechanics', description: 'Kinematics and dynamics' },
            { id: 2, name: 'AP Physics - Electricity', description: 'Electric circuits and fields' },
            { id: 3, name: 'AP Physics - Magnetism', description: 'Magnetic fields and induction' }
        ],
        classes: [
            { id: 1, name: 'AP Physics Live Session', time: 'Today at 6:00 PM', instructor: 'Prof. Anderson' }
        ],
        tests: [
            { id: 1, name: 'AP Physics Practice Test', questions: 40, duration: '90 mins', locked: true }
        ],
        recorded: [
            { id: 1, name: 'AP Physics Complete Guide', duration: '200 mins', locked: true }
        ]
    },
    
    // CBSE-XII - All subjects
    'CBSE-XII-Math': {
        topics: [
            { id: 1, name: 'Relations and Functions', description: 'Types of relations, functions and their properties' },
            { id: 2, name: 'Inverse Trigonometric Functions', description: 'Domain, range and properties' },
            { id: 3, name: 'Matrices and Determinants', description: 'Matrix operations and determinant calculations' },
            { id: 4, name: 'Continuity and Differentiability', description: 'Limits, continuity and derivatives' },
            { id: 5, name: 'Integration', description: 'Indefinite and definite integrals' },
            { id: 6, name: 'Vector Algebra', description: 'Vector operations and applications' }
        ],
        classes: [
            { id: 1, name: 'Live Class: Calculus Advanced', time: 'Today at 5:00 PM', instructor: 'Prof. Sharma' },
            { id: 2, name: 'Live Class: Matrices Deep Dive', time: 'Tomorrow at 3:00 PM', instructor: 'Prof. Gupta' },
            { id: 3, name: 'Integration Workshop', time: 'Friday at 4:00 PM', instructor: 'Prof. Singh' }
        ],
        tests: [
            { id: 1, name: 'Relations & Functions Test', questions: 20, duration: '45 mins', locked: true },
            { id: 2, name: 'Calculus Chapter Test', questions: 25, duration: '60 mins', locked: true },
            { id: 3, name: 'Matrices Assessment', questions: 20, duration: '40 mins', locked: true }
        ],
        recorded: [
            { id: 1, name: 'Relations and Functions Complete', duration: '90 mins', locked: true },
            { id: 2, name: 'Calculus Masterclass', duration: '120 mins', locked: true },
            { id: 3, name: 'Matrices and Determinants', duration: '75 mins', locked: true }
        ]
    },

    'CBSE-XII-Physics': {
        topics: [
            { id: 1, name: 'Electric Charges and Fields', description: 'Coulomb\'s law and electric field' },
            { id: 2, name: 'Current Electricity', description: 'Ohm\'s law and circuits' },
            { id: 3, name: 'Magnetism', description: 'Magnetic effects of current' }
        ],
        classes: [
            { id: 1, name: 'CBSE Physics Live Class', time: 'Today at 4:00 PM', instructor: 'Prof. Verma' }
        ],
        tests: [
            { id: 1, name: 'Physics Chapter Test', questions: 30, duration: '60 mins', locked: true }
        ],
        recorded: [
            { id: 1, name: 'CBSE Physics Course', duration: '180 mins', locked: true }
        ]
    },

    // ISC-XII - All subjects
    'ISC-XII-Math': {
        topics: [
            { id: 1, name: 'Relations and Functions', description: 'Relations, types of functions' },
            { id: 2, name: 'Algebra', description: 'Matrices, determinants and linear equations' },
            { id: 3, name: 'Calculus', description: 'Differentiation and integration' },
            { id: 4, name: 'Probability', description: 'Probability distributions and theorems' }
        ],
        classes: [
            { id: 1, name: 'ISC Math Live Class', time: 'Today at 5:00 PM', instructor: 'Prof. Mehta' },
            { id: 2, name: 'ISC Calculus Workshop', time: 'Tomorrow at 3:00 PM', instructor: 'Prof. Patel' }
        ],
        tests: [
            { id: 1, name: 'ISC Math Chapter Test', questions: 20, duration: '45 mins', locked: true },
            { id: 2, name: 'ISC Probability Quiz', questions: 15, duration: '30 mins', locked: true }
        ],
        recorded: [
            { id: 1, name: 'ISC Math Full Course', duration: '180 mins', locked: true },
            { id: 2, name: 'ISC Calculus Basics', duration: '90 mins', locked: true }
        ]
    },

    // Default fallback content
    'default': {
        topics: [
            { id: 1, name: 'Getting Started', description: 'Introduction to the subject' },
            { id: 2, name: 'Fundamental Concepts', description: 'Basic concepts and principles' },
            { id: 3, name: 'Advanced Topics', description: 'In-depth study of advanced concepts' }
        ],
        classes: [
            { id: 1, name: 'Introduction Class', time: 'Today at 5:00 PM', instructor: 'Prof. Smith' }
        ],
        tests: [
            { id: 1, name: 'Basic Assessment', questions: 20, duration: '30 mins', locked: true }
        ],
        recorded: [
            { id: 1, name: 'Subject Overview', duration: '60 mins', locked: true }
        ]
    }
};

// Fetch content from Supabase database
async function getContentFromDatabase(board, subject, contentType) {
    if (!supabaseClient) {
        console.error('❌ Supabase client not available');
        return [];
    }

    try {
        console.log(`🔍 Fetching ${contentType} for ${board} - ${subject}`);
        
        const tableName = contentType === 'recorded' ? 'recorded_videos' : contentType;
        
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .eq('board', board)
            .eq('subject', subject)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(`❌ Error fetching ${contentType}:`, error);
            return [];
        }

        console.log(`✅ Fetched ${data.length} ${contentType} items`);
        return data;
        
    } catch (error) {
        console.error(`❌ Exception fetching ${contentType}:`, error);
        return [];
    }
}

// Fetch topic detail with content paragraphs
async function getTopicDetail(topicId) {
    if (!supabaseClient) {
        console.error('❌ Supabase client not available');
        return null;
    }

    try {
        console.log(`🔍 Fetching topic detail for ID: ${topicId}`);
        
        // Fetch topic info
        const { data: topic, error: topicError } = await supabaseClient
            .from('topics')
            .select('*')
            .eq('id', topicId)
            .single();

        if (topicError) {
            console.error('❌ Error fetching topic:', topicError);
            return null;
        }

        // Fetch topic content (paragraphs)
        const { data: content, error: contentError } = await supabaseClient
            .from('topic_content')
            .select('*')
            .eq('topic_id', topicId)
            .order('order_index', { ascending: true });

        if (contentError) {
            console.error('❌ Error fetching topic content:', contentError);
            return { ...topic, content: [] };
        }

        console.log(`✅ Fetched topic with ${content.length} paragraphs`);
        return { ...topic, content };
        
    } catch (error) {
        console.error('❌ Exception fetching topic detail:', error);
        return null;
    }
}

// Show topic detail page
async function showTopicDetail(topicId, topicName) {
    console.log('📖 Opening topic detail:', topicName);
    
    // Hide all sections
    document.querySelectorAll('.content-area > div:not(.welcome-screen)').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show topic detail section
    const detailSection = document.getElementById('topicDetailSection');
    detailSection.classList.remove('hidden');
    
    // Set title
    document.getElementById('topicDetailTitle').textContent = topicName;
    document.getElementById('topicDetailDesc').textContent = 'Loading...';
    document.getElementById('topicDetailContent').innerHTML = '<p style="padding: 20px;">Loading content...</p>';
    
    // Fetch topic details
    const topicData = await getTopicDetail(topicId);
    
    if (!topicData) {
        document.getElementById('topicDetailDesc').textContent = 'Error loading topic';
        document.getElementById('topicDetailContent').innerHTML = '<p style="color: #dc3545;">Failed to load content. Please try again.</p>';
        return;
    }
    
    // Set description
    document.getElementById('topicDetailDesc').textContent = topicData.description || '';
    
    // Display content paragraphs
    const contentDiv = document.getElementById('topicDetailContent');
    contentDiv.innerHTML = '';
    
    if (!topicData.content || topicData.content.length === 0) {
        contentDiv.innerHTML = '<p style="color: #666;">No detailed content available yet.</p>';
        return;
    }
    
    topicData.content.forEach(item => {
        const section = document.createElement('div');
        section.style.marginBottom = '25px';
        section.style.padding = '20px';
        section.style.background = '#f8f9fa';
        section.style.borderRadius = '8px';
        section.style.borderLeft = '4px solid #667eea';
        
        if (item.heading) {
            const heading = document.createElement('h3');
            heading.textContent = item.heading;
            heading.style.color = '#333';
            heading.style.marginBottom = '10px';
            section.appendChild(heading);
        }
        
        const para = document.createElement('p');
        para.textContent = item.paragraph;
        para.style.color = '#555';
        para.style.lineHeight = '1.6';
        section.appendChild(para);
        
        contentDiv.appendChild(section);
    });
    
    console.log('✅ Topic detail loaded successfully');
}

// Back to topics list
function backToTopics() {
    showSection('topics');
}

// Initialize the application
function init() {
    populateBoardDropdown();
    checkAuthStatus();
}

// Populate Board Dropdown
function populateBoardDropdown() {
    const dropdown = document.getElementById('boardDropdown');
    dropdown.innerHTML = '';

    Object.keys(boardsData).forEach(board => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = board;
        link.onclick = (e) => {
            e.preventDefault();
            selectBoard(board);
        };
        dropdown.appendChild(link);
    });
}

// Select Board
function selectBoard(board) {
    selectedBoard = board;
    closeAllDropdowns();
    showSubjectModal(board);
}

// Show Subject Modal
function showSubjectModal(board) {
    const modal = document.getElementById('subjectModal');
    const subjectList = document.getElementById('subjectList');
    subjectList.innerHTML = '';

    boardsData[board].forEach(subject => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-login';
        btn.style.margin = '5px';
        btn.textContent = subject;
        btn.onclick = () => selectSubject(subject);
        subjectList.appendChild(btn);
    });

    modal.classList.add('active');
}

// Select Subject
function selectSubject(subject) {
    selectedSubject = subject;
    closeModal('subjectModal');
    showAlert('Selection Complete', `You have selected ${selectedBoard} - ${selectedSubject}`);
}

// Toggle Curriculum Dropdown
function toggleCurriculumDropdown(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = document.getElementById('boardDropdown');
    dropdown.classList.toggle('show');
}

// Close all dropdowns when clicking outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) {
        closeAllDropdowns();
    }
});

function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    dropdowns.forEach(d => d.classList.remove('show'));
}

// Show Modals
function showLoginModal() {
    if (!selectedBoard || !selectedSubject) {
        showAlert('Selection Required', 'Please select your Board and Subject first.');
        return;
    }
    document.getElementById('loginModal').classList.add('active');
}

function showSignInModal() {
    if (!selectedBoard || !selectedSubject) {
        showAlert('Selection Required', 'Please select your Board and Subject first.');
        return;
    }
    document.getElementById('signInModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

// Handle Login - WITH SUPABASE (NO EMAIL VERIFICATION)
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAlert('Error', 'Please fill in all fields');
        return;
    }

    if (!supabaseClient) {
        showAlert('Error', 'Database connection not available');
        return;
    }

    try {
        console.log('🔐 Attempting login for:', email);

        // Supabase auth login
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            console.error('❌ Auth error:', authError);
            showAlert('Login Error', authError.message);
            return;
        }

        console.log('✅ User authenticated:', authData.user.id);

        // Students table se data fetch karo
        const { data: studentData, error: studentError } = await supabaseClient
            .from('Students')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

        if (studentError) {
            console.error('❌ Student fetch error:', studentError);
            showAlert('Error', 'Unable to fetch student data. Please try again.');
            return;
        }

        console.log('✅ Student data fetched:', studentData);

        // Set current user
        currentUser = {
            id: authData.user.id,
            name: studentData.name,
            email: studentData.email,
            board: studentData.board,
            subject: studentData.subject
        };

        selectedBoard = studentData.board;
        selectedSubject = studentData.subject;

        closeModal('loginModal');
        showAlert('Success', `Welcome back, ${studentData.name}!`);
        
        setTimeout(() => {
            closeModal('alertModal');
            showDashboard();
        }, 1500);

    } catch (error) {
        console.error('❌ Login error:', error);
        showAlert('Error', 'Something went wrong: ' + error.message);
    }
}

// Handle Sign In - WITH SUPABASE (NO EMAIL VERIFICATION REQUIRED)
async function handleSignIn() {
    const name = document.getElementById('signInName').value;
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    if (!name || !email || !password) {
        showAlert('Error', 'Please fill in all fields');
        return;
    }

    if (!supabaseClient) {
        showAlert('Error', 'Database connection not available');
        return;
    }

    try {
        console.log('📝 Attempting signup for:', email);

        // Supabase auth me user banao (EMAIL VERIFICATION SKIP)
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin,
                data: {
                    name: name
                }
            }
        });

        if (authError) {
            console.error('❌ Auth signup error:', authError);
            showAlert('Sign Up Error', authError.message);
            return;
        }

        // Check if email confirmation is required
        if (authData.user && !authData.session) {
            showAlert('Email Verification Required', 'Please check your email to verify your account before logging in.');
            closeModal('signInModal');
            return;
        }

        console.log('✅ Auth user created:', authData.user.id);

        // Students table me data save karo
        const { data: studentData, error: studentError } = await supabaseClient
            .from('Students')
            .insert([{
                user_id: authData.user.id,
                name: name,
                email: email,
                board: selectedBoard,
                subject: selectedSubject
            }])
            .select();

        if (studentError) {
            console.error('❌ Student insert error:', studentError);
            showAlert('Error', 'Failed to save student data: ' + studentError.message);
            return;
        }

        console.log('✅ Student data saved:', studentData);

        // Success - Auto login if session exists
        if (authData.session) {
            currentUser = {
                id: authData.user.id,
                name: name,
                email: email,
                board: selectedBoard,
                subject: selectedSubject
            };

            showAlert('Success', 'Account created successfully!');
            closeModal('signInModal');
            
            setTimeout(() => {
                closeModal('alertModal');
                showDashboard();
            }, 1500);
        } else {
            showAlert('Success', 'Account created! You can now login.');
            closeModal('signInModal');
        }

    } catch (error) {
        console.error('❌ Signup error:', error);
        showAlert('Error', 'Something went wrong: ' + error.message);
    }
}

// Show Dashboard
function showDashboard() {
    console.log('🏠 Opening dashboard...');
    console.log('👤 User:', currentUser);
    console.log('📚 Board:', selectedBoard, '| Subject:', selectedSubject);
    
    document.getElementById('publicNav').classList.add('hidden');
    document.getElementById('userNav').classList.remove('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.getElementById('welcomeScreen').classList.add('hidden');

    const boardClass = selectedBoard.includes('XI') ? 'XI' : 'XII';
    const userProfile = document.getElementById('userProfile');
    userProfile.innerHTML = `
        <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
        <div>${currentUser.name}_${selectedBoard.split('-')[0]}_${boardClass}_${selectedSubject}</div>
    `;

    console.log('🎯 Loading Topics section...');
    showSection('topics');
}

// Show Section
function showSection(section) {
    document.querySelectorAll('.content-area > div:not(.welcome-screen)').forEach(el => {
        el.classList.add('hidden');
    });

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    event.target.classList.add('active');

    const sectionMap = {
        'topics': 'topicsSection',
        'classes': 'classesSection',
        'tests': 'testsSection',
        'recorded': 'recordedSection'
    };

    document.getElementById(sectionMap[section]).classList.remove('hidden');
    loadContent(section);
}

// Load Content - Fetch from Supabase Database
async function loadContent(section) {
    console.log('📖 Loading content for section:', section);
    console.log('👤 Current user board:', selectedBoard, '| Subject:', selectedSubject);
    
    // Fix: Correct element IDs (singular, not plural)
    const listId = section === 'topics' ? 'topicList' :
                   section === 'classes' ? 'classList' :
                   section === 'tests' ? 'testList' :
                   section === 'recorded' ? 'recordedList' : section + 'List';
    
    console.log('🎯 Looking for element with ID:', listId);
    
    const list = document.getElementById(listId);
    
    if (!list) {
        console.error('❌ List element not found:', listId);
        return;
    }
    
    // Show loading message
    list.innerHTML = '<p style="padding: 20px; color: #666;">Loading...</p>';

    // Fetch data from Supabase
    const data = await getContentFromDatabase(selectedBoard, selectedSubject, section);

    if (!data || data.length === 0) {
        console.warn('⚠️ No data found for section:', section);
        list.innerHTML = '<p style="padding: 20px; color: #666;">No content available for this section yet.</p>';
        return;
    }

    // Clear loading message
    list.innerHTML = '';

    console.log(`✅ Loading ${data.length} items for section: ${section}`);

    data.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name}`);
        
        const card = document.createElement('div');
        card.className = 'item-card';

        // For topics section, make cards clickable to show detail
        if (section === 'topics') {
            card.style.cursor = 'pointer';
            card.onclick = () => showTopicDetail(item.id, item.name);
        }

        // Check if locked (for tests and recorded videos)
        const isLocked = item.is_locked !== undefined ? item.is_locked : (item.locked || false);
        
        if (isLocked && !hasPaidSubscription && section !== 'topics') {
            card.classList.add('locked');
            card.onclick = () => showPaymentAlert();
        }

        let content = `<h3>${item.name}</h3>`;
        if (item.description) content += `<p>${item.description}</p>`;
        if (item.time) content += `<p>⏰ ${item.time}</p>`;
        if (item.instructor) content += `<p>👨‍🏫 ${item.instructor}</p>`;
        if (item.questions) content += `<p>📝 ${item.questions} Questions | ⏱️ ${item.duration}</p>`;
        if (item.duration && !item.questions) content += `<p>⏱️ ${item.duration}</p>`;
        if (isLocked && !hasPaidSubscription) content += `<span class="lock-icon">🔒</span>`;
        
        // Add click indicator for topics
        if (section === 'topics') {
            content += `<span style="float: right; color: #667eea;">→</span>`;
        }

        card.innerHTML = content;
        list.appendChild(card);
    });
    
    console.log(`✅ Successfully loaded ${data.length} items for ${selectedBoard} - ${selectedSubject} (${section})`);
}

// Show Payment Alert
function showPaymentAlert() {
    showAlert('Payment Required', 'Please complete your payment to access this content.');
}

// Logout
async function logout() {
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('Logout error:', error);
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
    }

    currentUser = null;
    selectedBoard = null;
    selectedSubject = null;
    hasPaidSubscription = false;

    document.getElementById('publicNav').classList.remove('hidden');
    document.getElementById('userNav').classList.add('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden');

    document.querySelectorAll('.content-area > div:not(.welcome-screen)').forEach(el => {
        el.classList.add('hidden');
    });

    showAlert('Success', 'You have been logged out successfully.');
}

// Check Auth Status
async function checkAuthStatus() {
    if (!supabaseClient) {
        console.log('Supabase client not available');
        return;
    }

    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            console.log('No active session');
            return;
        }

        if (user) {
            console.log('✅ Active session found for user:', user.id);
            
            // Fetch student data
            const { data: studentData, error: studentError } = await supabaseClient
                .from('Students')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (studentError) {
                console.error('Error fetching student data:', studentError);
                return;
            }

            // Set current user
            currentUser = {
                id: user.id,
                name: studentData.name,
                email: studentData.email,
                board: studentData.board,
                subject: studentData.subject
            };

            selectedBoard = studentData.board;
            selectedSubject = studentData.subject;

            showDashboard();
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Initialize on page load
window.onload = init;