const firebaseConfig = {
    apiKey: "AIzaSyA1Kic03h8Y2HWt4zi30VupMRZJ00q0-FE",
    authDomain: "carma-system.firebaseapp.com",
    projectId: "carma-system",
    storageBucket: "carma-system.firebasestorage.app",
    messagingSenderId: "685774442982",
    appId: "1:685774442982:web:74be11ca855e1f78b4c627"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

const ITEM_NAMES = { 'tire': 'สภาพลมและดอกยาง', 'brake': 'ระบบเบรคและผ้าเบรค', 'elec': 'ระบบไฟส่องสว่าง/สัญญาณ', 'water': 'ระดับน้ำหม้อน้ำ/รอยรั่ว', 'oil': 'ระดับและสภาพน้ำมันเครื่อง', 'battery': 'สภาพแบตเตอรี่/ขั้วแบต', 'wiper': 'ที่ปัดน้ำฝน/น้ำฉีดกระจก', 'trans': 'ระดับน้ำมันเกียร์', 'brkfluid': 'ระดับน้ำมันเบรก/คลัตช์', 'belt': 'สภาพสายพานหน้าเครื่อง', 'aircon': 'ระบบความเย็นแอร์รถยนต์', 'susp': 'ช่วงล่างและโช้คอัพ', 'horn': 'การทำงานของเสียงแตร', 'mirror': 'กระจกมองข้าง/หน้าต่าง', 'leak': 'รอยรั่วซึมใต้ท้องรถ' };

let alertModal, detailModal, currentUserName = null, currentEditCheckId = null, selectedRepairImages = [];

document.addEventListener('DOMContentLoaded', async () => {
    if(document.getElementById('alertModal')) alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
    if(document.getElementById('detailModal')) detailModal = new bootstrap.Modal(document.getElementById('detailModal'));

    let currentUser = JSON.parse(sessionStorage.getItem('carma_current_user'));
    if (!currentUser || currentUser.role !== 'staff') { window.location.href = 'index.html'; return; }
    
    currentUserName = `${currentUser.fname} ${currentUser.lname}`;
    document.getElementById('staff-user-name').innerText = currentUserName;
    if(document.getElementById('repair-name')) document.getElementById('repair-name').value = currentUserName;
    
    setupImageUpload(); 
    await showView('staff-dashboard'); 
});

async function loadCarsForStaff() {
    try {
        const [carsSnap, checksSnap] = await Promise.all([
            db.collection('cars').get(),
            db.collection('checks').get()
        ]);
        
        let todayDate = new Date();
        let todayStr = todayDate.toLocaleDateString('th-TH');

        let checkedLicensesToday = new Set();
        
        checksSnap.forEach(doc => {
            let data = doc.data();
            if (!data.license) return;

            let isToday = false;
            if (data.date === todayStr) {
                isToday = true;
            } else if (data.timestamp) {
                let d = new Date(data.timestamp.toMillis());
                if (d.getDate() === todayDate.getDate() && d.getMonth() === todayDate.getMonth() && d.getFullYear() === todayDate.getFullYear()) {
                    isToday = true;
                }
            }

            if (isToday) {
                checkedLicensesToday.add(data.license.trim());
            }
        });

        let uniqueCarsMap = new Map();
        carsSnap.forEach(doc => {
            let car = doc.data();
            if (car.status !== 'ปลดระวาง' && car.status !== 'inactive' && car.license) {
                uniqueCarsMap.set(car.license.trim(), car);
            }
        });

        let checkOptions = '<option value="" selected disabled>-- โปรดเลือกป้ายทะเบียน --</option>';
        let repairOptions = '<option value="" selected disabled>-- โปรดเลือกป้ายทะเบียน --</option>';

        uniqueCarsMap.forEach((car, lic) => {
            let carModel = car.model || car.brand || '-';
            let optionHtml = `<option value="${lic}" data-color="${car.color || '-'}" data-model="${carModel}">${lic} (${carModel})</option>`;
            
            if (!checkedLicensesToday.has(lic)) {
                checkOptions += optionHtml;
            }
            repairOptions += optionHtml; 
        });

        let checkSelect = document.getElementById('check-license');
        let repairSelect = document.getElementById('repair-license');

        if (checkSelect) checkSelect.innerHTML = checkOptions;
        if (repairSelect) repairSelect.innerHTML = repairOptions;

        if (currentEditCheckId && checkSelect) {
            let editDoc = await db.collection('checks').doc(currentEditCheckId).get();
            if (editDoc.exists) {
                let editData = editDoc.data();
                let editLic = editData.license ? editData.license.trim() : '';
                if (editLic && !checkSelect.innerHTML.includes(`value="${editLic}"`)) {
                    checkSelect.innerHTML += `<option value="${editLic}" data-color="${editData.color || '-'}">${editLic} (ดึงข้อมูลเพื่อแก้ไข)</option>`;
                }
            }
        }
    } catch (e) { console.error('โหลดข้อมูลรถล้มเหลว', e); }
}

document.addEventListener('change', function(e) {
    if(e.target && e.target.id === 'check-license') {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if(document.getElementById('check-color')) document.getElementById('check-color').value = selectedOption.getAttribute('data-color') || '';
    }
    if(e.target && e.target.id === 'repair-license') {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if(document.getElementById('repair-model')) document.getElementById('repair-model').value = selectedOption.getAttribute('data-model') || '';
    }
});

async function showView(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => link.classList.remove('active'));
    let content = document.getElementById(section + '-content');
    if(content) {
        content.style.display = 'block'; document.getElementById(section + '-menu').classList.add('active');
        
        if(section === 'staff-dashboard') await loadStaffDashboard(); 
        if(section === 'staff-check') {
            loadStaffCheckItems(); 
            await loadCarsForStaff(); 
        }
        if(section === 'staff-status') await loadStaffStatusTable();
        if(section === 'staff-repair') await loadCarsForStaff(); 
        
        let titles = {
            'staff-dashboard':{t:'หน้าแรก (แดชบอร์ดส่วนตัว)',d:`สรุปสถิติการทำงานของ: ${currentUserName}`,i:'fa-user'}, 
            'staff-check':{t:'บันทึกตรวจเช็ค',d:'ตรวจสอบรายการ 15 ข้อ',i:'fa-clipboard-check'},
            'staff-repair':{t:'แจ้งซ่อม',d:'ขออนุมัติซ่อม',i:'fa-tools'},
            'staff-status':{t:'สถานะงานของฉัน',d:'ติดตามการทำงานของคุณ',i:'fa-history'}
        };
        if(titles[section]) {
            document.getElementById('staff-content-title').innerText = titles[section].t; 
            document.getElementById('staff-content-desc').innerText = titles[section].d; 
            document.getElementById('staff-header-icon').className = 'fas ' + titles[section].i;
        }
    }
}

async function loadStaffDashboard() {
    try {
        let repairsSnap = await db.collection('repairs').where('name', '==', currentUserName).get();
        let checksSnap = await db.collection('checks').where('staff', '==', currentUserName).get();
        let totalRepairs = repairsSnap.size, totalChecks = checksSnap.size, pendingRepairs = 0;
        repairsSnap.forEach(doc => { if(doc.data().status === 'pending') pendingRepairs++; });
        document.getElementById('dash-staff-checks').innerHTML = `${totalChecks} <small class="fs-6 fw-normal">ครั้ง</small>`;
        document.getElementById('dash-staff-repairs').innerHTML = `${totalRepairs} <small class="fs-6 fw-normal">รายการ</small>`;
        document.getElementById('dash-staff-pending').innerHTML = `${pendingRepairs} <small class="fs-6 fw-normal">รายการ</small>`;
    } catch(e) { console.error("Error loading dashboard", e); }
}

function setupImageUpload() {
    let imageInput = document.getElementById('repair-image'); let addImageBtn = document.getElementById('add-image-btn');
    if (imageInput && addImageBtn) {
        addImageBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => { if (file.size > 5 * 1024 * 1024) { showAlert('error', 'ไฟล์ใหญ่เกินไป', `ไฟล์ ${file.name} เกิน 5MB`); return; } selectedRepairImages.push(file); });
            updateImageUI(); imageInput.value = '';
        });
    }
}

function updateImageUI() {
    let previewContainer = document.getElementById('image-preview-container'); let counter = document.getElementById('image-counter'); let addImageBtn = document.getElementById('add-image-btn');
    document.querySelectorAll('.preview-item').forEach(el => el.remove());
    selectedRepairImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const div = document.createElement('div'); div.className = 'preview-item';
            div.innerHTML = `<img src="${event.target.result}"><button type="button" class="remove-img-btn" onclick="removeRepairImage(${index})"><i class="fas fa-times"></i></button>`;
            previewContainer.insertBefore(div, addImageBtn);
        }
        reader.readAsDataURL(file);
    });
    if(counter) counter.innerText = `${selectedRepairImages.length} รูปภาพ`;
}
window.removeRepairImage = function(index) { selectedRepairImages.splice(index, 1); updateImageUI(); }

function loadStaffCheckItems() {
    let container = document.getElementById('check-items-list'); if(!container) return; container.innerHTML = '';
    Object.keys(ITEM_NAMES).forEach(id => { container.innerHTML += `<div class="col-md-6 mb-2"><div class="p-3 border rounded bg-light d-flex justify-content-between align-items-center"><span class="fw-bold text-secondary small">${ITEM_NAMES[id]}</span><div><div class="form-check form-check-inline text-success"><input class="form-check-input" type="radio" name="chk_${id}" id="p_${id}" value="pass" required><label class="form-check-label fw-bold small" for="p_${id}">ปกติ</label></div><div class="form-check form-check-inline text-danger m-0"><input class="form-check-input" type="radio" name="chk_${id}" id="f_${id}" value="fail" required><label class="form-check-label fw-bold small" for="f_${id}">ไม่ปกติ</label></div></div></div></div>`; });
}

document.getElementById('staff-check-form').addEventListener('submit', async function(e) {
    e.preventDefault(); let isPass = true, defectsList = [], rawChecks = {};
    new FormData(this).forEach((v, k) => { if(k.startsWith('chk_')) { rawChecks[k] = v; if(v === 'fail') { isPass = false; defectsList.push(ITEM_NAMES[k.replace('chk_', '')]); } } });
    let checkData = { license: document.getElementById('check-license').value, color: document.getElementById('check-color').value, status: isPass ? "ปกติ" : "พบจุดบกพร่อง", defects: defectsList, rawChecks: rawChecks, date: new Date().toLocaleDateString('th-TH'), staff: currentUserName, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (currentEditCheckId) { 
            await db.collection('checks').doc(currentEditCheckId).update(checkData); 
            showAlert('success', 'อัปเดตสำเร็จ!', 'บันทึกการแก้ไขแล้ว'); 
        } else { 
            await db.collection('checks').add(checkData); 
            showAlert('success', 'บันทึกสำเร็จ!', 'ระบบจะพาท่านไปยังหน้ารายงาน'); 
        }
        currentEditCheckId = null;
        this.reset(); 
        setTimeout(() => { if(alertModal) alertModal.hide(); showView('staff-status'); }, 1500);
    } catch(err) { showAlert('error', 'ข้อผิดพลาด', err.message); }
});

async function editCheckItem(docId) {
    try {
        let doc = await db.collection('checks').doc(docId).get();
        if(doc.exists) {
            let data = doc.data(); 
            currentEditCheckId = docId; 
            
            await showView('staff-check'); 
            
            document.getElementById('check-license').value = data.license.trim(); 
            document.getElementById('check-color').value = data.color || '';
            
            if(data.rawChecks) { 
                Object.keys(data.rawChecks).forEach(k => { 
                    let val = data.rawChecks[k]; 
                    let idKey = k.replace('chk_', ''); 
                    if(val === 'pass') { let el = document.getElementById('p_' + idKey); if(el) el.checked = true; } 
                    if(val === 'fail') { let el = document.getElementById('f_' + idKey); if(el) el.checked = true; } 
                }); 
            }
            window.scrollTo(0, 0);
        }
    } catch(e) { console.error(e); }
}

document.getElementById('staff-repair-form').addEventListener('submit', async function(e) {
    e.preventDefault(); let submitBtn = this.querySelector('button[type="submit"]'), originalText = submitBtn.innerHTML; submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังดำเนินการ...';
    try {
        let imageUrls = [], currentUser = JSON.parse(sessionStorage.getItem('carma_current_user'));
        if (selectedRepairImages.length > 0) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังอัปโหลดรูปภาพ...';
            let uploadPromises = selectedRepairImages.map(async (file) => {
                let formData = new FormData(); formData.append("image", file);
                let response = await fetch(`https://api.imgbb.com/1/upload?key=ed98055f9cee16e83e154246553c9815`, { method: "POST", body: formData });
                let result = await response.json(); if (result.success) return result.data.url; throw new Error("อัปโหลดไม่สำเร็จ");
            });
            imageUrls = await Promise.all(uploadPromises);
        }
        await db.collection('repairs').add({ license: document.getElementById('repair-license').value, carModel: document.getElementById('repair-model').value, name: currentUserName, dept: currentUser.dept || 'ไม่ระบุ', detail: document.getElementById('repair-detail').value, images: imageUrls, adminReason: "", date: new Date().toLocaleDateString('th-TH'), status: "pending", timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        showAlert('success', 'ส่งคำขอสำเร็จ!', 'ข้อมูลถูกบันทึกแล้ว'); selectedRepairImages = []; updateImageUI(); this.reset(); document.getElementById('repair-name').value = currentUserName; document.getElementById('repair-model').value = "";
        setTimeout(() => { if(alertModal) alertModal.hide(); showView('staff-status'); }, 1500);
    } catch (err) { showAlert('error', 'ข้อผิดพลาด', err.message); } finally { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
});

async function loadStaffStatusTable() {
    let tbody = document.getElementById('staff-status-table').getElementsByTagName('tbody')[0]; 
    let badgeCount = document.getElementById('total-records-badge');
    if(!tbody) return; 
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary mb-3"></div><p class="text-muted fw-bold">กำลังโหลดข้อมูล...</p></td></tr>';
    
    try {
        let repairsSnap = await db.collection('repairs').where('name', '==', currentUserName).get();
        let checksSnap = await db.collection('checks').where('staff', '==', currentUserName).get();
        let allData = [];
        
        repairsSnap.forEach(doc => { let d = doc.data(); let ts = d.timestamp ? d.timestamp.toMillis() : Date.now(); allData.push({ id: doc.id, type: 'repair', data: d, ts: ts }); });
        checksSnap.forEach(doc => { let d = doc.data(); let ts = d.timestamp ? d.timestamp.toMillis() : Date.now(); allData.push({ id: doc.id, type: 'check', data: d, ts: ts }); });
        
        // === อัปเดตการจัดเรียงตรงนี้: a.ts - b.ts ทำให้เรียงจากเก่าสุดไปใหม่สุด ===
        allData.sort((a, b) => a.ts - b.ts); 
        
        tbody.innerHTML = ''; let rowNum = 1;
        if(badgeCount) badgeCount.innerText = `ทั้งหมด ${allData.length} รายการ`;

        allData.forEach(item => { 
            let d = item.data; let dateObj = new Date(item.ts); let displayDate = `<div class="fw-bold text-dark">${dateObj.toLocaleDateString('th-TH')}</div><div class="small text-muted"><i class="far fa-clock"></i> ${dateObj.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</div>`;
            
            if(item.type === 'repair') {
                let bClass = d.status === 'pending' ? 'bg-warning text-dark' : (d.status === 'approved' ? 'bg-success text-white' : 'bg-danger text-white'); let sText = d.status === 'pending' ? 'รอพิจารณา' : (d.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'); let iconClass = d.status === 'pending' ? 'fa-hourglass-half' : (d.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle');
                tbody.innerHTML += `<tr><td class="text-center px-4 text-muted fw-bold">${rowNum++}</td><td>${displayDate}</td><td><span class="badge bg-light text-dark border px-3 py-2 fs-6 shadow-sm">${d.license || '-'}</span></td><td><div class="fw-bold text-danger mb-1"><i class="fas fa-tools me-1"></i> แจ้งซ่อมบำรุง</div><div class="small text-muted text-truncate" style="max-width: 250px;">${(d.detail || '-')}</div></td><td class="text-center"><span class="badge ${bClass} rounded-pill px-3 py-2 shadow-sm"><i class="fas ${iconClass} me-1"></i> ${sText}</span></td><td class="text-center px-4"><button onclick="viewDetails('repair', '${item.id}')" class="btn btn-sm btn-outline-info rounded-pill px-3 fw-bold shadow-sm">ดูข้อมูล</button></td></tr>`; 
            } else {
                let sColor = d.status === 'ปกติ' ? 'text-success' : 'text-danger'; let sIcon = d.status === 'ปกติ' ? 'fa-check-circle' : 'fa-exclamation-triangle';
                tbody.innerHTML += `<tr><td class="text-center px-4 text-muted fw-bold">${rowNum++}</td><td>${displayDate}</td><td><span class="badge bg-light text-dark border px-3 py-2 fs-6 shadow-sm">${d.license || '-'}</span></td><td><div class="fw-bold text-primary mb-1"><i class="fas fa-clipboard-check me-1"></i> ตรวจเช็คสภาพ</div><div class="small ${sColor} fw-bold"><i class="fas ${sIcon}"></i> ${d.status || '-'}</div></td><td class="text-center"><span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2"><i class="fas fa-save me-1"></i> บันทึกแล้ว</span></td><td class="text-center px-4"><button onclick="viewDetails('check', '${item.id}')" class="btn btn-sm btn-outline-info rounded-circle me-1 shadow-sm" title="ดูข้อมูล"><i class="fas fa-search"></i></button><button onclick="editCheckItem('${item.id}')" class="btn btn-sm btn-outline-warning rounded-circle shadow-sm" title="แก้ไข"><i class="fas fa-edit"></i></button></td></tr>`; 
            }
        });
        if (allData.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fas fa-box-open fs-1 mb-3 opacity-25 d-block"></i>ยังไม่มีประวัติการทำงานของคุณ</td></tr>`; }
    } catch (e) { tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fs-1 mb-3 opacity-50 d-block"></i>โหลดข้อมูลไม่ได้ กรุณารีเฟรชหน้าเว็บ</td></tr>`; }
}

async function viewDetails(type, docId) {
    let body = document.getElementById('detail-modal-body'); if(!body) return; body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>'; detailModal.show();
    try {
        let doc = await db.collection(type === 'check' ? 'checks' : 'repairs').doc(docId).get();
        if(doc.exists) {
            let data = doc.data();
            if(type === 'check') {
                let statusColor = data.status === 'ปกติ' ? 'text-success' : 'text-danger'; 
                let defectsHtml = (data.status !== 'ปกติ' && data.defects && data.defects.length > 0) ? `<div class="mt-4"><div class="text-danger fw-bold mb-2"><i class="fas fa-exclamation-triangle me-1"></i> รายการที่พบจุดบกพร่อง:</div><ul class="list-unstyled small bg-danger bg-opacity-10 p-3 rounded-4 border border-danger border-opacity-25 shadow-sm">${data.defects.map(d => `<li class="mb-2"><i class="fas fa-times-circle text-danger me-2"></i>${d}</li>`).join('')}</ul></div>` : '';
                body.innerHTML = `<div class="p-2"><div class="d-flex align-items-center border-bottom pb-3 mb-4"><div class="bg-primary bg-opacity-10 p-3 rounded-circle me-3"><i class="fas fa-clipboard-check text-primary fs-4"></i></div><div><h5 class="fw-bold text-dark mb-0">ข้อมูลตรวจเช็คสภาพรถ</h5></div></div><div class="row g-3 mb-2"><div class="col-5 text-muted small fw-bold">ทะเบียนรถ:</div><div class="col-7 fw-bold text-primary">${data.license || '-'}</div></div><div class="row mt-4 bg-light p-3 rounded-4 align-items-center"><div class="col-5 text-muted small fw-bold">ผลประเมิน:</div><div class="col-7 fw-bold fs-5 ${statusColor}">${data.status || '-'}</div></div>${defectsHtml}</div>`;
            } else {
                let bClass = data.status === 'pending' ? 'bg-warning text-dark' : (data.status === 'approved' ? 'bg-success text-white' : 'bg-danger text-white'); let sText = data.status === 'pending' ? 'รอพิจารณาอนุมัติ' : (data.status === 'approved' ? 'อนุมัติการซ่อมแล้ว' : 'ไม่อนุมัติ');
                let imagesArr = data.images || (data.imageUrl ? [data.imageUrl] : []);
                let imgHtml = imagesArr.length > 0 ? `<div class="mb-4 bg-white p-3 rounded-4 border"><div class="small fw-bold text-muted mb-2">ภาพประกอบอาการเสีย:</div><div>${imagesArr.map(url => `<a href="${url}" target="_blank"><img src="${url}" class="img-fluid rounded-3 shadow-sm border mb-2 me-2" style="height: 120px; width: 120px; object-fit: cover;"></a>`).join('')}</div></div>` : `<div class="mb-4 text-center p-4 bg-light rounded-4 border text-muted">ไม่ได้แนบรูปภาพประกอบ</div>`;
                let reasonHtml = data.adminReason ? `<div class="mt-4 px-2"><div class="text-dark small fw-bold mb-2">หมายเหตุผู้ดูแลระบบ:</div><div class="p-3 bg-warning bg-opacity-10 border border-warning rounded-4">${data.adminReason}</div></div>` : '';
                body.innerHTML = `<div class="p-2"><div class="d-flex align-items-center border-bottom pb-3 mb-4"><div class="bg-warning bg-opacity-10 p-3 rounded-circle me-3"><i class="fas fa-tools text-warning fs-4"></i></div><div><h5 class="fw-bold text-dark mb-0">ข้อมูลแจ้งซ่อมบำรุง</h5></div></div>${imgHtml}<div class="bg-light p-3 rounded-4 mb-4"><div class="row"><div class="col-4 text-muted small fw-bold">สถานะ:</div><div class="col-8"><span class="badge ${bClass}">${sText}</span></div></div></div><div class="row g-3 px-2"><div class="col-5 text-muted small fw-bold">ทะเบียนรถ:</div><div class="col-7 fw-bold text-primary">${data.license}</div><div class="col-5 text-muted small fw-bold">ยี่ห้อ/รุ่นรถ:</div><div class="col-7">${data.carModel || '-'}</div></div><div class="mt-4 px-2"><div class="text-dark small fw-bold mb-2">รายละเอียดอาการเสีย:</div><div class="p-3 bg-white border border-primary border-opacity-25 rounded-4">${data.detail}</div></div>${reasonHtml}</div>`;
            }
        } else { body.innerHTML = '<div class="alert alert-danger text-center">ไม่พบข้อมูล</div>'; }
    } catch(err) { body.innerHTML = '<div class="alert alert-danger text-center">เกิดข้อผิดพลาด</div>'; }
}

function showAlert(type, title, desc) { document.getElementById('alert-title').innerText = title; document.getElementById('alert-desc').innerText = desc; let icon = document.getElementById('alert-icon'), btn = document.getElementById('alert-buttons'); if(type === 'success') { icon.innerHTML = '<i class="fas fa-check-circle text-success" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-success w-100 fw-bold rounded-pill" data-bs-dismiss="modal">ตกลง</button>`; } else if(type === 'error') { icon.innerHTML = '<i class="fas fa-exclamation-circle text-danger" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-100 fw-bold rounded-pill" data-bs-dismiss="modal">ตกลง</button>`; } else if(type === 'logout') { icon.innerHTML = '<i class="fas fa-sign-out-alt text-warning" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-50 fw-bold rounded-pill" onclick="logout()">ออกจากระบบ</button><button class="btn btn-light border w-50 fw-bold rounded-pill" data-bs-dismiss="modal">ยกเลิก</button>`; } if(!alertModal) alertModal = new bootstrap.Modal(document.getElementById('alertModal')); alertModal.show(); }
function showLogoutModal() { showAlert('logout', 'ยืนยันออกจากระบบ?', 'คุณต้องการสิ้นสุดการทำงานใช่หรือไม่'); }
function logout() { sessionStorage.removeItem('carma_current_user'); window.location.href = 'index.html'; }
