// ===== CONFIGURATION =====
// Ganti dengan URL Google Apps Script Web App kamu
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6Xwbf2Btnv3GoAIhvmVi03d-KkJ85xTOnNREqFNETTXZISAYBT_NzF1u4v68lrgeNjw/exec';

// ===== GLOBAL VARIABLES =====
let currentSection = 0;
let assignedGroup = '';
let surveyData = {};

const sections = [
    'section-intro',
    'section-info',
    'section-consent',
    'section-demografi',
    'section-experience',
    'section-stimulus',
    'section-scale',
    'section-response',
    'section-disqualified',
    'section-thankyou'
];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeConsentCheckboxes();
    initializeScreeningValidation();
    updateProgressBar();
});

// ===== CONSENT MANAGEMENT =====
function initializeConsentCheckboxes() {
    const checkboxes = document.querySelectorAll('.consent-checkbox');
    const consentBtn = document.getElementById('consentBtn');
    const finalConsentRadios = document.querySelectorAll('input[name="final-consent"]');
    
    // Check all checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateConsentButton);
    });
    
    // Check final consent radio
    finalConsentRadios.forEach(radio => {
        radio.addEventListener('change', updateConsentButton);
    });
    
    function updateConsentButton() {
        const allCheckboxesChecked = Array.from(checkboxes).every(cb => cb.checked);
        const finalConsent = document.querySelector('input[name="final-consent"]:checked')?.value;
        
        // Enable button if all checkboxes are checked AND any final consent is selected
        consentBtn.disabled = !(allCheckboxesChecked && finalConsent);
    }
}

function validateConsentAndNext() {
    const finalConsent = document.querySelector('input[name="final-consent"]:checked')?.value;
    
    if (finalConsent === 'Tidak Bersedia') {
        showDisqualified('consent');
        return;
    }
    
    nextSection();
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

// ===== SCALE VALIDATION (Section 7 - Minat Membeli) =====
function validateScaleAndNext() {
    const scaleSection = document.getElementById('section-scale');
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
        alert('Mohon lengkapi semua skala penilaian minat membeli (1-5).');
        return;
    }
    
    nextSection();
}

// ===== REAL-TIME SCREENING VALIDATION =====
let screeningValidation = {
    age: false,
    marketing: false,
    digital: false
};

function initializeScreeningValidation() {
    const usiaInput = document.getElementById('usia');
    const marketingRadios = document.querySelectorAll('input[name="marketing-exp"]');
    const digitalRadios = document.querySelectorAll('input[name="digital-active"]');
    const nextButton = document.querySelector('#section-demografi .btn-next');
    
    // Age validation
    usiaInput.addEventListener('blur', function() {
        const age = parseInt(this.value);
        const errorDiv = document.getElementById('usia-error');
        
        if (this.value && (age < 18 || age > 40)) {
            errorDiv.style.display = 'block';
            screeningValidation.age = false;
        } else if (this.value) {
            errorDiv.style.display = 'none';
            screeningValidation.age = true;
        } else {
            errorDiv.style.display = 'none';
            screeningValidation.age = false;
        }
        updateNextButton(nextButton);
    });
    
    usiaInput.addEventListener('input', function() {
        const age = parseInt(this.value);
        const errorDiv = document.getElementById('usia-error');
        
        if (this.value && (age < 18 || age > 40)) {
            errorDiv.style.display = 'block';
            screeningValidation.age = false;
        } else if (this.value) {
            errorDiv.style.display = 'none';
            screeningValidation.age = true;
        } else {
            screeningValidation.age = false;
        }
        updateNextButton(nextButton);
    });
    
    // Marketing experience validation
    marketingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const errorDiv = document.getElementById('marketing-error');
            
            if (this.value === 'Ya') {
                errorDiv.style.display = 'block';
                screeningValidation.marketing = false;
            } else {
                errorDiv.style.display = 'none';
                screeningValidation.marketing = true;
            }
            updateNextButton(nextButton);
        });
    });
    
    // Digital active validation
    digitalRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const errorDiv = document.getElementById('digital-error');
            
            if (this.value === 'Tidak') {
                errorDiv.style.display = 'block';
                screeningValidation.digital = false;
            } else {
                errorDiv.style.display = 'none';
                screeningValidation.digital = true;
            }
            updateNextButton(nextButton);
        });
    });
}

function updateNextButton(button) {
    // Always keep button enabled, validation will redirect to disqualified page if needed
    // Error messages are shown inline for user awareness
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
    
    // Check screening criteria - redirect to disqualified if not met
    const usia = parseInt(document.getElementById('usia').value);
    const marketingExp = document.querySelector('input[name="marketing-exp"]:checked')?.value;
    const digitalActive = document.querySelector('input[name="digital-active"]:checked')?.value;
    
    // Check age range
    if (usia < 18 || usia > 40) {
        showDisqualified('age', usia);
        return;
    }
    
    // Check marketing experience
    if (marketingExp === 'Ya') {
        showDisqualified('marketing');
        return;
    }
    
    // Check digital media usage
    if (digitalActive === 'Tidak') {
        showDisqualified('digital');
        return;
    }
    
    // Pass all screening
    nextSection();
}

function showDisqualified(reason, ageValue = null) {
    document.getElementById(sections[currentSection]).classList.remove('active');
    currentSection = sections.indexOf('section-disqualified');
    document.getElementById('section-disqualified').classList.add('active');
    
    // Set reason message
    const reasonElement = document.getElementById('disqualifiedReason');
    let reasonText = '';
    
    if (reason === 'consent') {
        reasonText = '<p><strong>Alasan:</strong> Anda memilih "Saya Tidak Bersedia" untuk berpartisipasi dalam penelitian ini. Partisipasi dalam penelitian ini bersifat sukarela dan memerlukan persetujuan Anda.</p>';
    } else if (reason === 'age') {
        if (ageValue < 18) {
            reasonText = `<p><strong>Alasan:</strong> Penelitian ini ditujukan untuk responden berusia 18-40 tahun. Usia Anda saat ini ${ageValue} tahun.</p>`;
        } else {
            reasonText = `<p><strong>Alasan:</strong> Penelitian ini ditujukan untuk responden berusia 18-40 tahun. Usia Anda saat ini ${ageValue} tahun.</p>`;
        }
    } else if (reason === 'marketing') {
        reasonText = '<p><strong>Alasan:</strong> Penelitian ini membutuhkan responden yang tidak memiliki latar belakang atau pengalaman bekerja di bidang marketing/pemasaran untuk menghindari bias dalam hasil penelitian.</p>';
    } else if (reason === 'digital') {
        reasonText = '<p><strong>Alasan:</strong> Penelitian ini membutuhkan responden yang aktif menggunakan media digital (media sosial, website, aplikasi mobile) karena stimulus yang ditampilkan berkaitan dengan konten digital.</p>';
    }
    
    reasonElement.innerHTML = reasonText;
    
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

// ===== COUNTDOWN OVERLAY =====
function showCountdown(seconds) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('countdownOverlay');
        const numberEl = document.getElementById('countdownNumber');
        let timeLeft = seconds;
        
        overlay.classList.add('active');
        numberEl.textContent = timeLeft;
        
        const countdown = setInterval(() => {
            timeLeft--;
            
            if (timeLeft > 0) {
                numberEl.textContent = timeLeft;
            } else {
                clearInterval(countdown);
                overlay.classList.remove('active');
                resolve();
            }
        }, 1000);
    });
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

    // Disable button to prevent double click
    const nextBtn = document.getElementById('experienceNextBtn');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Memproses...';

    // Show 3 second countdown
    await showCountdown(3);

    // Show loading
    showLoading(true, 'Memproses assignment kelompok...');

    // Ambil data untuk stratifikasi
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const purchaseExp = document.querySelector('input[name="purchase-exp"]:checked').value;
    
    // Tentukan strata: Gender (L/P) x Purchase Experience (Ya/Tidak)
    const strata = `${gender === 'Laki-laki' ? 'L' : 'P'}-${purchaseExp === 'Ya' ? 'Ya' : 'Tidak'}`;
    
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
            
            // Re-enable button
            nextBtn.disabled = false;
            nextBtn.textContent = 'Lanjutkan';
            
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
        
        // Re-enable button
        nextBtn.disabled = false;
        nextBtn.textContent = 'Lanjutkan';
        
        nextSection();
    }
}

function fallbackRandomAssignment() {
    const groups = ['A', 'B', 'C'];
    return groups[Math.floor(Math.random() * groups.length)];
}

// ===== SUBMIT SURVEY =====
async function submitSurvey() {
    // Validasi skala response
    const responseSection = document.getElementById('section-response');
    const responseInputs = responseSection.querySelectorAll('input[type="radio"]');
    let allResponsesAnswered = true;
    
    for (let i = 1; i <= 2; i++) {
        const responseName = `response${i}`;
        const isAnswered = responseSection.querySelector(`input[name="${responseName}"]:checked`);
        if (!isAnswered) {
            allResponsesAnswered = false;
            break;
        }
    }
    
    if (!allResponsesAnswered) {
        alert('Mohon lengkapi semua pertanyaan tanggapan terhadap poster.');
        return;
    }

    // Tampilkan loading
    showLoading(true);

    // Kumpulkan semua data
    // Timestamp dengan zona waktu WIB (UTC+7)
    const now = new Date();
    const wibOffset = 7 * 60; // WIB is UTC+7
    const wibTime = new Date(now.getTime() + wibOffset * 60 * 1000);
    const timestamp = wibTime.toISOString().replace('T', ' ').substring(0, 19) + ' WIB';
    
    const formData = {
        timestamp: timestamp,
        
        // Data Diri
        nama: document.getElementById('nama').value,
        email: document.getElementById('email').value,
        usia: document.getElementById('usia').value,
        jenis_kelamin: document.querySelector('input[name="gender"]:checked').value,
        nomor_telepon: document.getElementById('nomor-telepon').value,
        tujuan_ewallet: document.querySelector('input[name="ewallet"]:checked').value,
        pengalaman_marketing: document.querySelector('input[name="marketing-exp"]:checked').value,
        aktif_media_digital: document.querySelector('input[name="digital-active"]:checked').value,
        
        // Pengalaman Membeli Produk Berkonsep Donasi
        pernah_lihat_iklan_digital: document.querySelector('input[name="lihat-iklan"]:checked').value,
        frekuensi_lihat_iklan_digital: document.querySelector('input[name="freq-iklan"]:checked').value,
        pernah_lihat_iklan_donasi: document.querySelector('input[name="lihat-iklan-donasi"]:checked').value,
        frekuensi_lihat_iklan_donasi: document.querySelector('input[name="freq-iklan-donasi"]:checked').value,
        pernah_beli_produk_donasi: document.querySelector('input[name="purchase-exp"]:checked').value,
        jenis_produk_donasi: document.getElementById('jenis-produk').value,
        
        // Assignment
        strata: surveyData.strata,
        kelompok_stimulus: surveyData.kelompok_stimulus,
        
        // Skala Pengukuran (Purchase Intention)
        scale1_tidak_pernah_pasti_berniat: document.querySelector('input[name="scale1"]:checked').value,
        scale2_jelas_tidak_jelas_berniat: document.querySelector('input[name="scale2"]:checked').value,
        scale3_minat_sangat_rendah_tinggi: document.querySelector('input[name="scale3"]:checked').value,
        scale4_jelas_tidak_jelas_akan_beli: document.querySelector('input[name="scale4"]:checked').value,
        scale5_mungkin_tidak_mungkin_beli: document.querySelector('input[name="scale5"]:checked').value,
        
        // Tanggapan Terhadap Poster
        response1_tersentuh: document.querySelector('input[name="response1"]:checked').value,
        response2_manfaat: document.querySelector('input[name="response2"]:checked').value
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
        
        // Go directly to thank you page
        document.getElementById(sections[currentSection]).classList.remove('active');
        currentSection = sections.indexOf('section-thankyou');
        document.getElementById('section-thankyou').classList.add('active');
        updateProgressBar();
        window.scrollTo(0, 0);
        
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
