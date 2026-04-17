"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

// Admin Dashboard JavaScript
var currentUser = null;
var students = [];
var submissions = [];
var currentUploadSubmissionId = null; // Modal ke liye — konsi submission ka paper upload ho raha hai

var currentGradeSubmission = null; // Initialize admin dashboard

document.addEventListener('DOMContentLoaded', function () {
  console.log('=== ADMIN PAGE LOADING ===');
  var userStr = localStorage.getItem('currentUser');

  if (!userStr) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = JSON.parse(userStr);

  if (currentUser.role !== 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  console.log('✓ Admin authenticated');

  if (typeof initSupabase === 'function' && !supabaseClient) {
    initSupabase();
  }

  loadAdminData();
});

function loadAdminData() {
  var _ref, studentsData, studentsError, _ref2, submissionsData, submissionsError;

  return regeneratorRuntime.async(function loadAdminData$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          console.log('Loading admin data...');
          students = [];
          submissions = [];
          _context.prev = 3;

          if (!supabaseClient) {
            _context.next = 19;
            break;
          }

          _context.next = 7;
          return regeneratorRuntime.awrap(supabaseClient.from('students').select('*').order('registration_date', {
            ascending: false
          }));

        case 7:
          _ref = _context.sent;
          studentsData = _ref.data;
          studentsError = _ref.error;
          if (studentsError) console.error('Students error:', studentsError);

          if (studentsData) {
            students = studentsData;
            console.log('✓ Students:', students.length);
          } // Submissions fetch — checked_paper_url bhi lao


          _context.next = 14;
          return regeneratorRuntime.awrap(supabaseClient.from('submissions').select('*').order('submission_date', {
            ascending: false
          }));

        case 14:
          _ref2 = _context.sent;
          submissionsData = _ref2.data;
          submissionsError = _ref2.error;
          if (submissionsError) console.error('Submissions error:', submissionsError);

          if (submissionsData) {
            submissions = submissionsData;
            localStorage.setItem('submissions', JSON.stringify(submissions));
            console.log('✓ Submissions:', submissions.length);
          }

        case 19:
          _context.next = 24;
          break;

        case 21:
          _context.prev = 21;
          _context.t0 = _context["catch"](3);
          console.error('Supabase error:', _context.t0);

        case 24:
          // Fallback
          if (students.length === 0) students = JSON.parse(localStorage.getItem('students') || '[]');
          if (submissions.length === 0) submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
          updateStats();
          loadStudentsTable();
          loadSubmissionsTable();
          loadSubjectAnalytics();

        case 30:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[3, 21]]);
}

function updateStats() {
  document.getElementById('totalStudents').textContent = students.length;
  var allSubjects = students.flatMap(function (s) {
    return s.subjects || [];
  });
  document.getElementById('activeSubjects').textContent = _toConsumableArray(new Set(allSubjects)).length;
  document.getElementById('totalSubmissions').textContent = submissions.length;
  var totalRevenue = students.reduce(function (sum, s) {
    return sum + (s.payment_amount || 0);
  }, 0);
  document.getElementById('totalRevenue').textContent = "\u20B9".concat(totalRevenue.toLocaleString('en-IN'));
}

function loadStudentsTable() {
  var tbody = document.getElementById('studentsTableBody');

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">No students registered yet</td></tr>';
    return;
  }

  tbody.innerHTML = students.map(function (student) {
    var studentSubmissions = submissions.filter(function (s) {
      return s.user_id === student.user_id;
    });
    var regDate = new Date(student.registration_date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return "\n            <tr>\n                <td><strong>".concat(student.user_id, "</strong></td>\n                <td>").concat(student.full_name, "</td>\n                <td>").concat(student.email, "</td>\n                <td>").concat(student.phone, "</td>\n                <td>").concat(student.subjects ? student.subjects.length : 0, "</td>\n                <td><strong style=\"color:var(--primary-color);\">").concat(studentSubmissions.length, "</strong></td>\n                <td>").concat(regDate, "</td>\n                <td><strong>\u20B9").concat((student.payment_amount || 0).toLocaleString('en-IN'), "</strong></td>\n            </tr>\n        ");
  }).join('');
}

function loadSubmissionsTable() {
  var tbody = document.getElementById('submissionsTableBody');

  if (submissions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">No submissions yet</td></tr>';
    return;
  }

  var recentSubmissions = submissions.slice(0, 50);
  tbody.innerHTML = recentSubmissions.map(function (submission) {
    var submissionDate = new Date(submission.submission_date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    var fileSize = formatFileSize(submission.file_size);
    var studentName = submission.student_name;

    if (!studentName || studentName === 'undefined') {
      var student = students.find(function (s) {
        return s.user_id === submission.user_id;
      });
      studentName = student ? student.full_name : submission.user_id || 'Unknown';
    } // ✅ Checked paper column


    var hasChecked = !!submission.checked_paper_url;
    var checkedColumn = hasChecked ? "\n                <div style=\"display:flex; flex-direction:column; gap:0.4rem;\">\n                    <span style=\"color:#06d6a0; font-weight:600; font-size:0.8rem;\">\n                        \u2705 Uploaded\n                    </span>\n                    <div style=\"display:flex; gap:0.4rem;\">\n                        <a href=\"".concat(submission.checked_paper_url, "\" target=\"_blank\"\n                            style=\"font-size:0.75rem; color:#6c63ff; text-decoration:none;\">\n                            \uD83D\uDC41\uFE0F View\n                        </a>\n                        <button class=\"checked-upload-btn uploaded\"\n                            onclick=\"openUploadModal('").concat(submission.id, "', '").concat(studentName, "', '").concat(submission.worksheet_title, "')\">\n                            \uD83D\uDD04 Replace\n                        </button>\n                    </div>\n                </div>\n            ") : "\n                <button class=\"checked-upload-btn\"\n                    onclick=\"openUploadModal('".concat(submission.id, "', '").concat(studentName, "', '").concat(submission.worksheet_title, "')\">\n                    \uD83D\uDCE4 Upload Checked\n                </button>\n            "); // ✅ Grade column
    // const existingGrade = grades.find(
    //     (g) =>
    //          g.subject === submission.subject &&
    //         Number(g.worksheet_number) === Number(submission.worksheet_id)&&  g.grade !== null
    // );

    var gradeCol = submission.grade ? "\n                <div style=\"display:flex;flex-direction:column;gap:0.3rem;align-items:center;\">\n                    <span style=\"font-size:1.3rem;font-weight:700;color:#6c63ff;\">\n                        ".concat(submission.grade, "\n                    </span>\n                    <button class=\"grade-btn graded\"\n                        onclick=\"openGradeModal(\n                            '").concat(submission.user_id, "',\n                            '").concat(studentName, "',\n                            '").concat(submission.subject, "',\n                            '").concat(submission.worksheet_id, "',\n                            '").concat(submission.worksheet_title, "',\n                            '").concat(submission.id, "'\n            )\">\n                        \u270F\uFE0F Edit\n                    </button>\n                </div>") : "\n                <button class=\"grade-btn\"\n                    onclick=\"openGradeModal('".concat(submission.user_id, "',\n                        '").concat(studentName, "',\n                        '").concat(submission.subject, "',\n                        '").concat(submission.worksheet_id, "',\n                        '").concat(submission.worksheet_title, "',\n                        '").concat(submission.id, "'\n        )\">\n                    \uD83D\uDCCA Add Grade\n                </button>");
    return "\n            <tr>\n                <td><strong>".concat(studentName, "</strong></td>\n                <td>").concat(submission.subject, "</td>\n                <td>").concat(submission.worksheet_title, "</td>\n                <td>\n                    ").concat(submission.file_name, "\n                    <a href=\"").concat(submission.file_url, "\" download=\"").concat(submission.file_name, "\"\n                        target=\"_blank\" title=\"Download\">\u2B07\uFE0F</a>\n                </td>\n                <td>").concat(submissionDate, "</td>\n                <td>").concat(fileSize, "</td>\n                <td>").concat(checkedColumn, "</td>\n                <td>").concat(gradeCol, "</td>\n            </tr>\n            ");
  }).join('');
}

function openGradeModal(submissionId, studentName, worksheetTitle) {
  currentUploadSubmissionId = submissionId;
  document.getElementById('modalSubtitle').textContent = "".concat(studentName, " \u2014 ").concat(worksheetTitle);
  document.getElementById('checkedPaperFile').value = '';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadModal').classList.add('active');
}

function closeGradeModal() {
  document.getElementById('gradeModal').classList.remove('active');
  currentGradeSubmission = null;
}

function saveGrade() {
  var grade, btn, _ref3, error;

  return regeneratorRuntime.async(function saveGrade$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          grade = document.getElementById('gradeInput').value.trim();

          if (grade) {
            _context2.next = 4;
            break;
          }

          alert('Grade likho!');
          return _context2.abrupt("return");

        case 4:
          btn = document.getElementById('confirmGradeBtn');
          btn.disabled = true;
          btn.textContent = 'Saving...';
          _context2.prev = 7;
          _context2.next = 10;
          return regeneratorRuntime.awrap(supabaseClient.from('submissions').update({
            grade: grade,
            graded_by: currentUser.full_name || 'Admin',
            graded_at: new Date().toISOString()
          }).eq('id', currentGradeSubmission.submissionId));

        case 10:
          _ref3 = _context2.sent;
          error = _ref3.error;

          if (!error) {
            _context2.next = 14;
            break;
          }

          throw error;

        case 14:
          alert('✅ Grade saved!');
          closeGradeModal();
          _context2.next = 18;
          return regeneratorRuntime.awrap(loadAdminData());

        case 18:
          _context2.next = 25;
          break;

        case 20:
          _context2.prev = 20;
          _context2.t0 = _context2["catch"](7);
          alert('Error: ' + _context2.t0.message);
          btn.disabled = false;
          btn.textContent = 'Save Grade';

        case 25:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[7, 20]]);
} // ══════════════════════════════════════════
//  CHECKED PAPER UPLOAD
// ══════════════════════════════════════════


function openUploadModal(userId, studentName, subject, worksheetId, worksheetTitle) {
  currentGradeSubmission = {
    userId: userId,
    studentName: studentName,
    subject: subject,
    worksheetId: worksheetId,
    worksheetTitle: worksheetTitle
  };
  currentUploadSubmissionId = submissionId;
  document.getElementById('modalSubtitle').textContent = "".concat(studentName, " \u2014 ").concat(worksheetTitle);
  document.getElementById('checkedPaperFile').value = '';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('confirmUploadBtn').disabled = false;
  document.getElementById('confirmUploadBtn').textContent = '⬆️ Upload';
  document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('active');
  currentUploadSubmissionId = null;
}

function confirmCheckedUpload() {
  var file, allowedTypes, confirmBtn, progress, filePath, fileUrl, _ref4, uploadData, uploadError, _supabaseClient$stora, urlData, _ref5, updateError;

  return regeneratorRuntime.async(function confirmCheckedUpload$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          file = document.getElementById('checkedPaperFile').files[0];

          if (file) {
            _context3.next = 4;
            break;
          }

          alert('Pehle file select karo!');
          return _context3.abrupt("return");

        case 4:
          allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

          if (allowedTypes.includes(file.type)) {
            _context3.next = 8;
            break;
          }

          alert('Sirf PDF ya Word file upload karo.');
          return _context3.abrupt("return");

        case 8:
          confirmBtn = document.getElementById('confirmUploadBtn');
          progress = document.getElementById('uploadProgress');
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Uploading...';
          progress.style.display = 'block';
          _context3.prev = 13;
          // 1. File upload karo Supabase Storage mein
          filePath = "checked-papers/".concat(currentUploadSubmissionId, "/").concat(file.name);
          fileUrl = null;

          if (!supabaseClient) {
            _context3.next = 34;
            break;
          }

          _context3.next = 19;
          return regeneratorRuntime.awrap(supabaseClient.storage.from('admin-worksheets') // apna bucket naam yahan
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          }));

        case 19:
          _ref4 = _context3.sent;
          uploadData = _ref4.data;
          uploadError = _ref4.error;

          if (!uploadError) {
            _context3.next = 24;
            break;
          }

          throw uploadError;

        case 24:
          _supabaseClient$stora = supabaseClient.storage.from('admin-worksheets').getPublicUrl(filePath), urlData = _supabaseClient$stora.data;
          fileUrl = urlData.publicUrl;
          console.log('✓ Checked paper uploaded:', fileUrl); // 2. Submission row update karo

          _context3.next = 29;
          return regeneratorRuntime.awrap(supabaseClient.from('submissions').update({
            checked_paper_url: fileUrl,
            checked_paper_name: file.name,
            checked_at: new Date().toISOString(),
            checked_by: currentUser.full_name || currentUser.username || 'Admin'
          }).eq('id', currentUploadSubmissionId));

        case 29:
          _ref5 = _context3.sent;
          updateError = _ref5.error;

          if (!updateError) {
            _context3.next = 33;
            break;
          }

          throw updateError;

        case 33:
          console.log('✓ Submission updated with checked paper');

        case 34:
          confirmBtn.textContent = '✅ Done!';
          progress.style.display = 'none';
          setTimeout(function () {
            closeUploadModal();
            loadAdminData(); // Table refresh karo
          }, 800);
          alert("\u2705 Checked paper upload ho gaya!\nStudent ko ab dikhega.");
          _context3.next = 47;
          break;

        case 40:
          _context3.prev = 40;
          _context3.t0 = _context3["catch"](13);
          console.error('Upload error:', _context3.t0);
          alert('Error: ' + _context3.t0.message);
          confirmBtn.disabled = false;
          confirmBtn.textContent = '⬆️ Upload';
          progress.style.display = 'none';

        case 47:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[13, 40]]);
} // ══════════════════════════════════════════
//  SUBJECT ANALYTICS
// ══════════════════════════════════════════


function loadSubjectAnalytics() {
  var tbody = document.getElementById('subjectsTableBody');
  var allSubjects = students.flatMap(function (s) {
    return s.subjects || [];
  });

  var uniqueSubjects = _toConsumableArray(new Set(allSubjects));

  if (uniqueSubjects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;">No subject data available</td></tr>';
    return;
  }

  var subjectStats = uniqueSubjects.map(function (subject) {
    var enrolledStudents = students.filter(function (s) {
      return s.subjects && s.subjects.includes(subject);
    }).length;
    var subjectSubmissions = submissions.filter(function (s) {
      return s.subject === subject;
    }).length;
    var totalPossible = enrolledStudents * 10;
    var completionRate = totalPossible > 0 ? Math.round(subjectSubmissions / totalPossible * 100) : 0;
    return {
      subject: subject,
      enrolledStudents: enrolledStudents,
      subjectSubmissions: subjectSubmissions,
      completionRate: completionRate
    };
  });
  subjectStats.sort(function (a, b) {
    return b.enrolledStudents - a.enrolledStudents;
  });
  tbody.innerHTML = subjectStats.map(function (stat) {
    return "\n        <tr>\n            <td><strong>".concat(stat.subject, "</strong></td>\n            <td>").concat(stat.enrolledStudents, "</td>\n            <td>").concat(stat.subjectSubmissions, "</td>\n            <td>\n                <div style=\"display:flex; align-items:center; gap:1rem;\">\n                    <div style=\"flex:1; height:8px; background:var(--bg-tertiary);\n                                border-radius:4px; overflow:hidden;\">\n                        <div style=\"width:").concat(stat.completionRate, "%; height:100%;\n                                    background:var(--gradient-primary); border-radius:4px;\">\n                        </div>\n                    </div>\n                    <span style=\"font-weight:600; color:var(--primary-color);\">\n                        ").concat(stat.completionRate, "%\n                    </span>\n                </div>\n            </td>\n        </tr>\n    ");
  }).join('');
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  var k = 1024;
  var sizes = ['Bytes', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
} // Auto-refresh every 10 seconds


setInterval(function _callee() {
  return regeneratorRuntime.async(function _callee$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          if (!(currentUser && currentUser.role === 'admin')) {
            _context4.next = 3;
            break;
          }

          _context4.next = 3;
          return regeneratorRuntime.awrap(loadAdminData());

        case 3:
        case "end":
          return _context4.stop();
      }
    }
  });
}, 10000);