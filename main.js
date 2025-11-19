// Application State
let currentUser = null;
let selectedSubject = null;
let hasPaidSubscription = false;
let currentTopicId = null;

// Supabase Configuration
const SUPABASE_URL = 'https://zggtadgymqkszwizvono.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZ3RhZGd5bXFrc3p3aXp2b25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMTg4NTAsImV4cCI6MjA3Nzg5NDg1MH0.A2R9qcrwKq7qSGbGXUwHYRzregQGy4SMYU7yQAZwm1Q';

// Razorpay Configuration
// IMPORTANT: Replace these with your actual Razorpay keys
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_ID'; // Replace with your Razorpay Key ID
const RAZORPAY_KEY_SECRET = 'YOUR_KEY_SECRET'; // This should be on backend only

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

// Initialize the application
function init() {
    checkAuthStatus();
}

// Toggle Subject Dropdown
function toggleSubjectDropdown(event) {
    event.preventDefault();
    const dropdown = document.getElementById('subjectList');
    dropdown.classList.toggle('active');
}

// Close all dropdowns
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

// Click outside to close dropdowns
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
        closeAllDropdowns();
    }
});

// Select Subject
function selectSubject(event, subject) {
    event.preventDefault();
    selectedSubject = subject;
    closeAllDropdowns();
    showAlert('Success', `Subject selected: ${subject}. Please login to continue.`);
}

// Show Alert
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

// Close Modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Show Sign In Modal
function showSignInModal() {
    if (!selectedSubject) {
        showAlert('Error', 'Please select a subject first!');
        return;
    }
    document.getElementById('signInModal').classList.add('active');
}

// Show Login Modal
function showLoginModal() {
    if (!selectedSubject) {
        showAlert('Error', 'Please select a subject first!');
        return;
    }
    document.getElementById('loginModal').classList.add('active');
}

// Handle Sign In
async function handleSignIn() {
    const name = document.getElementById('signInName').value.trim();
    const email = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value;

    if (!name || !email || !password) {
        showAlert('Error', 'Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        showAlert('Error', 'Password must be at least 6 characters');
        return;
    }

    if (!selectedSubject) {
        showAlert('Error', 'Please select a subject first!');
        return;
    }

    try {
        console.log('📝 Creating new account...');

        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            console.error('Auth error:', authError);
            showAlert('Error', authError.message);
            return;
        }

        // Insert student data
        const { data: studentData, error: studentError } = await supabaseClient
            .from('Students')
            .insert([{
                user_id: authData.user.id,
                name: name,
                email: email,
                board: 'AP',
                subject: selectedSubject,
                has_paid: false
            }])
            .select();

        if (studentError) {
            console.error('Student insert error:', studentError);
            showAlert('Error', 'Failed to create account: ' + studentError.message);
            return;
        }

        console.log('✅ Account created successfully');
        
        currentUser = {
            id: authData.user.id,
            name: name,
            email: email,
            board: 'AP',
            subject: selectedSubject
        };

        closeModal('signInModal');
        showDashboard();
        showAlert('Success', 'Account created successfully! Welcome to Peak Study.');

    } catch (error) {
        console.error('Exception:', error);
        showAlert('Error', 'Something went wrong. Please try again.');
    }
}

// Handle Login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAlert('Error', 'Please fill in all fields');
        return;
    }

    if (!selectedSubject) {
        showAlert('Error', 'Please select a subject first!');
        return;
    }

    try {
        console.log('🔐 Logging in...');

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            console.error('Login error:', authError);
            showAlert('Error', authError.message);
            return;
        }

        // Fetch student data
        const { data: studentData, error: studentError } = await supabaseClient
            .from('Students')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

        if (studentError) {
            console.error('Student fetch error:', studentError);
            showAlert('Error', 'Failed to fetch student data');
            return;
        }

        console.log('✅ Login successful');

        currentUser = {
            id: authData.user.id,
            name: studentData.name,
            email: studentData.email,
            board: studentData.board,
            subject: studentData.subject
        };

        hasPaidSubscription = studentData.has_paid || false;
        selectedSubject = studentData.subject;

        closeModal('loginModal');
        showDashboard();

    } catch (error) {
        console.error('Exception:', error);
        showAlert('Error', 'Something went wrong. Please try again.');
    }
}

// Show Dashboard
function showDashboard() {
    // Hide welcome screen
    document.getElementById('welcomeScreen').classList.add('hidden');
    
    // Hide public nav, show user nav
    document.getElementById('publicNav').classList.add('hidden');
    document.getElementById('userNav').classList.remove('hidden');
    
    // Show dashboard
    document.getElementById('dashboardContainer').classList.remove('hidden');
    
    // Update user profile
    document.getElementById('userProfile').textContent = 
        `${currentUser.name} | AP - ${currentUser.subject}`;
    
    // Show topics by default
    showSection('topics');
}

// Show Section
async function showSection(section) {
    console.log('📂 Opening section:', section);
    
    // Remove active class from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    event.target.classList.add('active');
    
    // Hide all sections
    document.getElementById('topicsSection').classList.add('hidden');
    document.getElementById('topicDetailSection').classList.add('hidden');
    document.getElementById('classesSection').classList.add('hidden');
    document.getElementById('testsSection').classList.add('hidden');
    document.getElementById('recordedSection').classList.add('hidden');
    
    // Show selected section
    document.getElementById(`${section}Section`).classList.remove('hidden');
    
    // Load content based on section
    if (section === 'topics') {
        await loadTopics();
    } else if (section === 'classes') {
        await loadClasses();
    } else if (section === 'tests') {
        await loadTests();
    } else if (section === 'recorded') {
        await loadRecordedVideos();
    }
}

// Load Topics
async function loadTopics() {
    const container = document.getElementById('topicsList');
    container.innerHTML = '<p style="padding: 20px;">Loading topics...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('topics')
            .select('*')
            .eq('board', 'AP')
            .eq('subject', currentUser.subject)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching topics:', error);
            container.innerHTML = '<p style="padding: 20px; color: red;">Failed to load topics</p>';
            return;
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="padding: 20px; color: #666;">No topics available yet.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        data.forEach(topic => {
            const card = document.createElement('div');
            card.className = 'topic-card';
            card.onclick = () => showTopicDetail(topic.id, topic.name);
            
            card.innerHTML = `
                <h3>${topic.name}</h3>
                <p>${topic.description || 'Click to view detailed content'}</p>
            `;
            
            container.appendChild(card);
        });
        
        console.log(`✅ Loaded ${data.length} topics`);
        
    } catch (error) {
        console.error('Exception:', error);
        container.innerHTML = '<p style="padding: 20px; color: red;">Error loading topics</p>';
    }
}

// Show Topic Detail
async function showTopicDetail(topicId, topicName) {
    console.log('📖 Opening topic:', topicName);
    currentTopicId = topicId;
    
    // Hide topics list, show detail
    document.getElementById('topicsSection').classList.add('hidden');
    document.getElementById('topicDetailSection').classList.remove('hidden');
    
    // Set title
    document.getElementById('topicDetailTitle').textContent = topicName;
    document.getElementById('topicDetailDesc').textContent = 'Loading...';
    document.getElementById('topicDetailContent').innerHTML = '<p>Loading content...</p>';
    
    try {
        // Fetch topic info
        const { data: topic, error: topicError } = await supabaseClient
            .from('topics')
            .select('*')
            .eq('id', topicId)
            .single();
        
        if (topicError) {
            console.error('Error:', topicError);
            document.getElementById('topicDetailContent').innerHTML = 
                '<p style="color: red;">Failed to load topic details</p>';
            return;
        }
        
        document.getElementById('topicDetailDesc').textContent = topic.description || '';
        
        // Fetch topic content (paragraphs)
        const { data: content, error: contentError } = await supabaseClient
            .from('topic_content')
            .select('*')
            .eq('topic_id', topicId)
            .order('order_index', { ascending: true });
        
        if (contentError) {
            console.error('Error:', contentError);
            document.getElementById('topicDetailContent').innerHTML = 
                '<p style="color: red;">Failed to load content</p>';
            return;
        }
        
        const contentDiv = document.getElementById('topicDetailContent');
        
        if (!content || content.length === 0) {
            contentDiv.innerHTML = '<p style="color: #666;">No detailed content available yet.</p>';
            return;
        }
        
        contentDiv.innerHTML = '';
        
        content.forEach(item => {
            const section = document.createElement('div');
            section.className = 'topic-detail';
            
            let html = '';
            if (item.heading) {
                html += `<h3>${item.heading}</h3>`;
            }
            html += `<p>${item.paragraph}</p>`;
            
            section.innerHTML = html;
            contentDiv.appendChild(section);
        });
        
        console.log(`✅ Loaded ${content.length} paragraphs`);
        
    } catch (error) {
        console.error('Exception:', error);
        document.getElementById('topicDetailContent').innerHTML = 
            '<p style="color: red;">Error loading content</p>';
    }
}

// Back to Topics
function backToTopics() {
    document.getElementById('topicDetailSection').classList.add('hidden');
    document.getElementById('topicsSection').classList.remove('hidden');
}

// Load Classes
async function loadClasses() {
    const container = document.getElementById('classesList');
    container.innerHTML = '<p style="padding: 20px;">Loading classes...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('classes')
            .select('*')
            .eq('board', 'AP')
            .eq('subject', currentUser.subject)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error:', error);
            container.innerHTML = '<p style="padding: 20px; color: red;">Failed to load classes</p>';
            return;
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="padding: 20px; color: #666;">No classes available yet.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        data.forEach(classItem => {
            const card = document.createElement('div');
            card.className = 'class-card';
            
            card.innerHTML = `
                <div class="class-info">
                    <h3>${classItem.name}</h3>
                    <p>${classItem.description || ''}</p>
                    ${classItem.time ? `<p>⏰ ${classItem.time}</p>` : ''}
                    ${classItem.instructor ? `<p>👨‍🏫 ${classItem.instructor}</p>` : ''}
                </div>
                <button class="btn-join" onclick="joinClass('${classItem.class_link || '#'}')">
                    Join Class
                </button>
            `;
            
            container.appendChild(card);
        });
        
        console.log(`✅ Loaded ${data.length} classes`);
        
    } catch (error) {
        console.error('Exception:', error);
        container.innerHTML = '<p style="padding: 20px; color: red;">Error loading classes</p>';
    }
}

// Join Class
function joinClass(link) {
    if (!link || link === '#') {
        showAlert('Error', 'Class link not available yet');
        return;
    }
    window.open(link, '_blank');
}

// Load Tests - WITH PAYMENT CHECK
async function loadTests() {
    const container = document.getElementById('testsList');
    container.innerHTML = '<p style="padding: 20px;">Loading tests...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('tests')
            .select('*')
            .eq('board', 'AP')
            .eq('subject', currentUser.subject)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error:', error);
            container.innerHTML = '<p style="padding: 20px; color: red;">Failed to load tests</p>';
            return;
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="padding: 20px; color: #666;">No tests available yet.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        data.forEach(test => {
            const card = document.createElement('div');
            card.className = 'test-card';
            
            // Check if test is locked and user hasn't paid
            const isLocked = test.is_locked && !hasPaidSubscription;
            
            if (isLocked) {
                card.onclick = () => showPaymentModal();
                card.innerHTML = `
                    <h3>${test.name}</h3>
                    <p>${test.description || ''}</p>
                    ${test.duration ? `<p>⏱️ Duration: ${test.duration}</p>` : ''}
                    ${test.total_marks ? `<p>📊 Total Marks: ${test.total_marks}</p>` : ''}
                    <span style="position: absolute; top: 20px; right: 20px; font-size: 24px;">🔒</span>
                `;
            } else {
                card.onclick = () => openTest(test.typeform_link);
                card.innerHTML = `
                    <h3>${test.name}</h3>
                    <p>${test.description || ''}</p>
                    ${test.duration ? `<p>⏱️ Duration: ${test.duration}</p>` : ''}
                    ${test.total_marks ? `<p>📊 Total Marks: ${test.total_marks}</p>` : ''}
                `;
            }
            
            container.appendChild(card);
        });
        
        console.log(`✅ Loaded ${data.length} tests`);
        
    } catch (error) {
        console.error('Exception:', error);
        container.innerHTML = '<p style="padding: 20px; color: red;">Error loading tests</p>';
    }
}

// Open Test
function openTest(link) {
    if (!link) {
        showAlert('Error', 'Test link not available yet');
        return;
    }
    window.open(link, '_blank');
}

// Load Recorded Videos - WITH PAYMENT CHECK
async function loadRecordedVideos() {
    const container = document.getElementById('recordedList');
    container.innerHTML = '<p style="padding: 20px;">Loading recorded classes...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('recorded_videos')
            .select('*')
            .eq('board', 'AP')
            .eq('subject', currentUser.subject)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error:', error);
            container.innerHTML = '<p style="padding: 20px; color: red;">Failed to load videos</p>';
            return;
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="padding: 20px; color: #666;">No recorded classes available yet.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        data.forEach(video => {
            const card = document.createElement('div');
            card.className = 'video-card';
            
            // Check if video is locked and user hasn't paid
            const isLocked = video.is_locked && !hasPaidSubscription;
            
            if (isLocked) {
                card.onclick = () => showPaymentModal();
                card.innerHTML = `
                    <h3>${video.title}</h3>
                    <p>${video.description || ''}</p>
                    ${video.duration ? `<p>⏱️ ${video.duration}</p>` : ''}
                    <span style="position: absolute; top: 20px; right: 20px; font-size: 24px;">🔒</span>
                `;
            } else {
                card.onclick = () => watchVideo(video.video_url);
                card.innerHTML = `
                    <h3>${video.title}</h3>
                    <p>${video.description || ''}</p>
                    ${video.duration ? `<p>⏱️ ${video.duration}</p>` : ''}
                `;
            }
            
            container.appendChild(card);
        });
        
        console.log(`✅ Loaded ${data.length} videos`);
        
    } catch (error) {
        console.error('Exception:', error);
        container.innerHTML = '<p style="padding: 20px; color: red;">Error loading videos</p>';
    }
}

// Watch Video
function watchVideo(link) {
    if (!link) {
        showAlert('Error', 'Video link not available yet');
        return;
    }
    window.open(link, '_blank');
}

// Show Payment Modal
function showPaymentModal() {
    document.getElementById('paymentModal').classList.add('active');
}

// Process Payment with Razorpay
function processPayment() {
    // Razorpay payment options
    const options = {
        key: RAZORPAY_KEY_ID, // Enter your Razorpay Key ID
        amount: 49900, // Amount in paise (₹499 = 49900 paise)
        currency: 'INR',
        name: 'Peak Study',
        description: 'Monthly Subscription',
        image: 'https://your-logo-url.com/logo.png', // Optional: Add your logo URL
        handler: async function (response) {
            // Payment successful
            console.log('Payment successful:', response);
            
            // Verify payment and update subscription
            await updateSubscriptionStatus(response);
        },
        prefill: {
            name: currentUser.name,
            email: currentUser.email,
            contact: '' // Optional: Add phone number if available
        },
        notes: {
            user_id: currentUser.id,
            board: 'AP',
            subject: currentUser.subject
        },
        theme: {
            color: '#667eea'
        },
        modal: {
            ondismiss: function() {
                console.log('Payment cancelled');
            }
        }
    };

    // Create Razorpay instance and open checkout
    const razorpay = new Razorpay(options);
    razorpay.open();
}

// Update Subscription Status after successful payment
async function updateSubscriptionStatus(paymentResponse) {
    try {
        console.log('💳 Updating subscription status...');
        
        // Update student's has_paid status in database
        const { data, error } = await supabaseClient
            .from('Students')
            .update({ has_paid: true })
            .eq('user_id', currentUser.id);
        
        if (error) {
            console.error('Error updating subscription:', error);
            showAlert('Error', 'Payment successful but failed to update subscription. Please contact support.');
            return;
        }
        
        // Update local state
        hasPaidSubscription = true;
        
        // Close payment modal
        closeModal('paymentModal');
        
        // Show success message
        showAlert('Success', 'Payment successful! You now have access to all premium content. 🎉');
        
        // Reload current section to show unlocked content
        const currentSection = document.querySelector('.sidebar-item.active');
        if (currentSection) {
            currentSection.click();
        }
        
        console.log('✅ Subscription activated successfully');
        
    } catch (error) {
        console.error('Exception:', error);
        showAlert('Error', 'Failed to update subscription. Please contact support.');
    }
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
    selectedSubject = null;
    hasPaidSubscription = false;
    
    // Hide dashboard, show welcome
    document.getElementById('dashboardContainer').classList.add('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    
    // Show public nav, hide user nav
    document.getElementById('publicNav').classList.remove('hidden');
    document.getElementById('userNav').classList.add('hidden');
    
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
        
        if (error || !user) {
            console.log('No active session');
            return;
        }
        
        console.log('✅ Active session found');
        
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
        
        currentUser = {
            id: user.id,
            name: studentData.name,
            email: studentData.email,
            board: studentData.board,
            subject: studentData.subject
        };
        
        hasPaidSubscription = studentData.has_paid || false;
        selectedSubject = studentData.subject;
        
        showDashboard();
        
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Initialize on page load
window.onload = init;