const SUPABASE_URL = 'https://gkloowizszlxzxdhnszm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbG9vd2l6c3pseHp4ZGhuc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTY5MzQsImV4cCI6MjA3OTc5MjkzNH0.0ZQXY5xKMkP1_pY0mb2RxGFGCMeQZbPU0Zu6DVTRc1o';

let supabaseClient = null;
let supabaseEnabled = false;

try {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        supabaseEnabled = true;
        // console.log('✅ Supabase connected');
    }
} catch (error) {
    console.error('❌ Supabase error:', error);
    supabaseEnabled = false;
}

const RAZORPAY_KEY_ID = 'rzp_live_RpP8olgNI2tM7u';
const PRICE_PER_SUBJECT = 15000;

async function createRazorpayOrder(amount, studentData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/create-order`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({ amount, studentData })
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Order creation failed');
        }

        console.log('✅ Order created:', data.order.id);
        return data.order;

    } catch (error) {
        console.error('❌ Order error:', error);
        alert('⚠️ Payment setup failed. Please try again.');
        return null;
    }
}

// Function 2: Verify Razorpay Payment
async function verifyRazorpayPayment(paymentResponse, studentData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/verify-payment`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    razorpay_order_id: paymentResponse.razorpay_order_id,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                    studentData: {
                        ...studentData,
                        email: studentData.email.toLowerCase() // ✅ Email lowercase kar do
                    }
                })
            }
        );

        const data = await response.json();
        if (!data.success) {
            console.error('❌ Verification failed:', data);
            alert(`Payment verification failed!\n\nError: ${data.message}\n\nPayment ID: ${paymentResponse.razorpay_payment_id}\n\nPlease contact support with this Payment ID.`);
            return { success: false, error: data.message };
        }

        console.log('✅ Verification successful:', data);
        return data;

    } catch (error) {
        console.error('❌ Verification error:', error);
        return { success: false, error: error.message };
    }
}

let currentUser = null;
let currentSubject = null;

const boardsByGrade = {
    '10': [
        { value: 'IGCSE', label: 'IGCSE' },
        { value: 'ICSE', label: 'ICSE' }
    ],
    '12': [
        { value: 'ISC', label: 'ISC' },
        { value: 'CBSE', label: 'CBSE' },
        // { value: 'IB', label: 'IB' }
    ]
};
const subjectsByGradeBoardCheckbox = {
    '10-ICSE': ['History', 'English Literature', 'English Language', 'Economics', 'Geography'],
    '10-IGCSE': ['Economics 1', 'Economics 2'],
    '12-ISC': ['English Literature', 'English', 'History', 'Accounts', 'Physics', 'Math', 'Chemistry', 'Commerce', 'Economics', 'Political Science', 'Psychology'],
    '12-CBSE': ['Physics', 'Chemistry', 'Mathematics', 'Accounts', 'Economics', 'Social Science', 'Business Studies Commerce'],
    // '12-IB': ['Biology', 'Business Management']
};

const testDatesByGradeBoard = {
    '10-ICSE': {
        'History': ['29 Dec 2025', '05 Jan 2026', '12 Jan 2026', '19 Jan 2026', '26 Jan 2026'],
        'English Literature': ['13 Jan 2026', '17 Jan 2026', '22 Jan 2026'],
        'English Language': ['15 Jan 2026', '19 Jan 2026', '24 Jan 2026'],
        'Economics': ['31 Dec 2025', '07 Jan 2026', '14 Jan 2026', '21 Jan 2026', '28 Jan 2026'],
        'Geography': ['08 Jan 2026', '15 Jan 2026', '22 Jan 2026', '29 Jan 2026', '05 Feb 2026']
    },
    '10-IGCSE': {
        'Economics 1': ['6 Jan 2026 Timimg 11AM - 2PM', '13 Jan 2026 Timimg 11AM - 2PM', '20 Jan 2026 Timimg 11AM - 2PM', '26 Jan 2026 Timimg 11AM - 2PM'],
        'Economics 2': ['09 Jan 2026 Timimg 11AM - 2PM', '16 Jan 2026 Timimg 11AM - 2PM', '23 Jan 2026 Timimg 11AM - 2PM', '29 Jan 2026 Timimg 11AM - 2PM'],
    },
    '12-ISC': {
        'English Literature': ['13 Jan 2026', '17 Jan 2026', '22 Jan 2026'],
        'English': ['15 Jan 2026', '19 Jan 2026', '24 Jan 2026'],
        'History': ['29 Dec 2025', '05 Jan 2026', '12 Jan 2026', '19 Jan 2026', '26 Jan 2026'],
        'Accounts': ['30 Dec 2025', '06 Jan 2026', '13 Jan 2026', '20 Jan 2026', '27 Jan 2026'],
        'Physics': ['30 Dec 2025', '13 Jan 2026', '27 Jan 2026', '10 Feb 2026', '24 Feb 2026'],
        'Math': ['07 Jan 2026', '21 Jan 2026', '28 Jan 2026', '11 Feb 2026', '18 Feb 2026'],
        'Chemistry': ['08 Jan 2026', '15 Jan 2026', '29 Jan 2026', '05 Feb 2026', '12 Feb 2026'],
        'Commerce': ['08 Jan 2026', '15 Jan 2026', '29 Jan 2026', '05 Feb 2026', '12 Feb 2026'],
        'Economics': ['02 Jan 2026', '16 Jan 2026', '06 Mar 2026', ' 13 Mar 2026', '20 Mar 2026'],
        'Political Science': ['07 Jan 2026', '21 Jan 2026', '28 Jan 2026', ' 11 Feb 2026', '18 Feb 2026'],
        'Psychology': ['29 Dec 2025 Timimg 3PM - 6PM', '05 Jan 2026', '12 Jan 2026', ' 19 Jan 2026', '26 Jan 2026',]
    },
    '12-CBSE': {
        'Physics': ['29 Dec 2025', '12 Jan 2026', '26 Jan 2026', '5 Feb 2026', '9 Feb 2026'],
        'Chemistry': ['30 Dec 2025', '06 Jan 2026', '13 Jan 2026', '20 Jan 2026', '27 Jan 2026'],
        'Mathematics': ['19 Jan 2026', '26 Jan 2026', '10 Feb 2026', '25 Feb 2026', '1 Mar 2026'],
        'Accounts': ['30 Dec 2025', '06 Jan 2026', '13 Jan 2026', '20 Jan 2026', '27 Jan 2026'],
        'Economics': ['29 Jan 2026', '19 Feb 2026', '26 Feb 2026', '04 Mar 2026', '12 Mar 2026'],
        'Social Science': ['30 Dec 2025', '06 Jan 2026', '13 Jan 2026', '20 Jan 2026', '27 Jan 2026'],
        'Business Studies Commerce': ['08 Jan 2026', '15 Jan 2026', '29 Jan 2026', '05 Feb 2026', '12 Feb 2026']
    },
    // '12-IB': {
    //     'Biology': ['22 Jan 2025', '05 Feb 2025', '19 Feb 2025', '05 Mar 2025', '19 Mar 2025'],
    //     'Business Management': ['23 Jan 2025', '06 Feb 2025', '20 Feb 2025', '06 Mar 2025', '20 Mar 2025']
    // }
};


function updateSubjectsCheckboxes() {

    const grade = document.getElementById('studentGrade')?.value || '';
    const board = document.getElementById('studentBoard')?.value || '';
    const container = document.getElementById('subjectsCheckboxContainer');


    // If container doesn't exist, return
    if (!container) {
        console.error('❌ subjectsCheckboxContainer not found');
        return;
    }

    // If grade or board not selected, show message
    if (!grade || !board) {
        container.innerHTML = '<p style="color:#666;font-size:14px;">Please select grade and board first</p>';
        return;
    }

    // Get subjects for this grade-board combination
    const key = `${grade}-${board}`;
    const subjects = subjectsByGradeBoardCheckbox[key] || [];

    // console.log('📚 Key:', key, '| Subjects found:', subjects.length);

    // If no subjects available, show message
    if (subjects.length === 0) {
        container.innerHTML = '<p style="color:#666;font-size:14px;">No subjects available for this combination</p>';
        return;
    }

    // Setup container styling
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "15px";
    container.innerHTML = '';

    const noticeBox = document.createElement('div');
    noticeBox.style.cssText = `
        background: #02B2BC;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        margin-bottom: 10px;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        border-left: 5px solid #ffd700;
    `;
    noticeBox.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <span style="font-size: 24px; flex-shrink: 0;">⚠️</span>
            <div>
                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Important Notice - Test Dates</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; opacity: 0.95;">
                    Please review the subject-wise test dates carefully, as the tests will be scheduled strictly on the specified dates and will remain accessible only until then. Kindly note that these dates are fixed and cannot be changed.
                </p>
            </div>
        </div>
    `;
    container.appendChild(noticeBox);

    // Create checkbox for each subject
    subjects.forEach(subject => {
        const safe = subject.replace(/[^a-zA-Z0-9]/g, '_');

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = "subject-with-dates";

        // Header Row (checkbox + label + expand icon)
        const header = document.createElement('div');
        header.className = "subject-header";

        const checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.id = `subject_${safe}`;
        checkbox.value = subject;
        checkbox.name = 'subjects';

        // Add event listener to recalculate total when checkbox changes
        checkbox.addEventListener('change', function () {
            calculateTotal();
            autoSaveFormData();
        });

        const label = document.createElement('label');
        label.htmlFor = `subject_${safe}`;
        label.textContent = subject;

        const expandIcon = document.createElement('span');
        expandIcon.className = "expand-icon";
        expandIcon.innerHTML = "🔽";
        expandIcon.onclick = () => toggleTestDates(safe);

        header.appendChild(checkbox);
        header.appendChild(label);
        header.appendChild(expandIcon);

        // Dates container (hidden by default)
        const datesContainer = document.createElement('div');
        datesContainer.id = `dates_${safe}`;
        datesContainer.className = "test-dates-container";

        const datesList = document.createElement('div');
        datesList.className = "test-dates-list";

        const subjectDates = testDatesByGradeBoard[key]?.[subject] || [];

        if (subjectDates.length > 0) {
            subjectDates.forEach((date, index) => {
                const item = document.createElement('div');
                item.className = "test-date-item";
                item.innerHTML = `
                    <span class="test-number">${index + 1}</span>
                    <span class="test-date-text">${date}</span>
                    <span class="date-icon">📅</span>
                `;
                datesList.appendChild(item);
            });
        } else {
            datesList.innerHTML = `<p style="color:#888;font-size:13px;">Coming Soon</p>`;
        }

        datesContainer.appendChild(datesList);
        wrapper.appendChild(header);
        wrapper.appendChild(datesContainer);
        container.appendChild(wrapper);
    });

    // console.log('✅ Subjects displayed successfully');
}


function updateBoardDropdown() {
    const gradeSelect = document.getElementById('studentGrade');
    const boardSelect = document.getElementById('studentBoard');

    if (!gradeSelect || !boardSelect) {
        console.error('❌ Grade or Board dropdown not found');
        return;
    }

    const selectedGrade = gradeSelect.value;

    // Reset board dropdown
    boardSelect.value = '';
    boardSelect.innerHTML = '<option value="">Select Board</option>';

    // If no grade selected, disable board dropdown
    if (!selectedGrade) {
        boardSelect.innerHTML = '<option value="">First select a grade</option>';
        boardSelect.disabled = true;
        updateSubjectsCheckboxes(); // Clear subjects
        return;
    }

    // Enable board dropdown and populate options
    boardSelect.disabled = false;
    const availableBoards = boardsByGrade[selectedGrade] || [];

    availableBoards.forEach(board => {
        const option = document.createElement('option');
        option.value = board.value;
        option.textContent = board.label;
        boardSelect.appendChild(option);
    });

    // console.log('✅ Board dropdown updated for grade:', selectedGrade);

    // Clear subjects since board is not selected yet
    updateSubjectsCheckboxes();

    // Recalculate total
    calculateTotal();
}

function toggleTestDates(subject) {
    const safe = subject.replace(/[^a-zA-Z0-9]/g, "_");
    const container = document.getElementById(`dates_${safe}`);

    if (!container) {
        console.error("❌ Dates container not found:", `dates_${safe}`);
        return;
    }

    container.classList.toggle("show");

    // Rotate arrow icon
    const icon = container.parentElement.querySelector(".expand-icon");
    if (icon) {
        icon.classList.toggle("expanded");
    }
}

function calculateTotal() {
    const checkboxes = document.querySelectorAll('#subjectsCheckboxContainer input[type="checkbox"]:checked');
    const count = checkboxes.length;
    const total = count * PRICE_PER_SUBJECT;

    const countElement = document.getElementById('selectedSubjectsCount');
    const totalElement = document.getElementById('totalAmount');
    const summaryContainer = document.getElementById('paymentSummaryContainer');
    const submitBtn = document.getElementById('submitBtn');

    if (countElement) countElement.textContent = count;
    if (totalElement) totalElement.textContent = `₹${total.toLocaleString('en-IN')}`;

    if (submitBtn) {
        if (count > 0) {
            submitBtn.innerHTML = `💳 Pay ₹${total.toLocaleString('en-IN')} & Complete Registration`;
        } else {
            submitBtn.innerHTML = '💳 Pay ₹0 & Complete Registration';
        }
    }

    if (summaryContainer) {
        summaryContainer.style.display = count > 0 ? 'block' : 'none';
    }

    autoSaveFormData();
    return total;
}
let autoSaveTimeout = null; // ✅ Already declared - good!

async function autoSaveFormData() {
    // ✅ STEP 1: Clear previous timeout (debouncing)
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // ✅ STEP 2: Wait 1 second after user stops typing
    autoSaveTimeout = setTimeout(async () => {
        const name = document.getElementById('studentName')?.value?.trim() || '';
        const email = document.getElementById('studentEmail')?.value?.trim().toLowerCase() || ''; // ✅ Added toLowerCase()
        const grade = document.getElementById('studentGrade')?.value || '';
        const board = document.getElementById('studentBoard')?.value || '';
        const address = document.getElementById('studentAddress')?.value?.trim() || '';
        const phone = document.getElementById('studentPhone')?.value?.trim() || '';
        const password = document.getElementById('studentPassword')?.value || '';

        const modeElement = document.querySelector('input[name="registrationMode"]:checked');
        const mode = modeElement ? modeElement.value : 'online';

        const selectedSubjects = [];
        const checkboxes = document.querySelectorAll('#subjectsCheckboxContainer input[type="checkbox"]:checked');
        checkboxes.forEach(cb => selectedSubjects.push(cb.value));

        // ✅ STEP 3: Enhanced validation - only save if email is valid
        if (!email || email.length < 5 || !email.includes('@')) {
            // console.log('⏳ Waiting for valid email...');
            return;
        }

        const formData = {
            email: email, // Now lowercase
            name: name || null,
            grade: grade || null,
            board: board || null,
            address: address || null,
            phone: phone || null,
            interested_subjects: selectedSubjects,
            registration_mode: mode,
            password_hash: password ? btoa(password) : null,
            last_updated: new Date().toISOString()
        };

        if (supabaseEnabled && supabaseClient) {
            try {
                // ✅ STEP 4: Check if record exists first
                const { data: existing, error: checkError } = await supabaseClient
                    .from('incomplete_registrations')
                    .select('email')
                    .eq('email', email)
                    .maybeSingle();

                if (existing) {
                    // ✅ Update existing record
                    const { error: updateError } = await supabaseClient
                        .from('incomplete_registrations')
                        .update(formData)
                        .eq('email', email);

                    if (updateError) {
                        console.error('❌ Update error:', updateError);
                    } else {
                        // console.log('✅ Auto-saved (updated)');
                    }
                } else {
                    // ✅ Insert new record
                    const { error: insertError } = await supabaseClient
                        .from('incomplete_registrations')
                        .insert([formData]);

                    if (insertError) {
                        console.error('❌ Insert error:', insertError);
                    } else {
                        // console.log('✅ Auto-saved (new)');
                    }
                }
            } catch (error) {
                console.error('❌ Auto-save error:', error);
            }
        }
    }, 1000); // ✅ 1 second delay
}
async function checkIfAlreadyRegistered() {
    const email = document.getElementById('studentEmail')?.value?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
        return false; // Invalid email, don't check
    }

    if (supabaseEnabled && supabaseClient) {
        try {
            console.log('🔍 Checking if user exists:', email);

            // Check in students table
            const { data, error } = await supabaseClient
                .from('students')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.error('❌ Check failed:', error);
                return false;
            }

            if (data) {
                console.log('✅ User found in database!');
                currentUser = data;
                localStorage.setItem('peakTestUser', JSON.stringify(data));

                // Show thank you page
                showRegistrationThankYou(data);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Error checking user:', error);
            return false;
        }
    }

    return false;
}

function updateSubmitButton() {
    calculateTotal();
}



document.addEventListener('DOMContentLoaded', async function () {
    // console.log('🚀 Peak Test Series initialized');
    const pdfViewer = document.getElementById('pdfViewer');
    if (pdfViewer) {
        pdfViewer.classList.add('hidden');
        // Also clear any iframe src
        const pdfFrame = document.getElementById('pdfFrame');
        if (pdfFrame) {
            pdfFrame.src = '';
        }
    }
    const emailField = document.getElementById('studentEmail');
    if (emailField && emailField.value) {
        await checkIfAlreadyRegistered();
    }
    const savedUser = localStorage.getItem('peakTestUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (currentUser && currentUser.email) {
                console.log('👤 User found in localStorage:', currentUser.email);
                await checkBackendAccess();
            } else {
                showRegistration();
            }
        } catch (e) {
            showRegistration();
        }
    } else {
        showRegistration();
    }

    const modeOnline = document.getElementById('modeOnline');
    const modeOffline = document.getElementById('modeOffline');

    if (modeOnline) modeOnline.addEventListener('change', updateSubmitButton);
    if (modeOffline) modeOffline.addEventListener('change', updateSubmitButton);

    updateSubmitButton();
});

// ============================================================================
// CHECK BACKEND ACCESS
// ============================================================================
async function checkBackendAccess() {
    console.log('🔍 Checking backend access for:', currentUser.email);

    if (supabaseEnabled && supabaseClient && currentUser && currentUser.email) {
        try {
            const { data, error } = await supabaseClient
                .from('students')
                .select('*')
                .eq('email', currentUser.email)
                .maybeSingle();

            if (error) {
                console.error('❌ Backend check failed:', error);
                showRegistration();
                return;
            }

            if (data) {
                console.log('📊 Backend data:', data);
                currentUser = data;
                localStorage.setItem('peakTestUser', JSON.stringify(data));

                if (data.dashboard_access === true) {
                    console.log('✅ Dashboard access granted - showing dashboard');
                    showDashboard();
                } else {
                    console.log('⚠️ Dashboard access not granted yet');
                    showRegistrationThankYou(data);
                }
            } else {
                showRegistration();
            }
        } catch (error) {
            console.error('❌ Error:', error);
            showRegistration();
        }
    } else {
        if (currentUser.dashboard_access === true) {
            showDashboard();
        } else {
            showRegistrationThankYou(currentUser);
        }
    }
}

// ============================================================================
// AUTO-SAVE
// ============================================================================

// function updateSubjectsCheckboxes() {
//     const grade = document.getElementById('studentGrade')?.value || '';
//     const board = document.getElementById('studentBoard')?.value || '';
//     const container = document.getElementById('subjectsCheckboxContainer');

//     if (!grade || !board || !container) {
//         if (container) {
//             container.innerHTML = '<p style="grid-column: 1/-1; color: #666; font-size: 14px; margin: 0;">Please select grade and board first</p>';
//         }
//         return;
//     }

//     const key = grade + '-' + board;
//     const subjects = subjectsByGradeBoardCheckbox[key] || [];

//     if (subjects.length === 0) {
//         container.innerHTML = '<p style="grid-column: 1/-1; color: #666; font-size: 14px; margin: 0;">No subjects available</p>';
//         return;
//     }

//     container.innerHTML = '';
//     subjects.forEach(subject => {
//         const div = document.createElement('div');
//         div.className = 'subject-checkbox-item';

//         const checkbox = document.createElement('input');
//         checkbox.type = 'checkbox';
//         checkbox.id = `subject_${subject}`;
//         checkbox.name = 'subjects';
//         checkbox.value = subject;
//         checkbox.onchange = function () {
//             calculateTotal();
//             autoSaveFormData();
//         };

//         const label = document.createElement('label');
//         label.htmlFor = `subject_${subject}`;
//         label.textContent = subject;

//         div.appendChild(checkbox);
//         div.appendChild(label);
//         container.appendChild(div);
//     });

//     calculateTotal();
// }

// ============================================================================
// REGISTRATION WITH PAYMENT
// ============================================================================
async function handleRegistrationWithPayment() {
    console.log("🚀 Registration started");
    const email = document.getElementById('studentEmail')?.value?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
        alert('⚠️ Please enter a valid email address!');
        return;
    }

    // ✅ STEP 2: Check if already registered in backend
    if (supabaseEnabled && supabaseClient) {
        try {
            console.log('🔍 Checking if user already registered:', email);

            const { data: existingUser, error: checkError } = await supabaseClient
                .from('students')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (checkError) {
                console.error('❌ Check error:', checkError);
                // Continue with registration if check fails
            }

            if (existingUser) {
                console.log('✅ User already registered! Showing thank you page...');
                currentUser = existingUser;
                localStorage.setItem('peakTestUser', JSON.stringify(existingUser));
                showRegistrationThankYou(existingUser);
                return; // ✅ STOP HERE - Don't proceed with payment
            } else {
                console.log('ℹ️ New user - proceeding with registration');
            }

        } catch (error) {
            console.error('❌ Error checking registration:', error);
            // Continue with registration if check fails
        }
    }



    const name = document.getElementById('studentName')?.value?.trim();

    const grade = document.getElementById('studentGrade')?.value;
    const board = document.getElementById('studentBoard')?.value;
    const address = document.getElementById('studentAddress')?.value?.trim();
    const phone = document.getElementById('studentPhone')?.value?.trim();
    const password = document.getElementById('studentPassword')?.value;
    const modeElement = document.querySelector('input[name="registrationMode"]:checked');
    const mode = modeElement ? modeElement.value : 'online';

    if (!name || !email || !grade || !board || !address || !phone || !password) {
        alert('⚠️ Please fill all required fields!');
        return;
    }

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        alert('⚠️ Please enter a valid 10-digit phone number!');
        return;
    }

    if (password.length < 6) {
        alert('⚠️ Password must be at least 6 characters!');
        return;
    }

    const selectedSubjects = [];
    const checkboxes = document.querySelectorAll('#subjectsCheckboxContainer input[type="checkbox"]:checked');
    checkboxes.forEach(cb => selectedSubjects.push(cb.value));

    if (selectedSubjects.length === 0) {
        alert('⚠️ Please select at least one subject!');
        return;
    }

    const totalAmount = selectedSubjects.length * PRICE_PER_SUBJECT;

    const studentData = {
        name: name,
        email: email.toLowerCase(),
        grade: grade,
        board: board,
        address: address,
        phone: phone,
        interested_subjects: selectedSubjects,
        password: password,
        registered_at: new Date().toISOString(),
        registration_mode: mode,
        payment_status: 'pending',
        payment_amount: totalAmount,
        dashboard_access: false,
        paid_subjects: {},
        test_access: {}
    };

    await processRegistrationPayment(studentData, totalAmount);

    // studentData.payment_id = 'DIRECT_REG_' + Date.now();
    // studentData.payment_date = new Date().toISOString();
    // await saveStudentRegistration(studentData);
}


async function saveStudentRegistration(studentData) {
    try {
        if (supabaseEnabled && supabaseClient) {
            const { data: existingUsers, error: checkError } = await supabaseClient
                .from('students')
                .select('email')
                .eq('email', studentData.email)
                .single();

            if (existingUsers && !checkError) {
                alert('⚠️ Email already registered!');
                return;
            }

            const { data, error } = await supabaseClient
                .from('students')
                .insert([studentData]);

            if (error) {
                console.error('❌ Save failed:', error);
                alert('⚠️ Registration failed!\n\nContact support with payment ID: ' + studentData.payment_id);
                return;
            }

            currentUser = studentData;
            localStorage.setItem('peakTestUser', JSON.stringify(studentData));

            await supabaseClient
                .from('incomplete_registrations')
                .delete()
                .eq('email', studentData.email);

            if (studentData.registration_mode === 'offline') {
                await sendRegistrationEmail(studentData);
            }

            showRegistrationThankYou(studentData);

        } else {
            currentUser = studentData;
            localStorage.setItem('peakTestUser', JSON.stringify(studentData));
            showRegistrationThankYou(studentData);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        alert('⚠️ Registration failed!');
    }
}


async function processRegistrationPayment(studentData, amount) {
    if (typeof Razorpay === 'undefined') {
        alert('⚠️ Payment gateway not loaded. Please refresh.');
        return;
    }
    console.log('🚀 Starting payment process...');
    const order = await createRazorpayOrder(amount, studentData);
    if (!order) {
        console.error('❌ Order creation failed');
        return;
    }

    console.log('✅ Order created successfully:', order.id);

    const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'Peak Test Series',
        description: `Registration - ${studentData.registration_mode} (${studentData.interested_subjects.length} subjects)`,
        prefill: {
            name: studentData.name,
            email: studentData.email,
            contact: studentData.phone
        },
        theme: {
            color: '#667eea'
        },
        handler: async function (response) {
            console.log('✅ Payment completed:', response.razorpay_payment_id);
            console.log('🔍 Verifying payment...');
            const verificationResult = await verifyRazorpayPayment(response, studentData);

            if (verificationResult.success) {
                console.log('✅ Payment verified successfully!');

                studentData.payment_id = response.razorpay_payment_id;
                studentData.order_id = response.razorpay_order_id;
                studentData.payment_status = 'completed';
                studentData.payment_date = new Date().toISOString();

                currentUser = studentData;
                localStorage.setItem('peakTestUser', JSON.stringify(studentData));

                //  await saveStudentRegistration(studentData);
                showRegistrationThankYou(studentData);

            } else {
                console.error('❌ Payment verification failed');
                alert(
                    '⚠️ Payment verification failed!\n\n' +
                    'Payment ID: ' + response.razorpay_payment_id + '\n\n' +
                    'Please contact support:\n' +
                    'Email: peaktest24@gmail.com\n' +
                    'Phone: +91 98181 84460'
                );
            }
        },
        modal: {
            ondismiss: function () {
                alert('Payment cancelled. Registration incomplete.');
            }
        }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
}


async function sendRegistrationEmail(studentData) {
    console.log('📧 Sending email...');
}

function showRegistrationThankYou(studentData) {
    currentUser = studentData;
    localStorage.setItem('peakTestUser', JSON.stringify(studentData));

    const regContainer = document.getElementById('registrationContainer');
    if (regContainer) regContainer.classList.add('hidden');

    const thankYouContainer = document.getElementById('thankYouContainer');
    const thankYouTitle = document.getElementById('thankYouTitle');
    const thankYouMessage = document.getElementById('thankYouMessage');
    const nextStepsText = document.getElementById('nextStepsText');
    const infoBoxText = document.getElementById('infoBoxText');

    if (!thankYouContainer) return;

    if (studentData.registration_mode === 'online') {
        if (thankYouTitle) thankYouTitle.textContent = 'Payment Successful! 🎉';
        if (thankYouMessage) {
            thankYouMessage.innerHTML = `
                Thank you <strong>${studentData.name}</strong> for your payment!<br>
                Registration completed for <strong>${studentData.interested_subjects.length} subject(s)</strong>.
            `;
        }
        // if (nextStepsText) {
        //     nextStepsText.textContent = 'Your dashboard will be activated within 24 hours by admin. For queries:';
        // }
        // if (infoBoxText) {
        //     infoBoxText.innerHTML = `
        //         📚 <strong>Dashboard Access:</strong> Will be enabled by admin within 24 hours<br>
        //         💰 <strong>Amount Paid:</strong> ₹${studentData.payment_amount.toLocaleString('en-IN')}<br>
        //         📝 <strong>Payment ID:</strong> ${studentData.payment_id}<br>
        //         🔄 <strong>Tip:</strong> Refresh this page after 24 hours
        //     `;
        // }
    } else {
        if (thankYouTitle) thankYouTitle.textContent = 'Registration Complete! 📝';
        if (thankYouMessage) {
            thankYouMessage.innerHTML = `
                Thank you <strong>${studentData.name}</strong>!<br>
                Payment received for <strong>${studentData.interested_subjects.length} subject(s)</strong>.
            `;
        }
        if (nextStepsText) {
            nextStepsText.textContent = 'Our team will contact you shortly:';
        }
        // if (infoBoxText) {
        //     infoBoxText.innerHTML = `
        //         📞 <strong>Next Steps:</strong> Team will call within 24 hours<br>
        //         💰 <strong>Amount Paid:</strong> ₹${studentData.payment_amount.toLocaleString('en-IN')}<br>
        //         📝 <strong>Payment ID:</strong> ${studentData.payment_id}
        //     `;
        // }
    }
    displaySelectedSubjectsWithDates(studentData);
    thankYouContainer.classList.remove('hidden');
}

function displaySelectedSubjectsWithDates(studentData) {
    // Find or create container for subjects in thank you page
    let subjectsContainer = document.getElementById('thankYouSubjectsContainer');

    // If container doesn't exist, create it and insert after infoBox
    if (!subjectsContainer) {
        const infoBox = document.querySelector('#thankYouContainer .info-box');
        if (!infoBox) return; // Exit if info box not found

        subjectsContainer = document.createElement('div');
        subjectsContainer.id = 'thankYouSubjectsContainer';
        subjectsContainer.style.cssText = 'margin-top: 30px;';

        // Insert after the info box
        infoBox.parentNode.insertBefore(subjectsContainer, infoBox.nextSibling);
    }

    const key = `${studentData.grade}-${studentData.board}`;
    const selectedSubjects = studentData.interested_subjects || [];

    if (selectedSubjects.length === 0) {
        subjectsContainer.innerHTML = '';
        return;
    }

    // Create title and notice
    let html = `
        <div style="margin-bottom: 25px;">
            <h3 style="color: #f84e9d; font-size: 22px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                📚 Your Selected Subjects & Test Dates
            </h3>
            
            <!-- Important Notice -->
            <div style="background: ; color: #02b2bc; padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); border-left: 5px solid #ffd700;">
                <div style="display: flex; align-items: start; gap: 12px;">
                    <span style="font-size: 24px; flex-shrink: 0;">⚠️</span>
                    <div>
                        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Important Notice - Test Dates</h4>
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; opacity: 0.95;">
                            Please review the subject-wise test dates carefully, as the tests will be scheduled strictly on the specified dates and will remain accessible only until then. Kindly note that these dates are fixed and cannot be changed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add each subject with its dates
    selectedSubjects.forEach((subject, index) => {
        const subjectDates = testDatesByGradeBoard[key]?.[subject] || [];

        html += `
            <div style="background: white; border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <h4 style="color: #333; font-size: 18px; margin: 0; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #02b2bc; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold;">${index + 1}</span>
                        ${subject}
                    </h4>
                    <span style="background: #e8f5e9; color: #2e7d32; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                        ${subjectDates.length} Tests
                    </span>
                </div>
                
                ${subjectDates.length > 0 ? `
                    <div style="display: grid; gap: 10px;">
                        ${subjectDates.map((date, idx) => `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #02b2bc;">
                                <span style="background: #f84e9d; color: white; min-width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;">${idx + 1}</span>
                                <span style="color: #555; font-size: 15px; flex: 1;">${date}</span>
                                <span style="font-size: 20px;">📅</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p style="color: #888; font-size: 14px; margin: 0; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                        Test dates coming soon
                    </p>
                `}
            </div>
        `;
    });

    subjectsContainer.innerHTML = html;
}




async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim().toLowerCase();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
        alert('⚠️ Please enter email and password');
        return;
    }

    try {
        if (supabaseEnabled && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('students')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (error || !data) {
                alert('❌ Invalid email or password');
                return;
            }

            currentUser = data;
            localStorage.setItem('peakTestUser', JSON.stringify(data));

            if (data.dashboard_access === true) {
                showDashboard();
            } else {
                showRegistrationThankYou(data);
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('❌ Login failed');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('peakTestUser');
    showRegistration();
}

function showRegistration() {
    document.getElementById('registrationContainer')?.classList.remove('hidden');
    document.getElementById('loginContainer')?.classList.add('hidden');
    document.getElementById('thankYouContainer')?.classList.add('hidden');
    document.getElementById('dashboardContainer')?.classList.add('hidden');
}

function showLogin() {
    document.getElementById('registrationContainer')?.classList.add('hidden');
    document.getElementById('loginContainer')?.classList.remove('hidden');
    document.getElementById('thankYouContainer')?.classList.add('hidden');
    document.getElementById('dashboardContainer')?.classList.add('hidden');
}

function showDashboard() {
    document.getElementById('registrationContainer')?.classList.add('hidden');
    document.getElementById('loginContainer')?.classList.add('hidden');
    document.getElementById('thankYouContainer')?.classList.add('hidden');
    document.getElementById('dashboardContainer')?.classList.remove('hidden');
    document.getElementById('subjectsPage')?.classList.remove('hidden');
    document.getElementById('testsPage')?.classList.add('hidden');

    const pdfViewer = document.getElementById('pdfViewer');
    if (pdfViewer) {
        pdfViewer.classList.add('hidden');
        // Clear iframe
        const pdfFrame = document.getElementById('pdfFrame');
        if (pdfFrame) {
            pdfFrame.src = '';
        }
    }

    if (currentUser) {
        const userName = document.getElementById('userName');
        const userGradeBoard = document.getElementById('userGradeBoard');

        if (userName) userName.textContent = currentUser.name;
        if (userGradeBoard) userGradeBoard.textContent = `Grade ${currentUser.grade} - ${currentUser.board}`;

        loadSubjects();
    }
}

function loadSubjects() {
    const grid = document.getElementById('subjectsGrid');
    if (!grid || !currentUser) return;

    grid.innerHTML = '';
    const subjects = currentUser.interested_subjects || [];

    subjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `
          
            <h3>${subject}</h3>
            <p onclick="selectSubject('${subject}')">5 Tests Available</p>
            
        `;
        grid.appendChild(card);
    });
}

// ============================================================================
// ✅ SELECT SUBJECT & LOAD TESTS
// ============================================================================
async function selectSubject(subject) {
    currentSubject = subject;
    console.log('📚 Selected subject:', subject);

    const pdfViewer = document.getElementById('pdfViewer');
    if (pdfViewer) {
        pdfViewer.classList.add('hidden');
        const pdfFrame = document.getElementById('pdfFrame');
        if (pdfFrame) {
            pdfFrame.src = '';
        }
    }

    if (supabaseEnabled && supabaseClient && currentUser && currentUser.email) {
        console.log('🔄 Fetching test access data...');
        try {
            const { data, error } = await supabaseClient
                .from('students')
                .select('test_access')
                .eq('email', currentUser.email)
                .single();

            if (!error && data) {
                currentUser.test_access = data.test_access || {};
                localStorage.setItem('peakTestUser', JSON.stringify(currentUser));
                console.log('✅ Test access data loaded');
                console.log('📊 All test statuses:', Object.entries(data.test_access || {}).map(([key, val]) => ({
                    test: key,
                    status: val.status
                })));
            }
        } catch (error) {
            console.error('❌ Error fetching test access:', error);
        }
    }

    document.getElementById('subjectsPage')?.classList.add('hidden');
    document.getElementById('testsPage')?.classList.remove('hidden');
    document.getElementById('subjectTitle').textContent = `${subject} ISC-X`;

    await loadTests();
    await loadSubmittedTests();
}

function backToSubjects() {
    currentSubject = null;
    const pdfViewer = document.getElementById('pdfViewer');
    if (pdfViewer) {
        pdfViewer.classList.add('hidden');
        const pdfFrame = document.getElementById('pdfFrame');
        if (pdfFrame) {
            pdfFrame.src = '';
        }
    }

    document.getElementById('testsPage')?.classList.add('hidden');
    document.getElementById('subjectsPage')?.classList.remove('hidden');
}

// ============================================================================
// ✅ LOAD TESTS - COMPLETE FIX WITH FALLBACK
// ============================================================================
async function loadTests() {
    console.log('🔄 Loading tests for:', currentSubject);
    console.log('📊 Current test_access:', currentUser.test_access);
    const testsGrid = document.getElementById('testsGrid');
    testsGrid.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const testKey = `${currentSubject}-Test${i}`;
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
                console.log(`✅ Test ${i} is COMPLETED - HIDING IT`);
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
                        await supabaseClient
                            .from('test_attempts')
                            .update({ status: 'expired' })
                            .eq('student_email', currentUser.email)
                            .eq('test_key', testKey);

                        // Also update students table
                        await supabaseClient
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

            } else {
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
    const testKey = `${currentSubject}-Test${testNumber}`;

    // If test not started, start it now
    if (!currentUser.test_access[testKey]) {
        const testData = {
            start_time: new Date().toISOString(),
            status: 'active',
            test_number: testNumber,
            subject: currentSubject
        };

        currentUser.test_access[testKey] = testData;
        localStorage.setItem('peakTestUser', JSON.stringify(currentUser));

        try {
            // Save to Supabase if enabled
            if (supabaseEnabled && currentUser.email) {
                // Insert into test_attempts
                const { error } = await supabaseClient
                    .from('test_attempts')
                    .insert([{
                        student_email: currentUser.email,
                        student_name: currentUser.name,
                        subject: currentSubject,
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
                const { error: updateError } = await supabaseClient
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
    document.getElementById('pdfTestTitle').textContent = `${currentSubject} - Test ${testNumber}`;
    document.getElementById('pdfFrame').src = '';
    try {
        if (supabaseEnabled) {
            // Get PDF URL from database
            const { data, error } = await supabaseClient
                .from('test_files')
                .select('file_url')
                .eq('subject', currentSubject)
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
    document.body.classList.add('pdf-open');
    const watermark = document.getElementById('pdfWatermark');
    if (watermark) {
        watermark.setAttribute('data-watermark', `${currentUser.name} - ${currentUser.email}`);
        watermark.textContent = `${currentUser.name} - ${currentUser.email}`;
    }

    // Show screenshot blocker
    const blocker = document.getElementById('screenshotBlocker');
    if (blocker) {
        blocker.style.display = 'block';
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
            if (currentUser.test_access[key].subject === currentSubject &&
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
            // console.log('🔍 Before update - test_access:', JSON.stringify(currentUser.test_access[testKey]));

            try {
                // Update in Supabase if enabled
                if (supabaseEnabled && currentUser.email) {
                    const { error } = await supabaseClient
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
                    console.log('📝 Current test_access before update:', JSON.stringify(currentUser.test_access, null, 2));

                    const { data: updateResult, error: studentError } = await supabaseClient
                        .from('students')
                        .update({
                            test_access: currentUser.test_access
                        })
                        .eq('email', currentUser.email.toLowerCase())
                        .select();

                    if (studentError) {
                        console.error('❌ Failed to update students.test_access:', studentError);
                        console.error('❌ Error code:', studentError.code);
                        console.error('❌ Error message:', studentError.message);
                        console.error('❌ Error details:', JSON.stringify(studentError, null, 2));
                        alert('⚠️ CRITICAL ERROR: Test submitted but NOT saved to database!\n\nError: ' + studentError.message + '\n\nPlease screenshot this and contact support immediately!');
                    } else {
                        console.log('✅✅✅ Students.test_access updated successfully!');
                        console.log('✅ Updated rows:', updateResult ? updateResult.length : 0);
                        console.log('✅ Updated data:', JSON.stringify(updateResult, null, 2));
                        console.log('✅ Test will stay hidden forever!');
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

        // ✅ Force reload test_access from database to ensure UI updates
        if (supabaseEnabled && currentUser.email && supabaseClient) {
            console.log('🔄 Force reloading test_access from database...');
            try {
                const { data: refreshData, error: refreshError } = await supabaseClient
                    .from('students')
                    .select('test_access')
                    .eq('email', currentUser.email)
                    .single();

                if (!refreshError && refreshData) {
                    currentUser.test_access = refreshData.test_access;
                    localStorage.setItem('peakTestUser', JSON.stringify(currentUser));
                    console.log('✅ test_access reloaded from database');
                    console.log('📊 Current statuses:', Object.entries(refreshData.test_access).map(([k, v]) => `${k}: ${v.status}`).join(', '));
                }
            } catch (e) {
                console.error('❌ Failed to reload test_access:', e);
            }
        }

        // ✅ Reload tests to immediately hide the completed one
        await loadTests();

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
                        const { error } = await supabaseClient
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
    document.body.classList.remove('pdf-open');

    const blocker = document.getElementById('screenshotBlocker');
    if (blocker) {
        blocker.style.display = 'none';
    }

    document.getElementById('pdfViewer').classList.add('hidden');
    document.getElementById('pdfFrame').src = '';
    loadTests(); // Refresh test list
}
async function loadSubmittedTests() {
    if (!supabaseEnabled || !currentUser || !currentSubject) {
        return;
    }

    const container = document.getElementById('submittedTestsContainer');
    if (!container) return;

    try {
        console.log('📊 Loading submitted tests and results...');

        // Fetch submissions for current subject

        const { data, error } = await supabaseClient
            .from('answer_submissions')
            .select('*')
            .eq('student_email', currentUser.email)
            .eq('subject', currentSubject)
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
                         ${submission.checked_file_url ? `
                            <div class="checked-file-section">
                                <div class="checked-file-header">
                                    <span style="font-size: 18px;">📋</span>
                                    <strong>Checked Answer Sheet</strong>
                                </div>
                                <div class="checked-file-actions">
                                    <button class="view-checked-btn" onclick="viewCheckedFile('${submission.checked_file_url}', '${submission.test_number}')">
                                        👁️ View Checked Copy
                                    </button>
                                    <button class="download-checked-btn" onclick="downloadCheckedFile('${submission.checked_file_url}', 'Test_${submission.test_number}_Checked_${currentUser.name}')">
                                        📥 Download
                                    </button>
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

// ============================================================================
// ✅ VIEW CHECKED FILE - Opens in modal viewer
// ============================================================================
function viewCheckedFile(fileUrl, testNumber) {
    console.log('👁️ Opening checked file:', fileUrl);

    // Create modal viewer
    const modal = document.createElement('div');
    modal.id = 'checkedFileModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        display: flex;
        flex-direction: column;
    `;

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">📋 Checked Answer Sheet - Test ${testNumber}</h3>
            <button onclick="closeCheckedFileModal()" style="background: #f44336; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
                ✕ Close
            </button>
        </div>
        <div style="flex: 1; background: #2d2d2d; display: flex; justify-content: center; align-items: center;">
            <iframe src="${fileUrl}" style="width: 100%; height: 100%; border: none; background: white;"></iframe>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('pdf-open');
}

// ============================================================================
// ✅ CLOSE CHECKED FILE MODAL
// ============================================================================
function closeCheckedFileModal() {
    const modal = document.getElementById('checkedFileModal');
    if (modal) {
        modal.remove();
    }
    document.body.classList.remove('pdf-open');
}

// ============================================================================
// ✅ DOWNLOAD CHECKED FILE
// ============================================================================
function downloadCheckedFile(fileUrl, fileName) {
    console.log('📥 Downloading checked file:', fileUrl);

    // Create invisible download link
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'Checked_Answer_Sheet';
    link.target = '_blank';

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    showToast('✅ Download started! Check your downloads folder.', 'success');
}

// ============================================================================
// ✅ TOAST NOTIFICATION
// ============================================================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        font-size: 16px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 300);
    }, 3000);
}



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

        if (!supabaseEnabled || !supabaseClient) {
            throw new Error('Supabase not configured. Cannot upload file.');
        }

        // Generate unique file name
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${currentUser.email}/${currentSubject}/Test${getCurrentTestNumber()}/${timestamp}_${sanitizedFileName}`;

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
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
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
        const { data: urlData } = supabaseClient.storage
            .from('answer-submissions')
            .getPublicUrl(storagePath);

        const fileUrl = urlData.publicUrl;
        console.log('📎 File URL:', fileUrl);

        // Save submission record to database
        const submissionData = {
            student_email: currentUser.email,
            student_name: currentUser.name,
            subject: currentSubject,
            test_number: getCurrentTestNumber(),
            file_name: file.name,
            file_url: fileUrl,
            file_type: file.type,
            file_size: file.size,
            submitted_at: new Date().toISOString(),
            status: 'submitted'
        };

        const { data: dbData, error: dbError } = await supabaseClient
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
        const testKey = `${currentSubject}-Test${getCurrentTestNumber()}`;
        if (currentUser.test_access[testKey]) {
            currentUser.test_access[testKey].status = 'submitted';
            currentUser.test_access[testKey].submitted_at = new Date().toISOString();
            currentUser.test_access[testKey].time_remaining = timeRemaining;
            currentUser.test_access[testKey].answer_file_url = fileUrl;
            localStorage.setItem('peakTestUser', JSON.stringify(currentUser));
        }

        // Update test attempt in database
        try {
            await supabaseClient
                .from('test_attempts')
                .update({
                    status: 'submitted',
                    submit_time: new Date().toISOString(),
                    time_remaining: timeRemaining
                })
                .eq('student_email', currentUser.email)
                .eq('subject', currentSubject
                )
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

