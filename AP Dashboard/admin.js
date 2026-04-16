// Admin Dashboard JavaScript

let currentUser = null
let students = []
let submissions = []
let currentUploadSubmissionId = null // Modal ke liye — konsi submission ka paper upload ho raha hai
let grades = [];
let currentGradeSubmission = null;
// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== ADMIN PAGE LOADING ===')

    const userStr = localStorage.getItem('currentUser')
    if (!userStr) {
        window.location.href = 'index.html'
        return
    }

    currentUser = JSON.parse(userStr)

    if (currentUser.role !== 'admin') {
        window.location.href = 'admin.html'
        return
    }

    console.log('✓ Admin authenticated')

    if (typeof initSupabase === 'function' && !supabaseClient) {
        initSupabase()
    }

    loadAdminData()
})

async function loadAdminData() {
    console.log('Loading admin data...')
    students = []
    submissions = []

    try {
        if (supabaseClient) {
            // Students fetch
            const {
                data: studentsData,
                error: studentsError
            } = await supabaseClient
                .from('students')
                .select('*')
                .order('registration_date', {
                    ascending: false
                })

            if (studentsError) console.error('Students error:', studentsError)
            if (studentsData) {
                students = studentsData
                console.log('✓ Students:', students.length)
            }

            // Submissions fetch — checked_paper_url bhi lao
            const {
                data: submissionsData,
                error: submissionsError
            } =
            await supabaseClient
                .from('submissions')
                .select('*')
                .order('submission_date', {
                    ascending: false
                })

            if (submissionsError)
                console.error('Submissions error:', submissionsError)
            if (submissionsData) {
                submissions = submissionsData
                localStorage.setItem('submissions', JSON.stringify(submissions))
                console.log('✓ Submissions:', submissions.length)
            }
            const { data: gd} = await supabaseClient
                .from('admin_worksheets') .select('subject, worksheet_number, grade, graded_by, graded_at')
            if (gd) grades = gd
        }
    } catch (error) {
        console.error('Supabase error:', error)
    }

    // Fallback
    if (students.length === 0)
        students = JSON.parse(localStorage.getItem('students') || '[]')
    if (submissions.length === 0)
        submissions = JSON.parse(localStorage.getItem('submissions') || '[]')

    updateStats()
    loadStudentsTable()
    loadSubmissionsTable()
    loadSubjectAnalytics()
}

function updateStats() {
    document.getElementById('totalStudents').textContent = students.length

    const allSubjects = students.flatMap(s => s.subjects || [])
    document.getElementById('activeSubjects').textContent = [
        ...new Set(allSubjects)
    ].length
    document.getElementById('totalSubmissions').textContent = submissions.length

    const totalRevenue = students.reduce(
        (sum, s) => sum + (s.payment_amount || 0),
        0
    )
    document.getElementById(
        'totalRevenue'
    ).textContent = `₹${totalRevenue.toLocaleString('en-IN')}`
}

function loadStudentsTable() {
    const tbody = document.getElementById('studentsTableBody')

    if (students.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="8" style="text-align:center;padding:2rem;">No students registered yet</td></tr>'
        return
    }

    tbody.innerHTML = students
        .map(student => {
            const studentSubmissions = submissions.filter(
                s => s.user_id === student.user_id
            )
            const regDate = new Date(student.registration_date).toLocaleDateString(
                'en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }
            )

            return `
            <tr>
                <td><strong>${student.user_id}</strong></td>
                <td>${student.full_name}</td>
                <td>${student.email}</td>
                <td>${student.phone}</td>
                <td>${student.subjects ? student.subjects.length : 0}</td>
                <td><strong style="color:var(--primary-color);">${
                  studentSubmissions.length
                }</strong></td>
                <td>${regDate}</td>
                <td><strong>₹${(student.payment_amount || 0).toLocaleString(
                  'en-IN'
                )}</strong></td>
            </tr>
        `
        })
        .join('')
}

function loadSubmissionsTable() {
    const tbody = document.getElementById('submissionsTableBody');

    if (submissions.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="8" style="text-align:center;padding:2rem;">No submissions yet</td></tr>';
        return;
    }

    const recentSubmissions = submissions.slice(0, 50);

    tbody.innerHTML = recentSubmissions
        .map((submission) => {
            const submissionDate = new Date(
                submission.submission_date
            ).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const fileSize = formatFileSize(submission.file_size);

            let studentName = submission.student_name;
            if (!studentName || studentName === 'undefined') {
                const student = students.find(
                    (s) => s.user_id === submission.user_id
                );
                studentName = student
                    ? student.full_name
                    : submission.user_id || 'Unknown';
            }

            // ✅ Checked paper column
            const hasChecked = !!submission.checked_paper_url;

            const checkedColumn = hasChecked
                ? `
                <div style="display:flex; flex-direction:column; gap:0.4rem;">
                    <span style="color:#06d6a0; font-weight:600; font-size:0.8rem;">
                        ✅ Uploaded
                    </span>
                    <div style="display:flex; gap:0.4rem;">
                        <a href="${submission.checked_paper_url}" target="_blank"
                            style="font-size:0.75rem; color:#6c63ff; text-decoration:none;">
                            👁️ View
                        </a>
                        <button class="checked-upload-btn uploaded"
                            onclick="openUploadModal('${submission.id}', '${studentName}', '${submission.worksheet_title}')">
                            🔄 Replace
                        </button>
                    </div>
                </div>
            `
                : `
                <button class="checked-upload-btn"
                    onclick="openUploadModal('${submission.id}', '${studentName}', '${submission.worksheet_title}')">
                    📤 Upload Checked
                </button>
            `;

            // ✅ Grade column
            const existingGrade = grades.find(
                (g) =>
                     g.subject === submission.subject &&
                    Number(g.worksheet_id) === Number(submission.worksheet_id)&&  g.grade !== null
            );

            const gradeCol = existingGrade
                ? `
                <div style="display:flex;flex-direction:column;gap:0.3rem;align-items:center;">
                    <span style="font-size:1.3rem;font-weight:700;color:#6c63ff;">
                        ${existingGrade.grade}
                    </span>
                    <button class="grade-btn graded"
                        onclick="openGradeModal('${submission.user_id}','${studentName}',
                        '${submission.subject}','${submission.worksheet_id}',
                        '${submission.worksheet_title}')">
                        ✏️ Edit
                    </button>
                </div>`
                : `
                <button class="grade-btn"
                    onclick="openGradeModal('${submission.user_id}','${studentName}',
                    '${submission.subject}','${submission.worksheet_id}',
                    '${submission.worksheet_title}')">
                    📊 Add Grade
                </button>`;

            return `
            <tr>
                <td><strong>${studentName}</strong></td>
                <td>${submission.subject}</td>
                <td>${submission.worksheet_title}</td>
                <td>
                    ${submission.file_name}
                    <a href="${submission.file_url}" download="${submission.file_name}"
                        target="_blank" title="Download">⬇️</a>
                </td>
                <td>${submissionDate}</td>
                <td>${fileSize}</td>
                <td>${checkedColumn}</td>
                <td>${gradeCol}</td>
            </tr>
            `;
        })
        .join('');
}

function openGradeModal(studentName, subject, worksheetId, worksheetTitle) {
    currentGradeSubmission = { studentName, subject, worksheetId, worksheetTitle };
    document.getElementById('gradeModalSubtitle').textContent =
        `${studentName} — ${worksheetTitle} (${subject})`;

    // Existing grade pre-fill karo
    const existing = grades.find(g =>
        // g.user_id === userId &&
        g.subject === subject &&
        Number(g.worksheet_id) === Number(worksheetId)
    );
    document.getElementById('gradeInput').value = existing ? existing.grade : '';
    document.getElementById('confirmGradeBtn').disabled = false;
    document.getElementById('confirmGradeBtn').textContent = '💾 Save Grade';
    document.getElementById('gradeModal').classList.add('active');
}

function closeGradeModal() {
    document.getElementById('gradeModal').classList.remove('active');
    currentGradeSubmission = null;
}

async function saveGrade() {
    const grade = document.getElementById('gradeInput').value.trim();
    if (!grade) { alert('Grade likho!'); return; }

    const btn = document.getElementById('confirmGradeBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
       const { error } = await supabaseClient
            .from('admin_worksheets')
            .update({
                grade: grade,
                graded_by: currentUser.full_name || 'Admin',
                graded_at: new Date().toISOString()
            })
            
            .eq('subject', currentGradeSubmission.subject)
            .eq('worksheet_id', Number(currentGradeSubmission.worksheetId));


        if (error) throw error;

        btn.textContent = '✅ Saved!';
        setTimeout(() => { closeGradeModal(); loadAdminData(); }, 700);
        alert(`✅ Grade save ho gaya!\n${currentGradeSubmission.studentName}: ${grade}`);

    } catch (err) {
        alert('Error: ' + err.message);
        btn.disabled = false;
        btn.textContent = '💾 Save Grade';
    }
}


// ══════════════════════════════════════════
//  CHECKED PAPER UPLOAD
// ══════════════════════════════════════════

function openUploadModal(submissionId, studentName, worksheetTitle) {
    currentUploadSubmissionId = submissionId
    document.getElementById(
        'modalSubtitle'
    ).textContent = `${studentName} — ${worksheetTitle}`
    document.getElementById('checkedPaperFile').value = ''
    document.getElementById('uploadProgress').style.display = 'none'
    document.getElementById('confirmUploadBtn').disabled = false
    document.getElementById('confirmUploadBtn').textContent = '⬆️ Upload'
    document.getElementById('uploadModal').classList.add('active')
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active')
    currentUploadSubmissionId = null
}

async function confirmCheckedUpload() {
    const file = document.getElementById('checkedPaperFile').files[0]
    if (!file) {
        alert('Pehle file select karo!')
        return
    }

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (!allowedTypes.includes(file.type)) {
        alert('Sirf PDF ya Word file upload karo.')
        return
    }

    const confirmBtn = document.getElementById('confirmUploadBtn')
    const progress = document.getElementById('uploadProgress')
    confirmBtn.disabled = true
    confirmBtn.textContent = 'Uploading...'
    progress.style.display = 'block'

    try {
        // 1. File upload karo Supabase Storage mein
        const filePath = `checked-papers/${currentUploadSubmissionId}/${file.name}`
        let fileUrl = null

        if (supabaseClient) {
            const {
                data: uploadData,
                error: uploadError
            } =
            await supabaseClient.storage
                .from('admin-worksheets') // apna bucket naam yahan
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) throw uploadError

            const {
                data: urlData
            } = supabaseClient.storage
                .from('admin-worksheets')
                .getPublicUrl(filePath)

            fileUrl = urlData.publicUrl
            console.log('✓ Checked paper uploaded:', fileUrl)

            // 2. Submission row update karo
            const {
                error: updateError
            } = await supabaseClient
                .from('submissions')
                .update({
                    checked_paper_url: fileUrl,
                    checked_paper_name: file.name,
                    checked_at: new Date().toISOString(),
                    checked_by: currentUser.full_name || currentUser.username || 'Admin'
                })
                .eq('id', currentUploadSubmissionId)

            if (updateError) throw updateError
            console.log('✓ Submission updated with checked paper')
        }

        confirmBtn.textContent = '✅ Done!'
        progress.style.display = 'none'

        setTimeout(() => {
            closeUploadModal()
            loadAdminData() // Table refresh karo
        }, 800)

        alert(`✅ Checked paper upload ho gaya!\nStudent ko ab dikhega.`)
    } catch (error) {
        console.error('Upload error:', error)
        alert('Error: ' + error.message)
        confirmBtn.disabled = false
        confirmBtn.textContent = '⬆️ Upload'
        progress.style.display = 'none'
    }
}

// ══════════════════════════════════════════
//  SUBJECT ANALYTICS
// ══════════════════════════════════════════

function loadSubjectAnalytics() {
    const tbody = document.getElementById('subjectsTableBody')

    const allSubjects = students.flatMap(s => s.subjects || [])
    const uniqueSubjects = [...new Set(allSubjects)]

    if (uniqueSubjects.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" style="text-align:center;padding:2rem;">No subject data available</td></tr>'
        return
    }

    const subjectStats = uniqueSubjects.map(subject => {
        const enrolledStudents = students.filter(
            s => s.subjects && s.subjects.includes(subject)
        ).length

        const subjectSubmissions = submissions.filter(
            s => s.subject === subject
        ).length
        const totalPossible = enrolledStudents * 10
        const completionRate =
            totalPossible > 0 ?
            Math.round((subjectSubmissions / totalPossible) * 100) :
            0

        return {
            subject,
            enrolledStudents,
            subjectSubmissions,
            completionRate
        }
    })

    subjectStats.sort((a, b) => b.enrolledStudents - a.enrolledStudents)

    tbody.innerHTML = subjectStats
        .map(
            stat => `
        <tr>
            <td><strong>${stat.subject}</strong></td>
            <td>${stat.enrolledStudents}</td>
            <td>${stat.subjectSubmissions}</td>
            <td>
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="flex:1; height:8px; background:var(--bg-tertiary);
                                border-radius:4px; overflow:hidden;">
                        <div style="width:${stat.completionRate}%; height:100%;
                                    background:var(--gradient-primary); border-radius:4px;">
                        </div>
                    </div>
                    <span style="font-weight:600; color:var(--primary-color);">
                        ${stat.completionRate}%
                    </span>
                </div>
            </td>
        </tr>
    `
        )
        .join('')
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function logout() {
    localStorage.removeItem('currentUser')
    window.location.href = 'index.html'
}

// Auto-refresh every 10 seconds
setInterval(async function () {
    if (currentUser && currentUser.role === 'admin') {
        await loadAdminData()
    }
}, 10000)