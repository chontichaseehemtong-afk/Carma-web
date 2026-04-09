// ==========================================
// 1. ตั้งค่า Firebase (เอา Config ของคุณมาใส่ตรงนี้)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyA1Kic03h8Y2HWt4zi30VupMRZJ00q0-FE",
    authDomain: "carma-system.firebaseapp.com",
    projectId: "carma-system",
    storageBucket: "carma-system.firebasestorage.app",
    messagingSenderId: "685774442982",
    appId: "1:685774442982:web:74be11ca855e1f78b4c627",
    measurementId: "G-V2EGGYGM8D"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

const ITEM_NAMES = {
    'tire': 'สภาพลมและดอกยาง', 'brake': 'ระบบเบรคและผ้าเบรค', 'elec': 'ระบบไฟส่องสว่าง/สัญญาณ',
    'water': 'ระดับน้ำหม้อน้ำ/รอยรั่ว', 'oil': 'ระดับและสภาพน้ำมันเครื่อง', 'battery': 'สภาพแบตเตอรี่/ขั้วแบต',
    'wiper': 'ที่ปัดน้ำฝน/น้ำฉีดกระจก', 'trans': 'ระดับน้ำมันเกียร์', 'brkfluid': 'ระดับน้ำมันเบรก/คลัตช์',
    'belt': 'สภาพสายพานหน้าเครื่อง', 'aircon': 'ระบบความเย็นแอร์รถยนต์', 'susp': 'ช่วงล่างและโช้คอัพ',
    'horn': 'การทำงานของเสียงแตร', 'mirror': 'กระจกมองข้าง/หน้าต่าง', 'leak': 'รอยรั่วซึมใต้ท้องรถ'
};

let alertModal, userModal, carModal, detailModal, approvalModal;
let currentRole = null, currentUserName = null, deleteType = null, deleteId = null;
let selectedImageFile = null;

// ==========================================
// 2. ระบบรักษาความปลอดภัย (ตรวจสอบการเข้าหน้า)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // กำหนดตัวแปร Modals ให้พร้อมใช้งาน
    if(document.getElementById('alertModal')) alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
    if(document.getElementById('userModal')) userModal = new bootstrap.Modal(document.getElementById('userModal'));
    if(document.getElementById('carModal')) carModal = new bootstrap.Modal(document.getElementById('carModal'));
    if(document.getElementById('detailModal')) detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    if(document.getElementById('approvalModal')) approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));

    const pageType = document.body.getAttribute('data-page');
    let currentUser = JSON.parse(sessionStorage.getItem('carma_current_user'));

    if (pageType !== 'login' && !currentUser) { window.location.href = 'index.html'; return; }

    if (pageType === 'login') {
        if (currentUser) window.location.href = currentUser.role === 'admin' ? 'admin.html' : 'staff.html';
        try {
            const usersSnap = await db.collection('users').limit(1).get();
            if (usersSnap.empty) {
                await db.collection('users').doc('ADM-001').set({ id: "ADM-001", fname: "อลิส", lname: "มาร์ติน", user: "admin", pass: "admin123", role: "admin", dept: "ฝ่ายบริหาร", phone: "089-999-9999", status: "active" });
                await db.collection('users').doc('EMP-001').set({ id: "EMP-001", fname: "คาลอส", lname: "ไดรอน", user: "user", pass: "user123", role: "staff", dept: "แผนกจัดส่ง", phone: "081-234-5678", status: "active" });
                await db.collection('cars').doc('CAR-001').set({ car_id: "CAR-001", license: "ตอม4448", color: "ขาว", brand: "Toyota", status: "พร้อมใช้งาน" });
            }
        } catch(e) {}
    } 
    else if (pageType === 'staff') {
        if (currentUser.role !== 'staff') { window.location.href = 'admin.html'; return; }
        currentUserName = `${currentUser.fname} ${currentUser.lname}`;
        document.getElementById('staff-user-name').innerText = currentUserName;
        if(document.getElementById('repair-name')) document.getElementById('repair-name').value = currentUserName;
        showView('staff-check');
        setupImageUpload();
    } 
    else if (pageType === 'admin') {
        if (currentUser.role !== 'admin') { window.location.href = 'staff.html'; return; }
        showAdminView('admin-dashboard');
    }
});

function setupImageUpload() {
    let imageInput = document.getElementById('repair-image');
    let previewBox = document.getElementById('image-preview-box');
    let previewImg = document.getElementById('image-preview');
    let removeBtn = document.getElementById('remove-image-btn');

    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) { showAlert('error', 'ไฟล์ใหญ่เกินไป', 'ไม่เกิน 5MB'); this.value = ''; return; }
                selectedImageFile = file;
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewBox.classList.add('d-none');
                    previewImg.src = event.target.result;
                    previewImg.classList.remove('d-none');
                    removeBtn.classList.remove('d-none');
                }
                reader.readAsDataURL(file);
            }
        });
        removeBtn.addEventListener('click', function() {
            imageInput.value = ''; selectedImageFile = null;
            previewBox.classList.remove('d-none'); previewImg.classList.add('d-none'); this.classList.add('d-none');
        });
    }
}

// ==========================================
// 3. Login
// ==========================================
if(document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        let userIn = document.getElementById('username').value.trim();
        let passIn = document.getElementById('password').value.trim();
        try {
            const snapshot = await db.collection('users').where('user', '==', userIn).where('pass', '==', passIn).get();
            if (!snapshot.empty) {
                let foundUser = snapshot.docs[0].data();
                if (foundUser.status === 'inactive') { document.getElementById('login-error').innerHTML = '<i class="fas fa-ban"></i> บัญชีถูกระงับ!'; document.getElementById('login-error').style.display = 'block'; return; }
                sessionStorage.setItem('carma_current_user', JSON.stringify(foundUser)); 
                window.location.href = foundUser.role === 'admin' ? 'admin.html' : 'staff.html';
            } else { document.getElementById('login-error').innerHTML = '<i class="fas fa-exclamation-triangle"></i> ข้อมูลไม่ถูกต้อง!'; document.getElementById('login-error').style.display = 'block'; }
        } catch (err) { document.getElementById('login-error').innerHTML = '<i class="fas fa-wifi"></i> เชื่อมต่อฐานข้อมูลไม่ได้'; document.getElementById('login-error').style.display = 'block'; }
    });
}

// ==========================================
// 4. Staff
// ==========================================
function showView(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => link.classList.remove('active'));
    let content = document.getElementById(section + '-content');
    if(content) {
        content.style.display = 'block'; document.getElementById(section + '-menu').classList.add('active');
        if(section === 'staff-check') loadStaffCheckItems(); if(section === 'staff-status') loadStaffStatusTable();
        let titles = {'staff-check':{t:'บันทึกตรวจเช็ค',d:'ตรวจสอบรายการ 15 ข้อ',i:'fa-clipboard-check'},'staff-repair':{t:'แจ้งซ่อม',d:'ขออนุมัติซ่อม',i:'fa-tools'},'staff-status':{t:'สถานะงาน',d:'ติดตามการทำงาน',i:'fa-tasks'}};
        if(titles[section]) { document.getElementById('staff-content-title').innerText = titles[section].t; document.getElementById('staff-content-desc').innerText = titles[section].d; document.getElementById('staff-header-icon').className = 'fas ' + titles[section].i; }
    }
}

async function loadStaffCheckItems() {
    let container = document.getElementById('check-items-list'); if(!container) return; container.innerHTML = '';
    Object.keys(ITEM_NAMES).forEach(id => { container.innerHTML += `<div class="col-md-6 mb-2"><div class="p-3 border rounded bg-light d-flex justify-content-between align-items-center"><span class="fw-bold text-secondary small">${ITEM_NAMES[id]}</span><div><div class="form-check form-check-inline text-success"><input class="form-check-input" type="radio" name="chk_${id}" id="p_${id}" value="pass" checked><label class="form-check-label fw-bold small" for="p_${id}">ปกติ</label></div><div class="form-check form-check-inline text-danger m-0"><input class="form-check-input" type="radio" name="chk_${id}" id="f_${id}" value="fail"><label class="form-check-label fw-bold small" for="f_${id}">ไม่ปกติ</label></div></div></div></div>`; });
}

if(document.getElementById('staff-check-form')) {
    document.getElementById('staff-check-form').addEventListener('submit', async function(e) {
        e.preventDefault(); let isPass = true; let defectsList = []; 
        new FormData(this).forEach((v, k) => { if(k.startsWith('chk_') && v === 'fail') { isPass = false; defectsList.push(ITEM_NAMES[k.replace('chk_', '')]); } });
        await db.collection('checks').add({ car_id: document.getElementById('check-carid').value, license: document.getElementById('check-license').value, color: document.getElementById('check-color').value, status: isPass ? "ปกติ" : "พบจุดบกพร่อง", defects: defectsList, date: new Date().toLocaleDateString('th-TH'), staff: currentUserName, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        showAlert('success', 'บันทึกสำเร็จ!', 'ข้อมูลถูกบันทึกเรียบร้อย'); this.reset(); loadStaffCheckItems(); 
    });
}

// --- บันทึกการแจ้งซ่อม (แก้ไขพรีวิวรูปร้างแล้ว) ---
if(document.getElementById('staff-repair-form')) {
    document.getElementById('staff-repair-form').addEventListener('submit', async function(e) {
        e.preventDefault(); 
        
        let submitBtn = this.querySelector('button[type="submit"]');
        let originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังอัปโหลดรูป...';

        try {
            let imageUrl = ""; 
            const fileInput = document.getElementById('repair-image'); 
            const file = fileInput.files[0];

            if (file) {
                const apiKey = "ed98055f9cee16e83e154246553c9815"; 
                const formData = new FormData();
                formData.append("image", file);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: "POST", body: formData });
                const result = await response.json();
                
                if (result.success) { imageUrl = result.data.url; } 
                else { throw new Error("อัปโหลดรูปไม่สำเร็จ"); }
            }

            await db.collection('repairs').add({ 
                license: document.getElementById('repair-license').value, 
                name: currentUserName, 
                dept: document.getElementById('repair-dept').value, 
                detail: document.getElementById('repair-detail').value, 
                priority: document.getElementById('repair-priority').value,
                imageUrl: imageUrl, 
                adminReason: "", // เตรียมฟิลด์เหตุผลไว้ให้แอดมิน
                date: new Date().toLocaleDateString('th-TH'), 
                status: "pending", 
                timestamp: firebase.firestore.FieldValue.serverTimestamp() 
            });
            
            showAlert('success', 'ส่งคำขอสำเร็จ!', 'ข้อมูลและรูปภาพถูกบันทึกแล้ว'); 
            
            this.reset(); 
            document.getElementById('repair-name').value = currentUserName;
            
            // ซ่อนรูปที่พรีวิวไว้
            document.getElementById('image-preview-box').classList.remove('d-none');
            document.getElementById('image-preview').classList.add('d-none');
            document.getElementById('image-preview').src = '';
            document.getElementById('remove-image-btn').classList.add('d-none');
            fileInput.value = '';
            selectedImageFile = null;

        } catch (err) { showAlert('error', 'ข้อผิดพลาด', 'เกิดปัญหา: ' + err.message);
        } finally { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
    });
}

async function loadStaffStatusTable() {
    let tbody = document.getElementById('staff-status-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>กำลังโหลด...</td></tr>';
    try {
        let repairsSnap = await db.collection('repairs').where('name', '==', currentUserName).get();
        let checksSnap = await db.collection('checks').where('staff', '==', currentUserName).get();
        tbody.innerHTML = ''; let rowNum = 1;
        repairsSnap.forEach(doc => { let r = doc.data(); let bClass = r.status === 'pending' ? 'bg-warning text-dark' : (r.status === 'approved' ? 'bg-success' : 'bg-danger'); let sText = r.status === 'pending' ? 'รออนุมัติ' : (r.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'); tbody.innerHTML += `<tr><td class="text-center text-muted fw-bold">${rowNum++}</td><td>${r.date}</td><td><span class="fw-bold text-primary">${r.license}</span></td><td>แจ้งซ่อม</td><td>${r.detail.substring(0,20)}...</td><td class="text-center"><span class="badge ${bClass}">${sText}</span></td><td class="text-center"><button onclick="viewDetails('repair', '${doc.id}')" class="btn btn-sm btn-info text-white"><i class="fas fa-search"></i></button></td></tr>`; });
        checksSnap.forEach(doc => { let c = doc.data(); let sColor = c.status === 'ปกติ' ? 'text-success' : 'text-danger'; tbody.innerHTML += `<tr><td class="text-center text-muted fw-bold">${rowNum++}</td><td>${c.date}</td><td><span class="fw-bold text-primary">${c.license}</span></td><td>ตรวจเช็ค</td><td><span class="${sColor} fw-bold">${c.status}</span></td><td class="text-center"><span class="badge bg-primary">บันทึกสำเร็จ</span></td><td class="text-center"><button onclick="viewDetails('check', '${doc.id}')" class="btn btn-sm btn-info text-white"><i class="fas fa-search"></i></button></td></tr>`; });
        if (rowNum === 1) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">ไม่มีประวัติการทำงาน</td></tr>`;
    } catch (e) { tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">โหลดข้อมูลไม่ได้</td></tr>`; }
}

// ==========================================
// 5. Admin
// ==========================================
function showAdminView(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => link.classList.remove('active'));
    let content = document.getElementById(section + '-content');
    if(content) {
        content.style.display = 'block'; document.getElementById(section + '-menu').classList.add('active');
        if(section === 'admin-dashboard') loadAdminDashboard(); if(section === 'admin-users') loadAdminUsersTable(); if(section === 'admin-cars') loadAdminCarsTable(); if(section === 'admin-repairs') loadAdminRepairsTable(); if(section === 'admin-reports') loadAdminReportsTable();
        let titles = {'admin-dashboard':{t:'แดชบอร์ด',d:'สถิติรวม',i:'fa-tachometer-alt'},'admin-users':{t:'จัดการผู้ใช้',d:'บัญชีพนักงาน',i:'fa-users-cog'},'admin-cars':{t:'จัดการรถยนต์',d:'ฐานข้อมูลรถยนต์',i:'fa-car'},'admin-repairs':{t:'อนุมัติซ่อม',d:'รายการรออนุมัติ',i:'fa-clipboard-check'},'admin-reports':{t:'รายงาน',d:'ประวัติทั้งหมด',i:'fa-file-invoice'}};
        if(titles[section]) { document.getElementById('admin-content-title').innerText = titles[section].t; document.getElementById('admin-content-desc').innerText = titles[section].d; document.getElementById('admin-header-icon').className = 'fas ' + titles[section].i; }
    }
}

async function loadAdminDashboard() { try { let uSnap = await db.collection('users').get(); document.getElementById('dashboard-users').innerText = uSnap.size; let cSnap = await db.collection('cars').get(); document.getElementById('dashboard-cars').innerText = cSnap.size; let rSnap = await db.collection('repairs').where('status', '==', 'pending').get(); document.getElementById('dashboard-repairs-pending').innerText = rSnap.size; } catch(e) {} }
async function loadAdminUsersTable() { let tbody = document.getElementById('admin-users-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>กำลังโหลด...</td></tr>'; try { let snapshot = await db.collection('users').get(); tbody.innerHTML = ''; snapshot.forEach(doc => { let u = doc.data(); let rBadge = u.role === 'admin' ? '<span class="badge bg-primary">แอดมิน</span>' : '<span class="badge bg-secondary">พนักงาน</span>'; let statB = u.status === 'active' ? '<span class="badge bg-success">ปกติ</span>' : '<span class="badge bg-danger">ระงับ</span>'; tbody.innerHTML += `<tr><td class="text-muted small px-4">${u.id}</td><td><div class="fw-bold text-primary">${u.fname} ${u.lname}</div><div class="small text-muted"><i class="fas fa-user-circle"></i> ${u.user}</div></td><td>${u.dept || '-'}</td><td><i class="fas fa-phone-alt text-muted"></i> ${u.phone || '-'}</td><td>${rBadge} ${statB}</td><td class="text-end px-4"><button onclick="openUserModal('${doc.id}')" class="btn btn-sm btn-light border me-1"><i class="fas fa-edit text-muted"></i></button><button onclick="confirmDelete('users', '${doc.id}')" class="btn btn-sm btn-light border"><i class="fas fa-trash text-danger"></i></button></td></tr>`; }); } catch(e) {} }
async function openUserModal(docId) { document.getElementById('user-form').reset(); if(docId && docId !== 'null') { document.getElementById('u_mode').value = docId; document.getElementById('u_id').readOnly = true; document.getElementById('u_id').classList.add('bg-light'); let doc = await db.collection('users').doc(docId).get(); if(doc.exists) { let user = doc.data(); document.getElementById('u_id').value = user.id; document.getElementById('u_fname').value = user.fname; document.getElementById('u_lname').value = user.lname; document.getElementById('u_dept').value = user.dept || ''; document.getElementById('u_phone').value = user.phone || ''; document.getElementById('u_role').value = user.role || 'staff'; document.getElementById('u_status').value = user.status || 'active'; document.getElementById('u_user').value = user.user; document.getElementById('u_pass').value = user.pass; } } else { document.getElementById('u_mode').value = 'add'; document.getElementById('u_id').readOnly = false; document.getElementById('u_id').classList.remove('bg-light'); document.getElementById('u_id').value = "EMP-" + Date.now().toString().slice(-4); } userModal.show(); }
if(document.getElementById('user-form')){ document.getElementById('user-form').addEventListener('submit', async function(e) { e.preventDefault(); let mode = document.getElementById('u_mode').value; let userData = { id: document.getElementById('u_id').value.trim(), fname: document.getElementById('u_fname').value.trim(), lname: document.getElementById('u_lname').value.trim(), dept: document.getElementById('u_dept').value.trim(), phone: document.getElementById('u_phone').value.trim(), role: document.getElementById('u_role').value, status: document.getElementById('u_status').value, user: document.getElementById('u_user').value.trim(), pass: document.getElementById('u_pass').value.trim() }; try { if(mode === 'add') { await db.collection('users').add(userData); showAlert('success', 'เพิ่มพนักงานสำเร็จ', ''); } else { await db.collection('users').doc(mode).update(userData); showAlert('success', 'อัปเดตสำเร็จ', ''); } loadAdminUsersTable(); userModal.hide(); } catch(e) { showAlert('error', 'เกิดข้อผิดพลาด', e.message); } }); }
async function loadAdminCarsTable() { let tbody = document.getElementById('admin-cars-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>กำลังโหลด...</td></tr>'; try { let snapshot = await db.collection('cars').get(); tbody.innerHTML = ''; snapshot.forEach(doc => { let c = doc.data(); let sColor = c.status === 'พร้อมใช้งาน' ? 'text-success' : (c.status === 'กำลังซ่อมบำรุง' ? 'text-warning' : 'text-danger'); tbody.innerHTML += `<tr><td class="text-muted small px-4">${c.car_id}</td><td><span class="badge bg-light text-dark border fs-6">${c.license}</span></td><td>${c.brand || '-'}</td><td>${c.color || '-'}</td><td><span class="${sColor} fw-bold"><i class="fas fa-circle" style="font-size:10px;"></i> ${c.status}</span></td><td class="text-end px-4"><button onclick="openCarModal('${doc.id}')" class="btn btn-sm btn-light border me-1"><i class="fas fa-edit text-muted"></i></button><button onclick="confirmDelete('cars', '${doc.id}')" class="btn btn-sm btn-light border"><i class="fas fa-trash text-danger"></i></button></td></tr>`; }); } catch(e) {} }
async function openCarModal(docId) { document.getElementById('car-form').reset(); if(docId && docId !== 'null') { document.getElementById('c_mode').value = docId; document.getElementById('c_id').readOnly = true; document.getElementById('c_id').classList.add('bg-light'); let doc = await db.collection('cars').doc(docId).get(); if(doc.exists) { let car = doc.data(); document.getElementById('c_id').value = car.car_id; document.getElementById('c_license').value = car.license; document.getElementById('c_color').value = car.color || ''; document.getElementById('c_brand').value = car.brand || ''; document.getElementById('c_status').value = car.status || 'พร้อมใช้งาน'; } } else { document.getElementById('c_mode').value = 'add'; document.getElementById('c_id').readOnly = false; document.getElementById('c_id').classList.remove('bg-light'); document.getElementById('c_id').value = "CAR-" + Date.now().toString().slice(-4); } carModal.show(); }
if(document.getElementById('car-form')){ document.getElementById('car-form').addEventListener('submit', async function(e) { e.preventDefault(); let mode = document.getElementById('c_mode').value; let carData = { car_id: document.getElementById('c_id').value.trim(), license: document.getElementById('c_license').value.trim(), color: document.getElementById('c_color').value.trim(), brand: document.getElementById('c_brand').value.trim(), status: document.getElementById('c_status').value }; try { if(mode === 'add') { await db.collection('cars').add(carData); showAlert('success', 'เพิ่มรถยนต์สำเร็จ', ''); } else { await db.collection('cars').doc(mode).update(carData); showAlert('success', 'อัปเดตรถยนต์สำเร็จ', ''); } loadAdminCarsTable(); carModal.hide(); } catch(e) { showAlert('error', 'เกิดข้อผิดพลาด', e.message); } }); }

// --- โหลดตารางซ่อม และสร้างปุ่ม พิจารณา ---
async function loadAdminRepairsTable() { 
    let tbody = document.getElementById('admin-repairs-table').getElementsByTagName('tbody')[0]; 
    if(!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>กำลังโหลด...</td></tr>'; 
    try { 
        let snapshot = await db.collection('repairs').where('status', '==', 'pending').get(); 
        tbody.innerHTML = ''; 
        if(snapshot.empty) { tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ไม่มีรายการรออนุมัติ</td></tr>`; return; } 
        snapshot.forEach(doc => { 
            let r = doc.data(); 
            tbody.innerHTML += `<tr><td class="px-4 text-muted small">${r.date}</td><td><span class="fw-bold text-primary">${r.license}</span></td><td>${r.name}<br><small class="text-muted">${r.dept}</small></td><td>${r.detail.substring(0,25)}...</td><td class="text-center px-4"><button onclick="openApprovalModal('${doc.id}')" class="btn btn-sm btn-primary rounded-pill px-4 shadow-sm fw-bold"><i class="fas fa-search me-1"></i> พิจารณา</button></td></tr>`; 
        }); 
    } catch(e) {} 
}

// --- เปิดหน้าต่างพิจารณาของ Admin ---
async function openApprovalModal(docId) {
    if(!approvalModal) approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
    
    document.getElementById('approve_doc_id').value = docId;
    document.getElementById('approval-reason').value = '';
    
    let detailsDiv = document.getElementById('approval-details');
    detailsDiv.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
    approvalModal.show();
    
    try {
        let doc = await db.collection('repairs').doc(docId).get();
        if(doc.exists) {
            let data = doc.data();
            let imgHtml = data.imageUrl ? 
                `<div class="mb-3 text-center"><a href="${data.imageUrl}" target="_blank"><img src="${data.imageUrl}" class="img-fluid rounded-4 shadow-sm border" style="max-height: 220px; object-fit: cover;"></a><br><small class="text-muted mt-1 d-block"><i class="fas fa-search-plus"></i> คลิกที่รูปเพื่อดูขนาดเต็ม</small></div>` : 
                `<div class="alert alert-light border border-dashed text-center small py-3 mb-3 text-muted"><i class="fas fa-image fs-3 mb-2 d-block opacity-50"></i>ผู้แจ้งไม่ได้แนบรูปภาพ</div>`;
            
            detailsDiv.innerHTML = `
                ${imgHtml}
                <div class="row g-2 small mb-1 bg-white p-3 rounded-4 shadow-sm border">
                    <div class="col-4 text-muted fw-bold">ทะเบียนรถ:</div><div class="col-8 fw-bold text-primary fs-6">${data.license}</div>
                    <div class="col-4 text-muted fw-bold">ผู้แจ้ง:</div><div class="col-8">${data.name} (${data.dept})</div>
                    <div class="col-4 text-muted fw-bold">อาการเสีย:</div><div class="col-8 text-dark">${data.detail}</div>
                </div>
            `;
        }
    } catch(e) {
        detailsDiv.innerHTML = '<div class="alert alert-danger">โหลดข้อมูลไม่สำเร็จ</div>';
    }
}

// --- ส่งผลการพิจารณา (อนุมัติ / ไม่อนุมัติ พร้อมเหตุผล) ---
async function submitApproval(stat) { 
    let docId = document.getElementById('approve_doc_id').value;
    let reason = document.getElementById('approval-reason').value.trim();
    try { 
        await db.collection('repairs').doc(docId).update({ 
            status: stat, 
            adminReason: reason 
        }); 
        approvalModal.hide();
        loadAdminRepairsTable(); 
        loadAdminDashboard(); 
        showAlert('success', 'พิจารณาสำเร็จ!', 'ระบบส่งผลและเหตุผลกลับไปยังพนักงานแล้ว'); 
    } catch(e) { showAlert('error', 'ข้อผิดพลาด', e.message); } 
}

async function loadAdminReportsTable() { let tbody = document.getElementById('admin-reports-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>กำลังโหลด...</td></tr>'; try { let snapshot = await db.collection('checks').orderBy('timestamp', 'desc').get(); tbody.innerHTML = ''; if(snapshot.empty) { tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">ไม่มีข้อมูลประวัติ</td></tr>`; return; } snapshot.forEach((doc) => { let r = doc.data(); let badge = r.status === 'ปกติ' ? 'bg-success' : 'bg-danger'; tbody.innerHTML += `<tr><td class="px-4 text-muted small">${r.date}</td><td><span class="fw-bold">${r.license}</span></td><td class="text-muted">${r.car_id}</td><td>${r.staff}</td><td class="px-4"><span class="badge ${badge}">${r.status}</span></td><td class="text-center px-4"><button onclick="viewDetails('check', '${doc.id}')" class="btn btn-sm btn-info text-white"><i class="fas fa-search"></i></button></td></tr>`; }); } catch(e) {} }

// ==========================================
// 6. View Details (หน้าต่างแสดงรายละเอียด และเหตุผลแอดมิน)
// ==========================================
async function viewDetails(type, docId) {
    let body = document.getElementById('detail-modal-body'); 
    if(!body) return; 
    
    body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 text-muted fw-bold">กำลังโหลดข้อมูล...</p></div>';
    
    if(!detailModal) detailModal = new bootstrap.Modal(document.getElementById('detailModal')); 
    detailModal.show();
    
    try {
        if(type === 'check') {
            let doc = await db.collection('checks').doc(docId).get();
            if(doc.exists) {
                let data = doc.data(); 
                let statusColor = data.status === 'ปกติ' ? 'text-success' : 'text-danger'; 
                let defectsHtml = '';
                
                if (data.status !== 'ปกติ' && data.defects && data.defects.length > 0) { 
                    let list = data.defects.map(d => `<li class="mb-2"><i class="fas fa-times-circle text-danger me-2"></i>${d}</li>`).join(''); 
                    defectsHtml = `<div class="mt-4"><div class="text-danger fw-bold mb-2"><i class="fas fa-exclamation-triangle me-1"></i> รายการที่พบจุดบกพร่อง:</div><ul class="list-unstyled small bg-danger bg-opacity-10 p-3 rounded-4 border border-danger border-opacity-25 shadow-sm">${list}</ul></div>`; 
                }
                
                body.innerHTML = `
                <div class="p-2">
                    <div class="d-flex align-items-center border-bottom pb-3 mb-4">
                        <div class="bg-primary bg-opacity-10 p-3 rounded-circle me-3"><i class="fas fa-clipboard-check text-primary fs-4"></i></div>
                        <div><h5 class="fw-bold text-dark mb-0">ข้อมูลตรวจเช็คสภาพรถ</h5><small class="text-muted">รายละเอียดการตรวจสอบประจำวัน</small></div>
                    </div>
                    <div class="row g-3 mb-2">
                        <div class="col-5 text-muted small fw-bold">วันที่บันทึก:</div><div class="col-7">${data.date || '-'}</div>
                        <div class="col-5 text-muted small fw-bold">ทะเบียนรถ:</div><div class="col-7 fw-bold text-primary fs-6"><span class="badge bg-light text-dark border px-3 py-2">${data.license || '-'}</span></div>
                        <div class="col-5 text-muted small fw-bold">รหัสรถยนต์:</div><div class="col-7">${data.car_id || '-'}</div>
                        <div class="col-5 text-muted small fw-bold">ผู้ตรวจสอบ:</div><div class="col-7">${data.staff || '-'}</div>
                    </div>
                    <div class="row mt-4 bg-light p-3 rounded-4 align-items-center shadow-sm">
                        <div class="col-5 text-muted small fw-bold">ผลการประเมิน:</div>
                        <div class="col-7 fw-bold fs-5 ${statusColor}">${data.status || '-'}</div>
                    </div>
                    ${defectsHtml}
                </div>`;
            } else { body.innerHTML = '<div class="alert alert-danger rounded-4 text-center"><i class="fas fa-times-circle fs-3 mb-2 d-block"></i>ไม่พบข้อมูลในระบบ</div>'; }
            
        } else if(type === 'repair') {
            let doc = await db.collection('repairs').doc(docId).get();
            if(doc.exists) {
                let data = doc.data(); 
                let sText = data.status === 'pending' ? 'รอพิจารณาอนุมัติ' : (data.status === 'approved' ? 'อนุมัติการซ่อมแล้ว' : 'ไม่อนุมัติ / ยกเลิก'); 
                let bClass = data.status === 'pending' ? 'bg-warning text-dark' : (data.status === 'approved' ? 'bg-success text-white' : 'bg-danger text-white');
                let iconClass = data.status === 'pending' ? 'fa-hourglass-half' : (data.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle');
                
                let imgHtml = data.imageUrl ? `
                    <div class="mb-4 text-center">
                        <div class="position-relative d-inline-block shadow rounded-4 overflow-hidden" style="border: 4px solid #f8f9fa;">
                            <img src="${data.imageUrl}" class="img-fluid" style="max-height: 280px; object-fit: cover; width: 100%; border-radius: 8px;" alt="ภาพประกอบการแจ้งซ่อม">
                            <div class="position-absolute bottom-0 start-0 w-100 p-2 bg-dark bg-opacity-75 text-white text-start" style="font-size: 13px;">
                                <i class="fas fa-camera text-info me-1"></i> ภาพประกอบอาการเสีย
                            </div>
                        </div>
                        <div class="mt-3">
                            <a href="${data.imageUrl}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-4 shadow-sm fw-bold transition-all hover-shadow">
                                <i class="fas fa-expand-arrows-alt me-1"></i> ดูรูปภาพขนาดเต็ม
                            </a>
                        </div>
                    </div>` : `
                    <div class="mb-4 text-center p-4 bg-light rounded-4 border border-2 text-muted" style="border-style: dashed !important;">
                        <div class="bg-white rounded-circle d-inline-flex justify-content-center align-items-center shadow-sm mb-2" style="width: 50px; height: 50px;">
                            <i class="fas fa-image fs-4 text-secondary opacity-50"></i>
                        </div>
                        <p class="mb-0 small fw-bold text-secondary">ไม่ได้แนบรูปภาพประกอบ</p>
                    </div>`;

                let reasonHtml = data.adminReason ? `
                    <div class="mt-4 px-2">
                        <div class="text-dark small fw-bold mb-2"><i class="fas fa-comment-dots me-1 text-warning"></i> หมายเหตุ / เหตุผลจากผู้ดูแลระบบ:</div>
                        <div class="p-3 bg-warning bg-opacity-10 border border-warning border-opacity-50 rounded-4 shadow-sm" style="font-size: 14px; color: #664d03; line-height: 1.6;">
                            ${data.adminReason.replace(/\n/g, '<br>')}
                        </div>
                    </div>` : '';

                body.innerHTML = `
                <div class="p-2">
                    <div class="d-flex align-items-center border-bottom pb-3 mb-4">
                        <div class="bg-warning bg-opacity-10 p-3 rounded-circle me-3"><i class="fas fa-tools text-warning fs-4"></i></div>
                        <div><h5 class="fw-bold text-dark mb-0">ข้อมูลแจ้งซ่อมบำรุง</h5><small class="text-muted">รายละเอียดการขออนุมัติ</small></div>
                    </div>
                    
                    ${imgHtml}
                    
                    <div class="bg-light p-3 rounded-4 mb-4 shadow-sm border border-white">
                        <div class="row g-2 align-items-center">
                            <div class="col-4 text-muted small fw-bold">สถานะล่าสุด:</div>
                            <div class="col-8"><span class="badge ${bClass} px-3 py-2 fs-6 rounded-pill shadow-sm"><i class="fas ${iconClass} me-1"></i> ${sText}</span></div>
                        </div>
                    </div>

                    <div class="row g-3 mb-2 px-2">
                        <div class="col-5 text-muted small fw-bold"><i class="far fa-calendar-alt me-1"></i> วันที่แจ้ง:</div><div class="col-7">${data.date || '-'}</div>
                        <div class="col-5 text-muted small fw-bold"><i class="fas fa-car me-1"></i> ทะเบียนรถ:</div><div class="col-7 fw-bold text-primary fs-6">${data.license || '-'}</div>
                        <div class="col-5 text-muted small fw-bold"><i class="far fa-user me-1"></i> ผู้แจ้งซ่อม:</div><div class="col-7">${data.name || '-'} <br><small class="text-muted bg-light border px-2 py-1 rounded">แผนก: ${data.dept || '-'}</small></div>
                    </div>
                    
                    <div class="mt-4 px-2">
                        <div class="text-dark small fw-bold mb-2"><i class="fas fa-clipboard-list me-1 text-primary"></i> รายละเอียดอาการเสีย:</div>
                        <div class="p-3 bg-white border border-primary border-opacity-25 rounded-4 shadow-sm" style="font-size: 14px; line-height: 1.6; color: #495057;">
                            ${data.detail ? data.detail.replace(/\n/g, '<br>') : '-'}
                        </div>
                    </div>

                    ${reasonHtml}
                </div>`;
            } else { body.innerHTML = '<div class="alert alert-danger rounded-4 text-center"><i class="fas fa-times-circle fs-3 mb-2 d-block"></i>ไม่พบข้อมูลในระบบ</div>'; }
        }
    } catch(err) { body.innerHTML = '<div class="alert alert-danger rounded-4 text-center"><i class="fas fa-exclamation-triangle fs-3 mb-2 d-block"></i>เกิดข้อผิดพลาดในการดึงข้อมูล</div>'; }
}

function filterTable(inputId, tableId) { let input = document.getElementById(inputId).value.toLowerCase(); let tbody = document.getElementById(tableId).getElementsByTagName('tbody')[0]; if(tbody) Array.from(tbody.getElementsByTagName('tr')).forEach(tr => { tr.style.display = tr.innerText.toLowerCase().includes(input) ? '' : 'none'; }); }
function showAlert(type, title, desc) { document.getElementById('alert-title').innerText = title; document.getElementById('alert-desc').innerText = desc; let icon = document.getElementById('alert-icon'), btn = document.getElementById('alert-buttons'); if(type === 'success') { icon.innerHTML = '<i class="fas fa-check-circle text-success" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-success w-100 fw-bold rounded-pill" data-bs-dismiss="modal">ตกลง</button>`; } else if(type === 'error') { icon.innerHTML = '<i class="fas fa-exclamation-circle text-danger" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-100 fw-bold rounded-pill" data-bs-dismiss="modal">ตกลง</button>`; } else if(type === 'delete') { icon.innerHTML = '<i class="fas fa-trash-alt text-danger" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-50 fw-bold rounded-pill" onclick="executeDelete()">ลบเลย</button><button class="btn btn-light border w-50 fw-bold rounded-pill" data-bs-dismiss="modal">ยกเลิก</button>`; } else if(type === 'logout') { icon.innerHTML = '<i class="fas fa-sign-out-alt text-warning" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-50 fw-bold rounded-pill" onclick="logout()">ออกจากระบบ</button><button class="btn btn-light border w-50 fw-bold rounded-pill" data-bs-dismiss="modal">ยกเลิก</button>`; } if(!alertModal) alertModal = new bootstrap.Modal(document.getElementById('alertModal')); alertModal.show(); }
function confirmDelete(type, docId) { deleteType = type; deleteId = docId; showAlert('delete', 'ยืนยันการลบ?', 'ข้อมูลที่ลบจะไม่สามารถกู้คืนได้'); }
async function executeDelete() { try { await db.collection(deleteType).doc(deleteId).delete(); if(deleteType === 'users') loadAdminUsersTable(); if(deleteType === 'cars') loadAdminCarsTable(); loadAdminDashboard(); alertModal.hide(); setTimeout(() => showAlert('success', 'ลบข้อมูลสำเร็จ', ''), 300); } catch(err) { alertModal.hide(); setTimeout(() => showAlert('error', 'ลบไม่สำเร็จ', 'เช็คสิทธิ์ Firebase Rule'), 300); } }
function showLogoutModal() { showAlert('logout', 'ยืนยันออกจากระบบ?', 'คุณต้องการสิ้นสุดการทำงานใช่หรือไม่'); }
function logout() { sessionStorage.removeItem('carma_current_user'); window.location.href = 'index.html'; }
