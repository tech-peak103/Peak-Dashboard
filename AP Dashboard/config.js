// Configuration file for Supabase and Razorpay
// Replace these with your actual credentials

const CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'https://vylccnobazhagfbsgxii.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bGNjbm9iYXpoYWdmYnNneGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzA0MDcsImV4cCI6MjA4NjQ0NjQwN30.IoW2d5-lfY0Mv7cIoapiC91ZXepnZjwxk98LxSf8dXE'
    },

    // Razorpay Configuration
    razorpay: {
        keyId: 'rzp_test_Rrpy0LeOVSebfA',
        keySecret: 'mG04KXM0xaWCw0RodwmcwWxQ' // Keep this secret on server side only
    },

    // Payment Configuration
    payment: {
        subjectPrice: 80000, // Price per subject in paise (800 INR)
        gstRate: 0.18, // 18% GST
        currency: 'INR'
    },

    // Admin Credentials (Change these!)
    admin: {
        username: 'admin',
        password: 'admin123' // Change this immediately!
    }
};

// Global Supabase client variable - MUST be declared globally
let supabaseClient = null;

// Initialize Supabase when library is loaded
function initSupabase() {
    // Check if supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Make sure to include the Supabase CDN script.');
        return false;
    }
    
    // Check if already initialized
    if (supabaseClient) {
        console.log('Supabase client already initialized');
        return true;
    }
    
    try {
        supabaseClient = supabase.createClient(
            CONFIG.supabase.url,
            CONFIG.supabase.anonKey
        );
        console.log('Supabase initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Helper function to check if Supabase is ready
function isSupabaseReady() {
    return supabaseClient !== null;
}
