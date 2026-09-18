/**
 * =========================================================
 * STUDENT MANAGEMENT SYSTEM - JAVASCRIPT (script.js)
 * =========================================================
 * This script handles all the dynamic logic for our application:
 * 1. Selecting HTML elements (DOM manipulation)
 * 2. Managing application state (an array of student objects)
 * 3. Saving & loading data with browser LocalStorage
 * 4. CRUD operations (Create, Read, Update, Delete)
 * 5. Live Search & Filtering
 * 6. Calculating and updating dashboard statistics
 * =========================================================
 */

// Key used to store and retrieve our student data in browser LocalStorage
const STORAGE_KEY = 'sms_students_data';

/**
 * Starter sample data to populate the app if empty or when user clicks "Load Demo Data"
 */
const DEMO_STUDENTS = [
  { id: 'STU-101', name: 'Sophia Miller', email: 'sophia.m@example.com', course: 'Computer Science', grade: 'A' },
  { id: 'STU-102', name: 'Liam Davies', email: 'liam.d@example.com', course: 'Data Science', grade: 'B' },
  { id: 'STU-103', name: 'Emma Wilson', email: 'emma.w@example.com', course: 'Information Technology', grade: 'A' },
  { id: 'STU-104', name: 'Noah Brown', email: 'noah.b@example.com', course: 'Business Administration', grade: 'C' },
  { id: 'STU-105', name: 'Olivia Garcia', email: 'olivia.g@example.com', course: 'Mechanical Engineering', grade: 'B' }
];

/* ---------------------------------------------------------
   STEP 1: SELECTING HTML DOM ELEMENTS
   We use document.getElementById() to link HTML elements
   to JavaScript variables so we can read from and modify them.
   --------------------------------------------------------- */
const studentForm    = document.getElementById('student-form');
const editIndexInput = document.getElementById('edit-index');
const nameInput      = document.getElementById('student-name');
const idInput        = document.getElementById('student-id');
const emailInput     = document.getElementById('student-email');
const courseSelect   = document.getElementById('student-course');
const gradeSelect    = document.getElementById('student-grade');
const submitBtn      = document.getElementById('submit-btn');
const cancelBtn      = document.getElementById('cancel-btn');
const formTitle      = document.getElementById('form-title');

// Search & Filter controls
const searchInput    = document.getElementById('search-input');
const filterCourse   = document.getElementById('filter-course');

// Output areas
const studentTbody   = document.getElementById('student-tbody');
const emptyState     = document.getElementById('empty-state');
const studentTable   = document.getElementById('student-table');

// Stat counter elements
const statTotal      = document.getElementById('stat-total');
const statCourses    = document.getElementById('stat-courses');
const statPassing    = document.getElementById('stat-passing');

// Header action buttons
const loadDemoBtn    = document.getElementById('load-demo-btn');
const clearAllBtn    = document.getElementById('clear-all-btn');

// Toast notification container
const toastElement   = document.getElementById('toast');

/* ---------------------------------------------------------
   STEP 2: APPLICATION STATE & LOCALSTORAGE HELPERS
   --------------------------------------------------------- */

/**
 * Loads the list of students from browser LocalStorage.
 * If none exists, returns an empty array [].
 */
function getStoredStudents() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) return [];
  try {
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to parse localStorage data:', error);
    return [];
  }
}

/**
 * Saves the given array of student objects to LocalStorage as a JSON string.
 */
function saveStoredStudents(studentsList) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(studentsList));
}

// Our global in-memory state: an array containing all student objects
let students = getStoredStudents();

/* ---------------------------------------------------------
   STEP 3: RENDERING THE TABLE & STATS
   --------------------------------------------------------- */

/**
 * Returns HTML badge class corresponding to academic grade
 */
function getGradeBadgeClass(grade) {
  switch (grade) {
    case 'A': return 'badge-grade-a';
    case 'B': return 'badge-grade-b';
    case 'C': return 'badge-grade-c';
    case 'D': return 'badge-grade-d';
    case 'F': return 'badge-grade-f';
    default:  return 'badge-grade-b';
  }
}

/**
 * Escapes user input strings to prevent HTML injection (XSS attacks)
 */
function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

/**
 * Renders the student table based on search input and filter dropdown.
 */
function renderTable() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCourse = filterCourse.value;

  // Filter students based on search term and selected course
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm) ||
      student.id.toLowerCase().includes(searchTerm) ||
      student.email.toLowerCase().includes(searchTerm);

    const matchesCourse = selectedCourse === 'ALL' || student.course === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  // If no students match the criteria, show the Empty State message
  if (filteredStudents.length === 0) {
    studentTbody.innerHTML = '';
    studentTable.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    studentTable.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Build table rows dynamically
    studentTbody.innerHTML = filteredStudents.map(student => {
      // Find the original index of this student in the main array
      const originalIndex = students.findIndex(s => s.id === student.id);
      const badgeClass = getGradeBadgeClass(student.grade);

      return `
        <tr>
          <td><span class="student-id-badge">${escapeHtml(student.id)}</span></td>
          <td>
            <div class="student-name-text">${escapeHtml(student.name)}</div>
            <div class="student-email-text">${escapeHtml(student.email)}</div>
          </td>
          <td>${escapeHtml(student.course)}</td>
          <td><span class="badge ${badgeClass}">Grade ${escapeHtml(student.grade)}</span></td>
          <td class="text-right">
            <div class="action-buttons">
              <button 
                class="btn btn-secondary btn-sm" 
                onclick="handleEditStudent(${originalIndex})"
                title="Edit student"
              >
                ✏️ Edit
              </button>
              <button 
                class="btn btn-outline-danger btn-sm" 
                onclick="handleDeleteStudent(${originalIndex})"
                title="Delete student"
              >
                🗑️ Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Update top stats summary whenever table changes
  updateStats();
}

/**
 * Calculates summary metrics (total students, active courses, passing percentage)
 */
function updateStats() {
  const total = students.length;
  statTotal.textContent = total;

  if (total === 0) {
    statCourses.textContent = '0';
    statPassing.textContent = '0%';
    return;
  }

  // Calculate unique active courses
  const uniqueCourses = new Set(students.map(s => s.course));
  statCourses.textContent = uniqueCourses.size;

  // Calculate passing rate (grades A, B, C, D are passing; F is failing)
  const passingCount = students.filter(s => s.grade !== 'F').length;
  const passingRate = Math.round((passingCount / total) * 100);
  statPassing.textContent = `${passingRate}%`;
}

/* ---------------------------------------------------------
   STEP 4: FORM VALIDATION & HANDLING (CREATE & UPDATE)
   --------------------------------------------------------- */

/**
 * Resets any error messages shown beneath inputs
 */
function clearValidationErrors() {
  document.getElementById('name-error').textContent = '';
  document.getElementById('id-error').textContent = '';
  document.getElementById('email-error').textContent = '';
  document.getElementById('course-error').textContent = '';
}

/**
 * Validates form inputs and returns true if all fields are valid
 */
function validateForm(name, id, email, course, editingIndex) {
  clearValidationErrors();
  let isValid = true;

  if (!name.trim()) {
    document.getElementById('name-error').textContent = 'Please enter student name';
    isValid = false;
  }

  if (!id.trim()) {
    document.getElementById('id-error').textContent = 'Please enter student ID';
    isValid = false;
  } else {
    // Check for duplicate Student ID (unless updating the same student)
    const duplicate = students.find((s, idx) => s.id.toLowerCase() === id.trim().toLowerCase() && idx !== editingIndex);
    if (duplicate) {
      document.getElementById('id-error').textContent = 'This Student ID already exists';
      isValid = false;
    }
  }

  // Basic email pattern regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim() || !emailRegex.test(email.trim())) {
    document.getElementById('email-error').textContent = 'Please enter a valid email address';
    isValid = false;
  }

  if (!course) {
    document.getElementById('course-error').textContent = 'Please select a course';
    isValid = false;
  }

  return isValid;
}

/**
 * Handles Form Submission for both ADDING (Create) and EDITING (Update)
 */
studentForm.addEventListener('submit', function (event) {
  event.preventDefault(); // Prevents page reload on submit

  const name   = nameInput.value.trim();
  const id     = idInput.value.trim().toUpperCase();
  const email  = emailInput.value.trim();
  const course = courseSelect.value;
  const grade  = gradeSelect.value;
  const editingIndex = parseInt(editIndexInput.value, 10);

  // Validate fields
  if (!validateForm(name, id, email, course, editingIndex)) {
    return;
  }

  const studentData = { id, name, email, course, grade };

  if (editingIndex >= 0) {
    // UPDATE existing student
    students[editingIndex] = studentData;
    showToast(`Updated details for ${name}`);
  } else {
    // CREATE new student (add to front of array)
    students.unshift(studentData);
    showToast(`Added ${name} to system!`);
  }

  // Save changes to browser localStorage and re-render
  saveStoredStudents(students);
  resetForm();
  renderTable();
});

/* ---------------------------------------------------------
   STEP 5: EDITING & DELETING STUDENTS
   --------------------------------------------------------- */

/**
 * Populates the form with existing student details to start editing
 */
window.handleEditStudent = function (index) {
  const student = students[index];
  if (!student) return;

  // Set form field values
  editIndexInput.value = index;
  nameInput.value = student.name;
  idInput.value = student.id;
  emailInput.value = student.email;
  courseSelect.value = student.course;
  gradeSelect.value = student.grade;

  // Change UI to reflect edit mode
  formTitle.textContent = '✏️ Edit Student Details';
  submitBtn.textContent = '💾 Update Student';
  cancelBtn.classList.remove('hidden');

  clearValidationErrors();

  // Smooth scroll to form on mobile devices
  studentForm.scrollIntoView({ behavior: 'smooth' });
};

/**
 * Resets form back to "Add New Student" mode
 */
function resetForm() {
  studentForm.reset();
  editIndexInput.value = '-1';
  formTitle.textContent = '➕ Add New Student';
  submitBtn.textContent = '💾 Save Student';
  cancelBtn.classList.add('hidden');
  clearValidationErrors();
}

cancelBtn.addEventListener('click', resetForm);

/**
 * Removes a student from the array with user confirmation
 */
window.handleDeleteStudent = function (index) {
  const student = students[index];
  if (!student) return;

  const confirmed = confirm(`Are you sure you want to delete ${student.name} (${student.id})?`);
  if (confirmed) {
    students.splice(index, 1); // Remove 1 element at index
    saveStoredStudents(students);
    showToast(`Removed ${student.name} from system.`);
    
    // If we were editing this student, cancel edit mode
    if (parseInt(editIndexInput.value, 10) === index) {
      resetForm();
    }
    renderTable();
  }
};

/* ---------------------------------------------------------
   STEP 6: SEARCH & FILTER EVENT LISTENERS
   --------------------------------------------------------- */
searchInput.addEventListener('input', renderTable);
filterCourse.addEventListener('change', renderTable);

/* ---------------------------------------------------------
   STEP 7: DEMO DATA & CLEAR ALL ACTIONS
   --------------------------------------------------------- */
loadDemoBtn.addEventListener('click', () => {
  students = [...DEMO_STUDENTS];
  saveStoredStudents(students);
  resetForm();
  renderTable();
  showToast('Sample student data loaded successfully!');
});

clearAllBtn.addEventListener('click', () => {
  if (students.length === 0) {
    showToast('Student list is already empty.');
    return;
  }
  const confirmed = confirm('Are you sure you want to remove ALL student records? This cannot be undone.');
  if (confirmed) {
    students = [];
    saveStoredStudents(students);
    resetForm();
    renderTable();
    showToast('All student records cleared.');
  }
});

/* ---------------------------------------------------------
   STEP 8: TOAST NOTIFICATIONS HELPER
   --------------------------------------------------------- */
let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  toastElement.textContent = message;
  toastElement.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    toastElement.classList.add('hidden');
  }, 3000);
}

/* ---------------------------------------------------------
   INITIALIZE ON PAGE LOAD
   --------------------------------------------------------- */
// If first time visiting and no students exist, populate demo data for a welcoming feel
if (students.length === 0) {
  students = [...DEMO_STUDENTS];
  saveStoredStudents(students);
}

// Initial render
renderTable();
