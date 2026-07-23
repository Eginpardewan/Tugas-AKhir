
    const API_URL = 'http://localhost:5000/api';
    let currentBabExam = null;
    let currentCertExam = null;
    let allBabs = [];
    let allMateris = [];

    // ==================== MOBILE SIDEBAR ====================
    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('overlay').classList.toggle('active');
    }
    
    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
    }
    
    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);

    // ==================== AUTH ====================
    (function() {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole');
        if (!token || role !== 'user') {
            window.location.href = 'login.html';
        }
        document.getElementById('userName').innerText = localStorage.getItem('username') || 'User';
    })();

    document.getElementById('logoutBtn').onclick = () => {
        localStorage.clear();
        window.location.href = 'login.html';
    };

    // ==================== SIDEBAR NAVIGATION ====================
    function loadPage(page) {
        document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
        document.getElementById(`page-${page}`).classList.remove('hidden');
        
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`.sidebar-item[data-page="${page}"]`).classList.add('active');
        
        // Tutup sidebar di mobile setelah klik
        closeSidebar();
        
        if (page === 'dashboard') loadDashboard();
        if (page === 'belajar') loadBelajarPage();
        if (page === 'ujian') loadUjianPage();
        if (page === 'sertifikat') checkSertifikatEligibility();
        if (page === 'riwayat') loadSertifikatSaya();
        if (page === 'pengaturan') loadProfileData();
    }

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => loadPage(item.dataset.page));
    });

    // ==================== DASHBOARD ====================
    async function loadDashboard() {
        try {
            const token = localStorage.getItem('token');
            const [progressRes, materiRes, sertifikatRes] = await Promise.all([
                fetch(`${API_URL}/user/progress`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/user/materis`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/user/my-certificates`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            const progress = await progressRes.json();
            const materi = await materiRes.json();
            const sertifikat = await sertifikatRes.json();
            
            if (progress.success) {
                const persen = progress.data.rata_rata || 0;
                document.getElementById('progressBar').style.width = `${persen}%`;
                document.getElementById('babLulus').innerHTML = `${progress.data.bab_lulus}/${progress.data.total_bab}`;
                if (progress.data.eligible_for_certificate) {
                    document.getElementById('progressText').innerHTML = '🎉 Selamat! Anda siap mengikuti ujian sertifikat!';
                }
            }
            document.getElementById('totalMateri').innerText = materi.success ? materi.data.length : 0;
            document.getElementById('sertifikatCount').innerText = sertifikat.success ? sertifikat.data.length : 0;
        } catch(e) { console.error(e); }
    }

    // ==================== BELAJAR PAGE ====================
    async function loadBelajarPage() {
        const container = document.getElementById('babList');
        container.innerHTML = '<div class="text-center py-8"><div class="loading"></div><p>Loading bab...</p></div>';
        
        try {
            const token = localStorage.getItem('token');
            const [babsRes, materisRes] = await Promise.all([
                fetch(`${API_URL}/user/babs`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/user/materis`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            const babs = await babsRes.json();
            const materis = await materisRes.json();
            
            if (babs.success) {
                allBabs = babs.data;
                allMateris = materis.success ? materis.data : [];
                
                const materiByBab = {};
                allMateris.forEach(m => {
                    if (!materiByBab[m.bab_id]) materiByBab[m.bab_id] = [];
                    materiByBab[m.bab_id].push(m);
                });
                
                container.innerHTML = allBabs.map(bab => {
                    const babMateris = materiByBab[bab.id] || [];
                    const materiCount = babMateris.length;
                    
                    return `
                        <div class="card">
                            <div class="flex justify-between items-center cursor-pointer" onclick="toggleBab(${bab.id})">
                                <div class="flex items-center gap-3">
                                    <i class="fas fa-layer-group text-xl text-green-500"></i>
                                    <h3 class="text-lg md:text-xl font-bold">${escapeHtml(bab.nama)}</h3>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="badge badge-info text-xs">${materiCount} Materi</span>
                                    <i id="icon-bab-${bab.id}" class="fas fa-chevron-down transition-transform"></i>
                                </div>
                            </div>
                            <p class="text-sm text-gray-400 mt-2">${escapeHtml(bab.deskripsi || '')}</p>
                            <div id="materi-bab-${bab.id}" class="hidden mt-4 space-y-2">
                                ${babMateris.length > 0 ? babMateris.map(m => `
                                    <div class="materi-item" onclick="event.stopPropagation(); openBelajarModal(${m.id})">
                                        <div class="flex items-start gap-3">
                                            <i class="fas fa-book-open text-green-500 mt-1"></i>
                                            <div class="flex-1">
                                                <h4 class="font-bold text-sm md:text-base">${escapeHtml(m.judul)}</h4>
                                                <p class="text-xs text-gray-400">${escapeHtml(m.deskripsi || '')}</p>
                                                <div class="flex flex-wrap gap-2 mt-2 text-xs">
                                                    ${m.file_video ? '<span class="text-blue-400"><i class="fas fa-video"></i> Video</span>' : ''}
                                                    ${m.file_audio ? '<span class="text-purple-400"><i class="fas fa-headphones"></i> Audio</span>' : ''}
                                                    ${m.file_gambar ? '<span class="text-green-400"><i class="fas fa-image"></i> Gambar</span>' : ''}
                                                    ${m.file_pdf ? '<span class="text-yellow-400"><i class="fas fa-file-pdf"></i> PDF</span>' : ''}
                                                </div>
                                            </div>
                                            <i class="fas fa-chevron-right text-gray-500 text-sm"></i>
                                        </div>
                                    </div>
                                `).join('') : '<p class="text-gray-500 text-center py-4 text-sm">Belum ada materi untuk bab ini</p>'}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch(e) { console.error(e); }
    }

    function toggleBab(babId) {
        const materiDiv = document.getElementById(`materi-bab-${babId}`);
        const icon = document.getElementById(`icon-bab-${babId}`);
        if (materiDiv.classList.contains('hidden')) {
            materiDiv.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
        } else {
            materiDiv.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    }

    // ==================== MODAL BELAJAR MATERI ====================
    async function openBelajarModal(materiId) {
        showLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/materi/detail/${materiId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            showLoading(false);
            
            if (result.success) {
                const m = result.data;
                const modal = document.getElementById('belajarModal');
                const title = document.getElementById('belajarTitle');
                const content = document.getElementById('belajarContent');
                
                title.innerText = m.judul;
                content.innerHTML = `
                    <div class="space-y-4">
                        <p class="text-gray-400">${escapeHtml(m.deskripsi || '')}</p>
                        
                        ${m.file_video ? `
                            <div>
                                <label class="block text-sm font-bold mb-2">🎬 Video Materi</label>
                                <video controls class="w-full rounded-lg">
                                    <source src="http://localhost:5000${m.file_video}" type="video/mp4">
                                    Browser tidak mendukung video.
                                </video>
                            </div>
                        ` : ''}
                        
                        ${m.file_audio ? `
                            <div>
                                <label class="block text-sm font-bold mb-2"><i class="fas fa-music mr-2"></i>Audio Materi</label>
                                <audio controls class="w-full">
                                    <source src="http://localhost:5000${m.file_audio}">
                                </audio>
                            </div>
                        ` : ''}
                        
                        ${m.file_gambar ? `
                            <div>
                                <img src="http://localhost:5000${m.file_gambar}" alt="${escapeHtml(m.judul)}" class="rounded-lg">
                            </div>
                        ` : ''}
                        
                        ${m.file_pdf ? `
                            <div>
                                <a href="http://localhost:5000${m.file_pdf}" target="_blank" class="btn-primary inline-block text-sm">
                                    <i class="fas fa-file-pdf"></i> Buka PDF Materi
                                </a>
                            </div>
                        ` : ''}
                        
                        <div>
                            <h3 class="text-lg font-bold mt-4"><i class="fas fa-book-open mr-2"></i>Konten Materi</h3>
                            <div class="bg-black/30 p-4 rounded-lg whitespace-pre-wrap text-sm">${escapeHtml(m.konten)}</div>
                        </div>
                    </div>
                `;
                modal.classList.add('active');
            }
        } catch(e) {
            showLoading(false);
            alert('Gagal memuat materi');
        }
    }

    function closeBelajarModal() {
        document.getElementById('belajarModal').classList.remove('active');
    }

    // ==================== UJIAN PER BAB ====================
    async function loadUjianPage() {
        const container = document.getElementById('ujianBabList');
        container.innerHTML = '<div class="text-center py-8"><div class="loading"></div><p>Loading...</p></div>';
        
        try {
            const token = localStorage.getItem('token');
            const [babsRes, progressRes] = await Promise.all([
                fetch(`${API_URL}/user/babs`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/user/progress`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            const babs = await babsRes.json();
            const progress = await progressRes.json();
            
            if (babs.success) {
                const progressMap = {};
                if (progress.success) {
                    progress.data.babs.forEach(p => { progressMap[p.id] = p; });
                }
                
                container.innerHTML = babs.data.map(bab => {
                    const nilai = progressMap[bab.id]?.nilai || 0;
                    const isLulus = progressMap[bab.id]?.is_lulus || false;
                    const txHash = progressMap[bab.id]?.transaction_hash;
                    return `
                        <div class="card">
                            <div class="flex justify-between items-start mb-3">
                                <h3 class="text-base md:text-lg font-bold">${escapeHtml(bab.nama)}</h3>
                                <span class="badge ${isLulus ? 'badge-success' : 'badge-warning'} text-xs">
                                    ${isLulus ? `<i class="fas fa-check-circle"></i> Lulus (${nilai}%)` : nilai > 0 ? `${nilai}%` : 'Belum'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-400 mb-4">${escapeHtml(bab.deskripsi || '')}</p>
                            ${isLulus && txHash ? `
                                <div class="mb-4 p-2 bg-green-900/20 border border-green-800 rounded">
                                    <p class="text-xs text-green-400 mb-1"><i class="fas fa-link mr-1"></i>Tercatat di Blockchain</p>
                                    <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" class="text-xs text-blue-400 hover:underline break-all">
                                        ${txHash.substring(0, 15)}...${txHash.substring(txHash.length - 10)}
                                    </a>
                                </div>
                            ` : ''}
                            
                            <div class="mb-3 p-2 bg-yellow-900/20 border border-yellow-800 rounded text-xs text-yellow-300 text-left flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5"></i> 
                                <span><b>Syarat Lulus:</b> Nilai ujian minimal <b>80</b>. Di bawah 80 dinyatakan Belum Lulus.</span>
                            </div>

                            <button onclick="startBabExam(${bab.id}, '${escapeHtml(bab.nama)}')" class="${isLulus ? 'btn-outline' : 'btn-primary'} w-full text-sm">
                                ${isLulus ? 'Ulang Ujian' : 'Mulai Ujian'}
                            </button>
                        </div>
                    `;
                }).join('');
            }
        } catch(e) { console.error(e); }
    }

    // ==================== UJIAN SERTIFIKAT ====================
    async function checkSertifikatEligibility() {
        const container = document.getElementById('sertifikatEligibility');
        container.innerHTML = '<div class="text-center py-8"><div class="loading"></div><p>Memeriksa kelayakan...</p></div>';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/certificate-eligibility`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            
            if (result.eligible) {
                container.innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-check-circle text-5xl md:text-6xl text-green-500 mb-4"></i>
                        <h3 class="text-xl md:text-2xl font-bold mb-2">Selamat!</h3>
                        <p class="mb-4 text-sm">Anda telah menyelesaikan semua ujian bab dengan nilai minimal 80%.</p>
                        
                        <div class="mb-5 mx-auto max-w-sm p-3 bg-yellow-900/20 border border-yellow-800 rounded text-sm text-yellow-300 text-left flex items-start gap-2">
                            <i class="fas fa-info-circle mt-1"></i> 
                            <span><b>Syarat Lulus Sertifikat:</b> Nilai akhir minimal <b>80</b>. Di bawah 80 dinyatakan Belum Lulus.</span>
                        </div>

                        <button onclick="startCertificateExam()" class="btn-primary px-6 md:px-8 py-3">
                            Mulai Ujian Sertifikat
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-lock text-5xl md:text-6xl text-gray-500 mb-4"></i>
                        <h3 class="text-xl md:text-2xl font-bold mb-2">Belum Tersedia</h3>
                        <p class="mb-2 text-sm">Anda harus menyelesaikan semua ujian bab terlebih dahulu.</p>
                        <p class="text-sm text-gray-400">Progress: ${result.bab_lulus}/${result.total_bab} bab lulus</p>
                        <button onclick="loadPage('ujian')" class="btn-outline mt-4 text-sm">
                            Kembali ke Ujian Bab
                        </button>
                    </div>
                `;
            }
        } catch(e) { console.error(e); }
    }

    // ==================== FUNGSI UJIAN ====================
    async function startBabExam(babId, babNama) {
        showLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/start-bab-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ bab_id: babId })
            });
            const result = await response.json();
            showLoading(false);
            
            if (result.success) {
                // Simpan bab_id & bab_nama untuk keperluan blockchain recording
                currentBabExam = { ...result, bab_id: babId, bab_nama: babNama };
                showExamModal(`Ujian Bab: ${babNama}`, result.soal, 'bab');
            } else {
                alert(result.message);
            }
        } catch(e) { showLoading(false); alert('Gagal memulai ujian'); }
    }

    async function startCertificateExam() {
        showLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/start-certificate-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({})
            });
            const result = await response.json();
            showLoading(false);
            
            if (result.success) {
                currentCertExam = result;
                showExamModal('Ujian Sertifikat Tajwid', result.soal, 'sertifikat');
            } else {
                alert(result.message);
            }
        } catch(e) { showLoading(false); alert('Gagal memulai ujian sertifikat'); }
    }

    // ==================== EXAM STATE ====================
    let examSoalList = [];   // Array soal dari backend
    let examCurrentIdx = 0;  // Index soal yang sedang ditampilkan
    let examType = 'bab';    // 'bab' atau 'sertifikat'
    let examAnswers = {};    // { soalId: 'A'|'B'|'C'|'D'|'E' }
    let examTimerInterval = null;

    function startExamTimer(durationSeconds) {
        clearInterval(examTimerInterval);
        const timerEl = document.getElementById('examTimer');
        timerEl.classList.remove('hidden');
        
        let remaining = durationSeconds;
        
        function updateDisplay() {
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            
            if (remaining <= 60) {
                timerEl.classList.remove('text-yellow-400', 'border-yellow-500/30');
                timerEl.classList.add('text-red-500', 'border-red-500/50');
            } else {
                timerEl.classList.remove('text-red-500', 'border-red-500/50');
                timerEl.classList.add('text-yellow-400', 'border-yellow-500/30');
            }
        }
        
        updateDisplay();
        
        examTimerInterval = setInterval(() => {
            remaining--;
            updateDisplay();
            if (remaining <= 0) {
                clearInterval(examTimerInterval);
                alert('Waktu ujian habis! Jawaban Anda akan disubmit secara otomatis.');
                submitExam(examType, true);
            }
        }, 1000);
    }

    function showExamModal(title, soal, type) {
        examSoalList = soal;
        examCurrentIdx = 0;
        examType = type;
        examAnswers = {};

        const modal = document.getElementById('examModal');
        document.getElementById('examTitle').innerText = title;

        // Note: Tombol close di-hilangkan dari UI. Jika butuh escape, gunakan devtools.

        if (type === 'bab') {
            startExamTimer(10 * 60); // 10 menit
        } else {
            clearInterval(examTimerInterval);
            document.getElementById('examTimer').classList.add('hidden');
        }

        // Render nomor navigasi
        renderExamNav();
        // Render soal pertama
        renderCurrentSoal();

        modal.classList.add('active');

        const submitBtn = document.getElementById('submitExamBtn');
        submitBtn.onclick = () => submitExam(type);
    }

    function renderExamNav() {
        const navContainer = document.getElementById('examNavNumbers');
        navContainer.innerHTML = examSoalList.map((s, idx) => {
            const isActive = idx === examCurrentIdx ? 'active' : '';
            const isAnswered = examAnswers[s.id] ? 'answered' : '';
            return `<button class="exam-nav-btn ${isActive} ${isAnswered}" 
                            onclick="goToSoal(${idx})" 
                            id="nav-btn-${idx}">${idx + 1}</button>`;
        }).join('');
    }

    function renderCurrentSoal() {
        const container = document.getElementById('examQuestions');
        const s = examSoalList[examCurrentIdx];
        const idx = examCurrentIdx;
        const savedAnswer = examAnswers[s.id] || null;

        // Update progress text
        document.getElementById('examProgressText').innerHTML = 
            `Soal <strong>${idx + 1}</strong> dari <strong>${examSoalList.length}</strong> — Poin: <strong>${s.poin}</strong>`;

        // Render soal
        container.innerHTML = `
            <div class="bg-black/40 p-5 rounded-xl" id="soal-block-${s.id}">
                <p class="mb-4 text-base leading-relaxed">${escapeHtml(s.pertanyaan)}</p>
                <div class="space-y-3">
                    ${Object.entries(s.pilihan || {}).filter(([k, v]) => v).map(([key, val]) => {
                        const isSelected = savedAnswer === key;
                        return `
                            <label class="exam-pilihan-label ${isSelected ? 'selected' : ''}" 
                                   onclick="selectPilihan(this, '${s.id}', '${key}')">
                                <input type="radio" name="jawaban_${s.id}" value="${key}" 
                                       ${isSelected ? 'checked' : ''}>
                                <span class="flex-1 text-sm">
                                    <span class="font-bold text-green-400 mr-1">${key}.</span> ${escapeHtml(val)}
                                </span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // Update navigasi & tombol
        renderExamNav();
        updateNavButtons();
    }

    function updateNavButtons() {
        const prevBtn = document.getElementById('btnPrevSoal');
        const nextBtn = document.getElementById('btnNextSoal');
        prevBtn.disabled = examCurrentIdx === 0;
        nextBtn.disabled = examCurrentIdx === examSoalList.length - 1;
    }

    function goToSoal(idx) {
        if (idx < 0 || idx >= examSoalList.length) return;
        examCurrentIdx = idx;
        renderCurrentSoal();
    }

    function nextSoal() {
        if (examCurrentIdx < examSoalList.length - 1) {
            examCurrentIdx++;
            renderCurrentSoal();
        }
    }

    function prevSoal() {
        if (examCurrentIdx > 0) {
            examCurrentIdx--;
            renderCurrentSoal();
        }
    }

    function selectPilihan(label, soalId, key) {
        // Simpan jawaban
        examAnswers[soalId] = key;

        // Hapus highlight sebelumnya
        const block = document.getElementById(`soal-block-${soalId}`);
        block.querySelectorAll('.exam-pilihan-label').forEach(l => {
            l.classList.remove('selected');
        });
        // Highlight pilihan aktif
        label.classList.add('selected');

        // Update navigasi nomor (tandai sudah dijawab)
        renderExamNav();
    }

    async function submitExam(type, isAutoSubmit = false) {
        const exam = type === 'bab' ? currentBabExam : currentCertExam;

        if (!exam || !exam.soal) {
            alert('Data ujian tidak ditemukan. Silakan mulai ulang ujian.');
            return;
        }

        // Build jawaban dari examAnswers state
        const jawaban = [];
        let belumDijawab = 0;
        exam.soal.forEach(soal => {
            const answer = examAnswers[soal.id] || '';
            if (answer) {
                jawaban.push({ soal_id: soal.id, jawaban_user: answer });
            } else {
                belumDijawab++;
                jawaban.push({ soal_id: soal.id, jawaban_user: '' });
            }
        });

        if (!isAutoSubmit) {
            if (belumDijawab > 0) {
                if (!confirm(`Ada ${belumDijawab} soal yang belum dijawab. Tetap kumpulkan?`)) return;
            }
            if (!confirm('Yakin ingin mengumpulkan jawaban?')) return;
        }
        
        clearInterval(examTimerInterval);
        showLoading(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = type === 'bab' ? '/user/submit-bab-exam' : '/user/submit-certificate-exam';
            
            console.log('Submitting exam:', { session_id: exam.session_id, jawaban_count: jawaban.length });
            
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    session_id: exam.session_id,
                    session_token: exam.session_token,
                    jawaban: jawaban
                })
            });
            
            const responseText = await response.text();
            console.log('Server response:', response.status, responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (jsonErr) {
                showLoading(false);
                alert('Server mengembalikan respons tidak valid: ' + responseText.substring(0, 200));
                return;
            }
            
            showLoading(false);
            document.getElementById('examModal').classList.remove('active');
            
            if (type === 'bab' && result.is_lulus) {
                const web3Modal = document.getElementById('blockchainProcessModal');
                const pBar = document.getElementById('blockchainProgressBar');
                const pStatus = document.getElementById('blockchainProcessStatus');
                const pHash = document.getElementById('blockchainHashVisual');
                
                web3Modal.classList.add('active');
                pBar.style.width = '20%';
                pStatus.textContent = 'Encrypting Score Data...';
                pStatus.className = 'text-green-400 mb-6 font-mono text-sm';
                pHash.textContent = '0x...';
                
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    pBar.style.width = '40%';
                    pStatus.textContent = 'Connecting to Ethereum Sepolia Network...';
                    
                    const triggerRes = await fetch(`${API_URL}/user/trigger-blockchain-record`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ session_id: result.session_id, type: 'bab' })
                    });
                    const triggerData = await triggerRes.json();
                    
                    pBar.style.width = '80%';
                    pStatus.textContent = 'Generating Transaction Hash...';
                    await new Promise(r => setTimeout(r, 800));
                    
                    if (triggerData.success && triggerData.txHash) {
                        result.blockchain_tx = triggerData.txHash;
                        pHash.textContent = triggerData.txHash.substring(0, 15) + '...';
                        pBar.style.width = '100%';
                        pStatus.textContent = 'Block Confirmed! Securing Complete.';
                        pStatus.className = 'text-green-400 mb-6 font-mono text-sm font-bold';
                    } else {
                        pBar.style.width = '100%';
                        pStatus.textContent = 'Score secured locally (Blockchain skipped).';
                        pStatus.className = 'text-yellow-400 mb-6 font-mono text-sm';
                    }
                    
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) {
                    console.error('Trigger blockchain error:', e);
                } finally {
                    web3Modal.classList.remove('active');
                }
            }
            
            showResultModal(result);

            if (type === 'bab') {
                loadUjianPage();
                loadDashboard();
            }
            if (type === 'sertifikat' && result.is_lulus) showPaymentModal();
        } catch(e) {
            console.error('Submit exam error:', e);
            showLoading(false);
            alert('Gagal submit ujian: ' + (e.message || e));
        }
    }

    // ==================== PEMBAYARAN ====================
    function showPaymentModal() { document.getElementById('paymentModal').classList.add('active'); }
    
    document.getElementById('uploadPaymentBtn')?.addEventListener('click', async () => {
        const file = document.getElementById('paymentProof').files[0];
        if (!file) { alert('Silakan upload bukti pembayaran'); return; }
        
        const formData = new FormData();
        formData.append('payment_proof', file);
        formData.append('amount', 20000);
        
        showLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/payment/upload-proof`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();
            showLoading(false);
            if (result.success) {
                alert('Bukti pembayaran berhasil diupload!');
                document.getElementById('paymentModal').classList.remove('active');
            } else { alert(result.message); }
        } catch(e) { showLoading(false); alert('Gagal upload bukti pembayaran'); }
    });

    // ==================== SERTIFIKAT SAYA ====================
    async function loadSertifikatSaya() {
        const container = document.getElementById('sertifikatList');
        container.innerHTML = '<div class="text-center py-8"><div class="loading"></div><p>Loading...</p></div>';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/my-certificates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                container.innerHTML = result.data.map(cert => `
                    <div class="certificate-card bg-black/60 border-2 border-neon-gold/40 p-6 md:p-8 rounded-xl relative overflow-hidden shadow-[0_0_25px_rgba(255,215,0,0.15)] flex flex-col md:flex-row gap-6 items-center">
                        <!-- Glowing background elements -->
                        <div class="absolute top-0 right-0 w-32 h-32 bg-neon-gold/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div class="absolute bottom-0 left-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl -ml-10 -mb-10"></div>
                        
                        <!-- Certificate Main Info -->
                        <div class="flex-1 w-full text-left">
                            <div class="flex items-center gap-3 mb-4">
                                <i class="fas fa-certificate text-4xl md:text-5xl text-neon-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]"></i>
                                <div>
                                    <h4 class="text-xl md:text-2xl font-bold font-orbitron text-white tracking-wider uppercase">Sertifikat Kelulusan</h4>
                                    <p class="text-xs text-neon-gold tracking-widest mt-0.5">TAJWID LEARNING - AL FIRQOH AN-NAJIYAH</p>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-gray-700/50 py-4 my-4">
                                <div>
                                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                                    <p class="font-bold text-base md:text-lg text-white">${escapeHtml(cert.nama_lengkap || 'Tidak Diketahui')}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nomor Peserta</p>
                                    <p class="font-bold text-neon-gold font-mono">${escapeHtml(cert.nomor_peserta || 'Masa Tunggu')}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nilai Ujian</p>
                                    <p class="font-bold text-neon-green text-base md:text-lg">${cert.nilai ? cert.nilai + '%' : '-'}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Tanggal Kelulusan</p>
                                    <p class="font-bold text-white text-sm md:text-base">${new Date(cert.issued_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                </div>
                            </div>

                            <div class="flex flex-wrap gap-2 items-center text-xs mt-3">
                                <span class="px-3 py-1 bg-green-950/40 text-neon-green border border-neon-green/30 rounded-full font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,255,136,0.1)]">
                                    <span class="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse"></span>
                                    TERVERIFIKASI BLOCKCHAIN
                                </span>
                                <span class="text-gray-500 font-mono">ID: #${cert.blockchain_id !== null ? cert.blockchain_id : cert.id}</span>
                            </div>

                            <!-- Download Certificate Button -->
                            <div class="mt-4 pt-4 border-t border-gray-700/50">
                                <button onclick="downloadCertificateImage('${escapeHtml(cert.nama_lengkap || 'Siswa')}', '${escapeHtml(cert.nomor_peserta || '-')}', '${cert.nilai || '-'}', '${cert.issued_at}', '${cert.transaction_hash || ''}', '${cert.blockchain_id !== null ? cert.blockchain_id : cert.id}')" 
                                    class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-bold text-sm tracking-wider transition-all duration-300"
                                    style="background:linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05)); border:1.5px solid rgba(212,175,55,0.4); color:#d4af37;"
                                    onmouseover="this.style.background='linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))'; this.style.boxShadow='0 0 20px rgba(212,175,55,0.2)'; this.style.transform='translateY(-1px)';"
                                    onmouseout="this.style.background='linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'; this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                                    <i class="fas fa-download"></i>
                                    <span>Download Sertifikat (PNG)</span>
                                </button>
                            </div>
                        </div>

                        <!-- QR Code Section -->
                        <div class="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-neon-gold/20 backdrop-blur-sm shadow-[0_0_15px_rgba(255,215,0,0.05)] w-full md:w-auto">
                            <div class="relative bg-white p-2 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://sepolia.etherscan.io/tx/' + cert.transaction_hash)}&color=05070a&bgcolor=ffffff" 
                                     alt="QR Code Verifikasi" 
                                     class="w-28 h-28" />
                            </div>
                            <p class="text-[10px] text-neon-gold tracking-widest uppercase mt-3 font-semibold text-center">Scan to Verify</p>
                            <a href="https://sepolia.etherscan.io/tx/${cert.transaction_hash}" target="_blank" 
                               class="mt-2 text-neon-blue text-xs hover:underline flex items-center gap-1.5 transition-all hover:drop-shadow-[0_0_6px_rgba(0,242,255,0.6)]">
                                <i class="fas fa-external-link-alt text-[10px]"></i> Lihat Transaksi
                            </a>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `<div class="card text-center"><i class="fas fa-box-open text-4xl md:text-5xl text-gray-500 mb-3"></i><p>Belum ada sertifikat</p><p class="text-xs text-gray-500 mt-1">Selesaikan ujian sertifikat dan lakukan pembayaran.</p></div>`;
            }
        } catch(e) { container.innerHTML = '<div class="card text-center text-red-400">Gagal memuat sertifikat</div>'; }
    }

    // ==================== HELPER ====================
    function showResultModal(result) {
        const modal = document.getElementById('resultModal');
        const container = document.getElementById('resultContent');

        // Handle error response
        if (!result.success) {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-times-circle text-5xl md:text-6xl text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"></i>
                    <h3 class="text-xl md:text-2xl font-bold text-red-500 mb-2">Gagal Submit</h3>
                    <p class="text-sm text-gray-300 mb-4">${escapeHtml(result.message || 'Terjadi kesalahan saat mengirim jawaban.')}</p>
                </div>
            `;
            modal.classList.add('active');
            return;
        }

        const isLulus = result.is_lulus;
        const nilaiPersen = result.persentase !== undefined ? result.persentase : 0;
        const jumlahSoal = result.jumlah_soal || 0;
        const jumlahBenar = result.jumlah_benar || 0;
        const jumlahSalah = result.jumlah_salah || 0;
        const blockchainTx = result.blockchain_tx || null;
        
        let blockchainHtml = '';
        if (blockchainTx) {
            blockchainHtml = `
                <div style="margin-top: 16px; padding: 12px; background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 8px;">
                    <p style="font-size: 12px; color: #00ff88; margin-bottom: 4px;"><i class="fas fa-link"></i> Tercatat di Blockchain Sepolia</p>
                    <a href="https://sepolia.etherscan.io/tx/${blockchainTx}" target="_blank" 
                       style="font-size: 11px; color: #4fc3f7; word-break: break-all; text-decoration: underline;">
                        ${blockchainTx.substring(0, 20)}...${blockchainTx.substring(blockchainTx.length - 10)}
                    </a>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="text-center">
                <i class="fas ${isLulus ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'} text-5xl md:text-6xl mb-4"></i>
                <h3 class="text-xl md:text-2xl font-bold ${isLulus ? 'text-green-500' : 'text-red-500'} mb-2">
                    ${isLulus ? 'SELAMAT! ANDA LULUS' : 'BELUM LULUS'}
                </h3>
                
                <div style="display: flex; justify-content: center; gap: 24px; margin: 16px 0;">
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: ${isLulus ? '#00ff88' : '#ff4757'};">${nilaiPersen}%</div>
                        <div style="font-size: 12px; color: #999;">Nilai</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #00ff88;">${jumlahBenar}</div>
                        <div style="font-size: 12px; color: #999;">Benar</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #ff4757;">${jumlahSalah}</div>
                        <div style="font-size: 12px; color: #999;">Salah</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #4fc3f7;">${jumlahSoal}</div>
                        <div style="font-size: 12px; color: #999;">Total Soal</div>
                    </div>
                </div>
                
                <div class="w-full bg-gray-700 rounded-full h-3 mb-4" style="margin: 12px 0;">
                    <div class="${isLulus ? 'bg-green-500' : 'bg-red-500'} h-3 rounded-full transition-all duration-500" style="width: ${nilaiPersen}%"></div>
                </div>
                
                <p style="font-size: 13px; color: #999; margin-bottom: 8px;">Batas kelulusan: 80%</p>
                <p class="text-sm text-gray-300 mb-4">${escapeHtml(result.message || '')}</p>
                
                <div style="font-size: 12px; color: #666;">
                    Poin: ${result.total_nilai || 0} / ${result.total_maksimal || 0}
                </div>
                
                ${blockchainHtml}
            </div>
        `;
        modal.classList.add('active');
    }

    function closeResultModal() { document.getElementById('resultModal').classList.remove('active'); }
    function showLoading(show) { document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none'; }
    
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m);
    }

    // Close modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal').classList.remove('active'));
    });

    // Mencegah user reload/keluar saat ujian berlangsung
    window.addEventListener('beforeunload', function (e) {
        if (document.getElementById('examModal').classList.contains('active')) {
            e.preventDefault();
            e.returnValue = ''; // Browser akan menampilkan peringatan default
        }
    });

    // ==================== PENGATURAN PROFIL ====================
    // Tab switching
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById('profile-tab-' + btn.dataset.tab).classList.remove('hidden');
        });
    });

    async function loadProfileData() {
        try {
            const token = localStorage.getItem('token');
            const savedUsername = localStorage.getItem('username');
            if (savedUsername) document.getElementById('edit_username').value = savedUsername;

            const response = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                const user = result.data;

                // Isi tab Lihat Profil
                document.getElementById('view_nama').textContent = user.nama_lengkap || user.username || '-';
                document.getElementById('view_nomor_peserta').textContent = 'Nomor Peserta: ' + (user.nomor_peserta || 'Belum Tersedia');
                document.getElementById('view_username').textContent = user.username || '-';
                document.getElementById('view_email').textContent = user.email || '-';
                document.getElementById('view_no_hp').textContent = user.no_hp || '-';
                document.getElementById('view_jenis_kelamin').textContent = user.jenis_kelamin || '-';
                document.getElementById('view_kota').textContent = user.kota || '-';
                document.getElementById('view_instansi').textContent = user.instansi || '-';
                document.getElementById('view_wallet_address').textContent = user.wallet_address || 'Belum diatur';

                // Avatar Lihat Profil
                const viewImg = document.getElementById('viewAvatar');
                const viewIcon = document.getElementById('viewAvatarIcon');
                if (user.foto_profil && viewImg) {
                    viewImg.src = 'http://localhost:5000' + user.foto_profil;
                    viewImg.classList.remove('hidden');
                    if (viewIcon) viewIcon.classList.add('hidden');
                }

                // Isi tab Edit Profil
                document.getElementById('edit_username').value = user.username || savedUsername || '';
                document.getElementById('edit_wallet_address').value = user.wallet_address || '';
                document.getElementById('edit_nomor_peserta').value = user.nomor_peserta || 'Belum Tersedia';
                document.getElementById('edit_nama_lengkap').value = user.nama_lengkap || '';
                document.getElementById('edit_jenis_kelamin').value = user.jenis_kelamin || '';
                document.getElementById('edit_no_hp').value = user.no_hp || '';
                document.getElementById('edit_instansi').value = user.instansi || '';
                document.getElementById('edit_kota').value = user.kota || '';

                // Avatar Edit Profil
                const img = document.getElementById('profilePreview');
                const icon = document.getElementById('profileAvatarIcon');
                if (user.foto_profil && img) {
                    img.src = 'http://localhost:5000' + user.foto_profil;
                    img.classList.remove('hidden');
                    if (icon) icon.classList.add('hidden');
                } else {
                    if (img) img.classList.add('hidden');
                    if (icon) icon.classList.remove('hidden');
                }
            } else {
                const msgDiv = document.getElementById('profileMessage');
                if (msgDiv) {
                    msgDiv.classList.remove('hidden');
                    msgDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500';
                    msgDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i> Gagal memuat profil. Pastikan server sudah berjalan.';
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        }
    }

    function previewProfileImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('profilePreview');
                const icon = document.getElementById('profileAvatarIcon');
                if (img) { img.src = e.target.result; img.classList.remove('hidden'); }
                if (icon) icon.classList.add('hidden');
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    // Profile Edit form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageDiv = document.getElementById('profileMessage');
            messageDiv.classList.remove('hidden');
            messageDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-yellow-900/50 text-yellow-400 border border-yellow-500';
            messageDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...';

            const formData = new FormData(profileForm);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    messageDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-green-900/50 text-green-400 border border-green-500';
                    messageDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i> ' + result.message;
                    await loadProfileData();
                } else {
                    messageDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500';
                    messageDiv.innerHTML = '<i class="fas fa-times-circle mr-2"></i> ' + result.message;
                }
            } catch (err) {
                messageDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500';
                messageDiv.innerHTML = '<i class="fas fa-wifi mr-2"></i> Gagal terhubung ke server';
            }
        });
    }

    // Password form (tab terpisah)
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('passwordMessage');
            msgDiv.classList.remove('hidden');
            const newPass = document.getElementById('new_password').value;
            const confirmPass = document.getElementById('confirm_password').value;

            if (newPass.length < 6) {
                msgDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500';
                msgDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i> Password minimal 6 karakter!';
                return;
            }
            if (newPass !== confirmPass) {
                msgDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500';
                msgDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i> Konfirmasi password tidak cocok!';
                return;
            }
            msgDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-yellow-900/50 text-yellow-400 border border-yellow-500';
            msgDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...';
            try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('new_password', newPass);
                // Keep existing username/nama so they don't get wiped
                formData.append('username', document.getElementById('edit_username').value || '');
                formData.append('nama_lengkap', document.getElementById('edit_nama_lengkap').value || '');
                const response = await fetch(`${API_URL}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    msgDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-green-900/50 text-green-400 border border-green-500';
                    msgDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Password berhasil diubah!';
                    document.getElementById('new_password').value = '';
                    document.getElementById('confirm_password').value = '';
                } else {
                    msgDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500';
                    msgDiv.innerHTML = '<i class="fas fa-times-circle mr-2"></i> ' + result.message;
                }
            } catch (err) {
                msgDiv.className = 'mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500';
                msgDiv.innerHTML = '<i class="fas fa-wifi mr-2"></i> Gagal terhubung ke server';
            }
        });
    }

    // ==================== DOWNLOAD SERTIFIKAT IMAGE ====================
    async function downloadCertificateImage(nama, nomor, nilai, tanggal, txHash, certId) {
        // Show loading
        showLoading(true);

        try {
            // Populate template
            document.getElementById('cert-nama').textContent = nama;
            document.getElementById('cert-nomor').textContent = nomor;
            document.getElementById('cert-nilai').textContent = nilai + (nilai !== '-' ? '%' : '');
            document.getElementById('cert-tanggal').textContent = new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('cert-id').textContent = 'Certificate ID: #' + certId;

            // QR Code
            const qrData = txHash ? 'https://sepolia.etherscan.io/tx/' + txHash : window.location.origin + '/verify/' + certId;
            document.getElementById('cert-qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrData) + '&color=05070a&bgcolor=ffffff';
            document.getElementById('cert-txhash').textContent = txHash ? 'TX: ' + txHash.substring(0, 20) + '...' : '';

            // Wait for QR code image to load
            const qrImg = document.getElementById('cert-qr');
            await new Promise((resolve, reject) => {
                if (qrImg.complete && qrImg.naturalWidth > 0) {
                    resolve();
                } else {
                    qrImg.onload = resolve;
                    qrImg.onerror = () => resolve(); // Continue even if QR fails
                }
            });

            // Move template to visible area briefly for rendering
            const template = document.getElementById('certDownloadTemplate');
            template.style.left = '0px';
            template.style.opacity = '0';
            template.style.zIndex = '-1';

            // Small delay to ensure rendering
            await new Promise(r => setTimeout(r, 500));

            // Capture with html2canvas
            const certElement = document.getElementById('certCanvas');
            const canvas = await html2canvas(certElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0a0e17',
                width: 1200,
                height: 850,
                logging: false
            });

            // Hide template again
            template.style.left = '-9999px';
            template.style.opacity = '1';

            // Download
            const link = document.createElement('a');
            link.download = `Sertifikat_${nama.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();

            showLoading(false);
        } catch (err) {
            console.error('Error generating certificate image:', err);
            showLoading(false);
            alert('Gagal generate sertifikat. Silakan coba lagi.');
        }
    }

    // Initialize
    loadPage('dashboard');
