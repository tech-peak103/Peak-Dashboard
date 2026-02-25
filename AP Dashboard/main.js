// Global variables
let currentUser = null;
let selectedSubjects = [];
let registrationData = {};

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    // Initialize Supabase
    initSupabase();

    // Check if user is logged in
    checkAuthStatus();

    // Modal controls
    const signInBtn = document.getElementById('signInBtn');
    const registrationModal = document.getElementById('registrationModal');
    const loginModal = document.getElementById('loginModal');
    const closeBtns = document.querySelectorAll('.close');
    const switchToRegister = document.getElementById('switchToRegister');

    // Open registration modal
    if (signInBtn) {
        signInBtn.addEventListener('click', function () {
            loginModal.style.display = 'block';
        });
    }

    // Close modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            registrationModal.style.display = 'none';
            loginModal.style.display = 'none';
        });
    });

    // Switch to registration
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function (e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            registrationModal.style.display = 'block';
        });
    }

    // Close modal on outside click
    window.addEventListener('click', function (event) {
        if (event.target === registrationModal) {
            registrationModal.style.display = 'none';
        }
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    // Subject checkboxes
    const subjectCheckboxes = document.querySelectorAll('input[name="subject"]');
    subjectCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotal);
    });

    // Registration form
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
})

// Calculate total amount
function calculateTotal() {
    const checkboxes = document.querySelectorAll('input[name="subject"]:checked');
    const count = checkboxes.length;

    if (count === 0) {
        document.getElementById('paymentSummary').style.display = 'none';
        return;
    }

    // Get selected subjects
    selectedSubjects = Array.from(checkboxes).map(cb => cb.value);

    // Calculate amounts
    const subtotal = count * CONFIG.payment.subjectPrice;
    const gst = subtotal * CONFIG.payment.gstRate;
    const total = subtotal + gst;

    // Update UI
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('gstAmount').textContent = `₹${gst.toLocaleString('en-IN')}`;
    document.getElementById('totalAmount').textContent = `₹${total.toLocaleString('en-IN')}`;

    // Update selected subjects list
    const subjectsList = document.getElementById('selectedSubjectsList');
    subjectsList.innerHTML = selectedSubjects.map(subject =>
        `<li>${subject}</li>`
    ).join('');

    document.getElementById('paymentSummary').style.display = 'block';
}

// Handle registration
async function handleRegistration(e) {
    e.preventDefault();

    // Validate subjects
    const checkboxes = document.querySelectorAll('input[name="subject"]:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one AP subject');
        return;
    }

    // Get form data
    const formData = {
        fullName: document.getElementById('fullName').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        subjects: selectedSubjects
    };

    // Store for later use
    registrationData = formData;

    // Calculate payment amount
    const subtotal = selectedSubjects.length * CONFIG.payment.subjectPrice;
    const gst = subtotal * CONFIG.payment.gstRate;
    const total = subtotal + gst;

    // Open Razorpay
    openRazorpay(total, formData);
}

// Razorpay payment integration
function openRazorpay(amount, userData) {
    const options = {
        key: CONFIG.razorpay.keyId,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: CONFIG.payment.currency,
        name: 'Peak AP Dashboard',
        description: `Registration for ${selectedSubjects.length} AP Subject(s)`,
        image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">⚡</text></svg>',
        handler: function (response) {
            // Payment successful
            handlePaymentSuccess(response, userData, amount);
        },
        prefill: {
            name: userData.fullName,
            email: userData.email,
            contact: userData.phone
        },
        notes: {
            subjects: selectedSubjects.join(', ')
        },
        theme: {
            color: '#667eea'
        },
        modal: {
            ondismiss: function () {
                alert('Payment cancelled. Please try again.');
            }
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

// Handle successful payment
async function handlePaymentSuccess(paymentResponse, userData, amount) {
    try {
        // Generate unique user ID
        const userId = 'STU' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

        // Prepare student data
        const studentData = {
            user_id: userId,
            full_name: userData.fullName,
            username: userData.username,
            password: userData.password, // Note: In production, hash this!
            email: userData.email,
            phone: userData.phone,
            subjects: userData.subjects,
            payment_id: paymentResponse.razorpay_payment_id,
            payment_amount: amount,
            registration_date: new Date().toISOString(),
            status: 'active'
        };

        // Save to Supabase
        const { data, error } = await supabaseClient
            .from('students')
            .insert([studentData]);

        if (error) {
            console.error('Error saving to database:', error);

            // For demo purposes - save to localStorage
            saveToLocalStorage(studentData);

            showSuccessMessage('Registration successful! You can now login with your credentials.');
        } else {
            showSuccessMessage('Registration successful! You can now login with your credentials.');
        }

        // Close registration modal and open login modal
        setTimeout(() => {
            document.getElementById('registrationModal').style.display = 'none';
            document.getElementById('loginModal').style.display = 'block';
            document.getElementById('registrationForm').reset();
            document.getElementById('paymentSummary').style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('Error:', error);
        alert('There was an error processing your registration. Please contact support.');
    }
}

// Save to localStorage (fallback)
function saveToLocalStorage(studentData) {
    let students = JSON.parse(localStorage.getItem('students') || '[]');
    students.push(studentData);
    localStorage.setItem('students', JSON.stringify(students));
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    // Check for admin login
    if (username === CONFIG.admin.username && password === CONFIG.admin.password) {
        // Admin login
        currentUser = { role: 'admin', username: username };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        window.location.href = 'admin.html';
        return;
    }

    // Try Supabase first
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (data) {
            currentUser = { ...data, role: 'student' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'dashboard.html';
            return;
        }
    } catch (error) {
        console.log('Supabase not configured, checking localStorage');
    }

    // Fallback to localStorage
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const student = students.find(s => s.username === username && s.password === password);

    if (student) {
        currentUser = { ...student, role: 'student' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        window.location.href = 'dashboard.html';
    } else {
        showErrorMessage('Invalid username or password');
    }
}

// Check auth status
function checkAuthStatus() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
    }
}

// Logout
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = 'index.html';
}

// Show success message
function showSuccessMessage(message) {
    const formContainer = document.querySelector('#registrationForm') || document.querySelector('#loginForm');
    if (!formContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    formContainer.parentElement.insertBefore(messageDiv, formContainer);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Show error message
function showErrorMessage(message) {
    const formContainer = document.querySelector('#registrationForm') || document.querySelector('#loginForm');
    if (!formContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.textContent = message;
    formContainer.parentElement.insertBefore(messageDiv, formContainer);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Export functions for use in other pages
window.logout = logout;
window.currentUser = currentUser;