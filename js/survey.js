// ===== CONFIGURATION =====
// Ganti dengan URL Google Apps Script Web App kamu
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwOFqjaOt8PXBujo68Q4RdJ5rgtEZcxKXudcUxUIfSJYzycQJu3w0ig_CcOtmRuyseoeA/exec';

// ===== GLOBAL VARIABLES =====
let currentSection = 0;
let assignedGroup = '';
let surveyData = {};

const sections = [
    'section-intro',
    'section-consent',
    'section-demografi',
    'section-experience',
    'section-stimulus',
    'section-scale',
    'section-disqualified',
    'section-thankyou'
];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeConsentCheckboxes();
    updateProgressBar();
});

// ===== CONSENT MANAGEMENT =====
function initializeConsentCheckboxes() {
    const checkboxes = document.querySelectorAll('.consent-checkbox');
    const consentBtn = document.getElementById('consentBtn');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            consentBtn.disabled = !allChecked;
        });
    });
}

// ===== NAVIGATION =====
function nextSection() {
    if (currentSection < sections.length - 1) {
        document.getElementById(sections[currentSection]).classList.remove('active');
        currentSection++;
        document.getElementById(sections[currentSection]).classList.add('active');
        updateProgressBar();
        window.scrollTo(0, 0);
        
        // Start timer jika masuk ke stimulus section
        if (sections[currentSection] === 'section-stimulus') {
            startStimulusTimer();
        }
    }
}

function prevSection() {
    if (currentSection > 0) {
        document.getElementById(sections[currentSection]).classList.remove('active');
        currentSection--;
        document.getElementById(sections[currentSection]).classList.add('active');
        updateProgressBar();
        window.scrollTo(0, 0);
    }
}

function updateProgressBar() {
    const progress = (currentSection / (sections.length - 1)) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

// ===== VALIDATION =====
function validateAndNext(sectionId) {
    const section = document.getElementById(sectionId);
    const inputs = section.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.type === 'radio') {
            const radioGroup = section.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (!isChecked) {
                isValid = false;
            }
        } else if (input.type === 'text' || input.type === 'number' || input.tagName === 'SELECT') {
            if (!input.value || input.value.trim() === '') {
                isValid = false;
                input.style.borderColor = '#dc3545';
            } else {
                input.style.borderColor = '#dee2e6';
            }
        }
    });
    
    if (isValid) {
        nextSection();
    } else {
        alert('Mohon lengkapi semua pertanyaan yang bertanda (*) wajib diisi.');
    }
}

// ===== SCREENING VALIDATION =====
function validateDemografiAndNext() {
    const section = document.getElementById('section-demografi');
    const inputs = section.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.type === 'radio') {
            const radioGroup = section.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (!isChecked) {
                isValid = false;
            }
        } else if (input.type === 'text' || input.type === 'number' || input.tagName === 'SELECT') {
            if (!input.value || input.value.trim() === '') {
                isValid = false;
                input.style.borderColor = '#dc3545';
            } else {
                input.style.borderColor = '#dee2e6';
            }
        }
    });
    
    if (!isValid) {
        alert('Mohon lengkapi semua pertanyaan yang bertanda (*) wajib diisi.');
        return;
    }
    
    // Screening criteria
    const usia = parseInt(document.getElementById('usia').value);
    const marketingExp = document.querySelector('input[name="marketing-exp"]:checked')?.value;
    const digitalActive = document.querySelector('input[name="digital-active"]:checked')?.value;
    
    // Check age range
    if (usia < 18 || usia > 40) {
        showDisqualified();
        return;
    }
    
    // Check marketing experience
    if (marketingExp === 'Ya') {
        showDisqualified();
        return;
    }
    
    // Check digital media usage
    if (digitalActive === 'Tidak') {
        showDisqualified();
        return;
    }
    
    // Pass all screening
    nextSection();
}

function showDisqualified() {
    document.getElementById(sections[currentSection]).classList.remove('active');
    currentSection = sections.indexOf('section-disqualified');
    document.getElementById('section-disqualified').classList.add('active');
    updateProgressBar();
    window.scrollTo(0, 0);
}

// ===== STIMULUS TIMER =====
function startStimulusTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    const nextBtn = document.getElementById('stimulusNextBtn');
    let timeLeft = 30;
    
    nextBtn.disabled = true;
    timerDisplay.style.display = 'block';
    timerDisplay.innerHTML = `<span style="color: #dc3545; font-weight: 600;">⏱️ Mohon tunggu ${timeLeft} detik untuk melanjutkan</span>`;
    
    const countdown = setInterval(() => {
        timeLeft--;
        
        if (timeLeft > 0) {
            timerDisplay.innerHTML = `<span style="color: #dc3545; font-weight: 600;">⏱️ Mohon tunggu ${timeLeft} detik untuk melanjutkan</span>`;
        } else {
            clearInterval(countdown);
            timerDisplay.innerHTML = `<span style="color: #28a745; font-weight: 600;">✓ Anda sudah dapat melanjutkan</span>`;
            nextBtn.disabled = false;
        }
    }, 1000);
}

// ===== STRATIFIED RANDOM ASSIGNMENT =====
async function assignGroupAndShowStimulus() {
    // Validasi dulu
    const section = document.getElementById('section-experience');
    const inputs = section.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.type === 'radio') {
            const radioGroup = section.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (!isChecked) isValid = false;
        }
    });
    
    if (!isValid) {
        alert('Mohon lengkapi semua pertanyaan yang bertanda (*) wajib diisi.');
        return;
    }

    // Show loading
    showLoading(true, 'Memproses assignment kelompok...');

    // Ambil data untuk stratifikasi
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const purchaseExp = document.querySelector('input[name="purchase-exp"]:checked').value;
    
    // Tentukan strata
    const strata = `${gender === 'Laki-laki' ? 'L' : 'P'}-${purchaseExp === 'Pernah' ? 'Pernah' : 'Belum'}`;
    
    try {
        // Request assignment dari server
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAssignment&strata=${encodeURIComponent(strata)}`);
        const data = await response.json();
        
        if (data.success) {
            assignedGroup = data.group;
            
            // Set stimulus image
            const stimulusImage = document.getElementById('stimulusImage');
            stimulusImage.src = `images/stimulus-${assignedGroup.toLowerCase()}.png`;
            
            // Simpan data assignment
            surveyData.strata = strata;
            surveyData.kelompok_stimulus = assignedGroup;
            
            showLoading(false);
            nextSection();
        } else {
            throw new Error('Failed to get group assignment');
        }
    } catch (error) {
        console.error('Error:', error);
        // Fallback ke random lokal jika server error
        assignedGroup = fallbackRandomAssignment();
        
        const stimulusImage = document.getElementById('stimulusImage');
        stimulusImage.src = `images/stimulus-${assignedGroup.toLowerCase()}.png`;
        
        surveyData.strata = strata;
        surveyData.kelompok_stimulus = assignedGroup;
        
        showLoading(false);
        nextSection();
    }
}

function fallbackRandomAssignment() {
    const groups = ['A', 'B', 'C'];
    return groups[Math.floor(Math.random() * groups.length)];
}

// ===== SUBMIT SURVEY =====
async function submitSurvey() {
    // Validasi skala pengukuran
    const scaleSection = document.getElementById('section-scale');
    const scaleInputs = scaleSection.querySelectorAll('input[type="radio"]');
    let allScalesAnswered = true;
    
    for (let i = 1; i <= 5; i++) {
        const scaleName = `scale${i}`;
        const isAnswered = scaleSection.querySelector(`input[name="${scaleName}"]:checked`);
        if (!isAnswered) {
            allScalesAnswered = false;
            break;
        }
    }
    
    if (!allScalesAnswered) {
        alert('Mohon lengkapi semua skala penilaian.');
        return;
    }

    // Tampilkan loading
    showLoading(true);

    // Kumpulkan semua data
    const formData = {
        timestamp: new Date().toISOString(),
        
        // Data Diri
        nama: document.getElementById('nama').value,
        usia: document.getElementById('usia').value,
        jenis_kelamin: document.querySelector('input[name="gender"]:checked').value,
        pendidikan: document.getElementById('pendidikan').value,
        pekerjaan: document.getElementById('pekerjaan').value,
        pengalaman_marketing: document.querySelector('input[name="marketing-exp"]:checked').value,
        aktif_media_digital: document.querySelector('input[name="digital-active"]:checked').value,
        
        // Pengalaman Membeli
        frekuensi_online: document.querySelector('input[name="freq-online"]:checked').value,
        pengalaman_beli: document.querySelector('input[name="purchase-exp"]:checked').value,
        faktor_keputusan: document.querySelector('input[name="decision-factor"]:checked').value,
        
        // Assignment
        strata: surveyData.strata,
        kelompok_stimulus: surveyData.kelompok_stimulus,
        
        // Skala Pengukuran (Purchase Intention)
        scale1_tidak_pernah_pasti_berniat: document.querySelector('input[name="scale1"]:checked').value,
        scale2_jelas_tidak_jelas_berniat: document.querySelector('input[name="scale2"]:checked').value,
        scale3_minat_sangat_rendah_tinggi: document.querySelector('input[name="scale3"]:checked').value,
        scale4_jelas_tidak_jelas_akan_beli: document.querySelector('input[name="scale4"]:checked').value,
        scale5_mungkin_tidak_mungkin_beli: document.querySelector('input[name="scale5"]:checked').value
    };

    try {
        // Kirim ke Google Sheets
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // no-cors mode tidak return response, jadi assume success
        showLoading(false);
        nextSection(); // Go to thank you page
        
    } catch (error) {
        console.error('Error:', error);
        showLoading(false);
        
        // Fallback: download as JSON
        if (confirm('Terjadi kesalahan saat mengirim data. Apakah Anda ingin mengunduh data sebagai file backup?')) {
            downloadBackup(formData);
        }
    }
}

function showLoading(show, message = 'Mengirim data...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = overlay.querySelector('p');
    if (show) {
        loadingText.textContent = message;
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function downloadBackup(data) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-backup-${Date.now()}.json`;
    link.click();
}

// ===== UTILITY FUNCTIONS =====
// Prevent back button
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
};
