// Admin Worksheet Management JavaScript

let currentUser = null;
let selectedFile = null;
let worksheets = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Check if admin
    if (currentUser.role !== 'admin') {
        window.location.href = 'admin-worksheets.html';
        return;
    }
    
    // Initialize Supabase
    if (typeof initSupabase === 'function') {
        initSupabase();
    }
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Setup file input
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // Load existing worksheets
    loadExistingWorksheets();
});

// Setup drag and drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file
function handleFile(file) {
    // Validate file type
    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file only.');
        return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        return;
    }
    
    // Store file
    selectedFile = file;
    
    // Show selected file
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('selectedFile').style.display = 'block';
}

// Upload file
async function uploadFile() {
    if (!selectedFile) {
        alert('Please select a file first.');
        return;
    }
    
    const subject = document.getElementById('subjectSelect').value;
    const worksheetNum = document.getElementById('worksheetSelect').value;
    
    if (!subject || !worksheetNum) {
        alert('Please select both subject and worksheet number.');
        return;
    }
    
    // Show progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadStatus').textContent = 'Uploading...';
    document.getElementById('progressFill').style.width = '30%';
    
    try {
        let worksheetUrl = null;
        let filePath = null;
        
        // Try uploading to Supabase Storage
        if (supabaseClient) {
            try {
                // Use separate admin-worksheets bucket
                filePath = `${subject}/worksheet-${worksheetNum}.pdf`;
                
                const { data, error } = await supabaseClient
                    .storage
                    .from('admin-worksheets')  // Changed from 'worksheets' to 'admin-worksheets'
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: true // Overwrite if exists
                    });
                
                if (error) {
                    console.error('Supabase upload error:', error);
                    throw error;
                }
                
                // Get public URL from admin-worksheets bucket
                const { data: urlData } = supabaseClient
                    .storage
                    .from('admin-worksheets')  // Changed bucket name
                    .getPublicUrl(filePath);
                
                worksheetUrl = urlData.publicUrl;
                
                document.getElementById('progressFill').style.width = '60%';
                
            } catch (error) {
                console.error('Failed to upload to Supabase:', error);
                alert('Supabase storage not configured. Saving metadata locally.');
            }
        }
        
        // Save worksheet metadata
        const worksheetData = {
            id: Date.now(),
            subject: subject,
            worksheet_number: parseInt(worksheetNum),
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            file_path: filePath,
            file_url: worksheetUrl,
            uploaded_by: 'admin',
            upload_date: new Date().toISOString()
        };
        
        // Save to database or localStorage
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('admin_worksheets')
                    .insert([worksheetData])
                    .select();
                
                if (error) throw error;
                
                console.log('Worksheet saved to Supabase');
            } catch (error) {
                console.error('Database error:', error);
                saveToLocalStorage(worksheetData);
            }
        } else {
            saveToLocalStorage(worksheetData);
        }
        
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('uploadStatus').textContent = 'Upload Complete!';
        
        // Success
        alert(`Worksheet ${worksheetNum} uploaded successfully for ${subject}!`);
        
        // Reset
        setTimeout(() => {
            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('selectedFile').style.display = 'none';
            document.getElementById('fileInput').value = '';
            document.getElementById('progressFill').style.width = '0%';
            selectedFile = null;
            
            // Reload worksheets
            loadExistingWorksheets();
        }, 2000);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file. Please try again.');
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

// Save to localStorage
function saveToLocalStorage(worksheetData) {
    let worksheets = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
    
    // Remove existing entry for same subject and worksheet number
    worksheets = worksheets.filter(w => 
        !(w.subject === worksheetData.subject && w.worksheet_number === worksheetData.worksheet_number)
    );
    
    worksheets.push(worksheetData);
    localStorage.setItem('admin_worksheets', JSON.stringify(worksheets));
    console.log('Worksheet saved to localStorage');
}

// Load existing worksheets
async function loadExistingWorksheets() {
    const selectedSubject = document.getElementById('viewSubjectSelect').value;
    
    // Load from database or localStorage
    let allWorksheets = [];
    
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('admin_worksheets')
                .select('*')
                .order('subject', { ascending: true })
                .order('worksheet_number', { ascending: true });
            
            if (data) {
                allWorksheets = data;
            }
        } catch (error) {
            console.log('Loading from localStorage');
        }
    }
    
    // Fallback to localStorage
    if (allWorksheets.length === 0) {
        allWorksheets = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
    }
    
    // Filter by subject if selected
    if (selectedSubject) {
        allWorksheets = allWorksheets.filter(w => w.subject === selectedSubject);
    }
    
    displayWorksheets(allWorksheets);
}

// Display worksheets
function displayWorksheets(worksheetsList) {
    const grid = document.getElementById('worksheetGrid');
    
    if (worksheetsList.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No worksheets uploaded yet.</p>';
        return;
    }
    
    grid.innerHTML = worksheetsList.map(worksheet => {
        const uploadDate = new Date(worksheet.upload_date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <div class="worksheet-item">
                <div class="worksheet-number">W${worksheet.worksheet_number}</div>
                <div style="font-weight: 600; margin-bottom: 0.5rem;">${worksheet.subject}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    ${worksheet.file_name}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    Uploaded: ${uploadDate}
                </div>
                <div class="file-actions" style="justify-content: center;">
                    ${worksheet.file_url ? `
                        <button class="btn-small btn-view" onclick="viewWorksheet('${worksheet.file_url}')">
                            View
                        </button>
                    ` : ''}
                    <button class="btn-small btn-delete" onclick="deleteWorksheet(${worksheet.id}, '${worksheet.subject}', ${worksheet.worksheet_number})">
                        Delete
                    </button>
                </div>
                <div class="upload-status status-uploaded">
                    ✓ Available for students
                </div>
            </div>
        `;
    }).join('');
}

// View worksheet
function viewWorksheet(url) {
    if (url) {
        window.open(url, '_blank');
    } else {
        alert('File URL not available. The file may be stored locally.');
    }
}

// Delete worksheet
async function deleteWorksheet(id, subject, worksheetNum) {
    if (!confirm(`Are you sure you want to delete Worksheet ${worksheetNum} for ${subject}?`)) {
        return;
    }
    
    try {
        // Delete from Supabase
        if (supabaseClient) {
            try {
                // Delete from admin-worksheets bucket (not worksheets bucket)
                const filePath = `${subject}/worksheet-${worksheetNum}.pdf`;
                await supabaseClient
                    .storage
                    .from('admin-worksheets')  // Changed bucket name
                    .remove([filePath]);
                
                // Delete from database
                const { error } = await supabaseClient
                    .from('admin_worksheets')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
            } catch (error) {
                console.error('Supabase delete error:', error);
            }
        }
        
        // Delete from localStorage
        let worksheets = JSON.parse(localStorage.getItem('admin_worksheets') || '[]');
        worksheets = worksheets.filter(w => w.id !== id);
        localStorage.setItem('admin_worksheets', JSON.stringify(worksheets));
        
        alert('Worksheet deleted successfully!');
        loadExistingWorksheets();
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting worksheet. Please try again.');
    }
}

// Logout
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
