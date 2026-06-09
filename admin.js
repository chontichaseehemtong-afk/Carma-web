// ==========================================
// การตั้งค่า Firebase 
// ==========================================
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

let alertModal, userModal, carModal, detailModal, approvalModal, deleteType = null, deleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if(document.getElementById('alertModal')) alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
    if(document.getElementById('userModal')) userModal = new bootstrap.Modal(document.getElementById('userModal'));
    if(document.getElementById('carModal')) carModal = new bootstrap.Modal(document.getElementById('carModal'));
    if(document.getElementById('detailModal')) detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    if(document.getElementById('approvalModal')) approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));

    let currentUser = JSON.parse(sessionStorage.getItem('carma_current_user'));
    if (!currentUser || currentUser.role !== 'admin') { window.location.href = 'index.html'; return; }
    
    showAdminView('admin-dashboard');
});

function showAdminView(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => link.classList.remove('active'));
    let content = document.getElementById(section + '-content');
    if(content) {
        content.style.display = 'block'; document.getElementById(section + '-menu').classList.add('active');
        
        if(section === 'admin-dashboard') loadAdminDashboard();
        if(section === 'admin-users') loadAdminUsersTable(); 
        if(section === 'admin-cars') loadAdminCarsTable(); 
        if(section === 'admin-repairs') loadAdminRepairsTable(); 
        if(section === 'admin-reports') loadAdminReportsTable();
        
        let titles = {'admin-dashboard':{t:'แดชบอร์ดแอดมิน',d:'ภาพรวมของระบบทั้งหมด',i:'fa-chart-line'},'admin-users':{t:'จัดการผู้ใช้',d:'บัญชีพนักงาน',i:'fa-users-cog'},'admin-cars':{t:'จัดการรถยนต์',d:'ฐานข้อมูลรถยนต์',i:'fa-car'},'admin-repairs':{t:'อนุมัติซ่อม',d:'รายการรออนุมัติ',i:'fa-clipboard-check'},'admin-reports':{t:'รายงาน',d:'ประวัติทั้งหมด',i:'fa-file-invoice'}};
        document.getElementById('admin-content-title').innerText = titles[section].t; document.getElementById('admin-content-desc').innerText = titles[section].d; document.getElementById('admin-header-icon').className = 'fas ' + titles[section].i; 
    }
}

// ---------------------------------------------------------
// แดชบอร์ด (Admin)
// ---------------------------------------------------------
async function loadAdminDashboard() {
    try {
        let usersSnap = await db.collection('users').get();
        let carsSnap = await db.collection('cars').get();
        let checksSnap = await db.collection('checks').get();
        let repairsSnap = await db.collection('repairs').where('status', '==', 'pending').get();
        
        document.getElementById('dash-admin-users').innerText = usersSnap.size;
        document.getElementById('dash-admin-cars').innerText = carsSnap.size;
        document.getElementById('dash-admin-checks').innerText = checksSnap.size;
        document.getElementById('dash-admin-pending').innerText = repairsSnap.size;
    } catch(e) { console.error("Error loading admin dashboard", e); }
}

// ---------------------------------------------------------
// จัดการผู้ใช้ & ตรวจสอบชื่อ-นามสกุลซ้ำ
// ---------------------------------------------------------
async function loadAdminUsersTable() { 
    let tbody = document.getElementById('admin-users-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>'; 
    try { 
        let snapshot = await db.collection('users').get(); tbody.innerHTML = ''; 
        snapshot.forEach(doc => { 
            let u = doc.data(); let rBadge = u.role === 'admin' ? '<span class="badge bg-primary">แอดมิน</span>' : '<span class="badge bg-secondary">พนักงาน</span>'; let statB = u.status === 'active' ? '<span class="badge bg-success">ปกติ</span>' : '<span class="badge bg-danger">ระงับ</span>'; let logCount = u.loginCount || 0;
            tbody.innerHTML += `<tr><td class="text-muted small px-4">${u.id}</td><td><div class="fw-bold text-primary">${u.fname} ${u.lname}</div><div class="small text-muted"><i class="fas fa-user-circle"></i> ${u.user}</div></td><td>${u.dept || '-'}</td><td><i class="fas fa-phone-alt text-muted"></i> ${u.phone || '-'}</td><td class="text-center text-muted fw-bold">${logCount}</td><td>${rBadge} ${statB}</td><td class="text-end px-4"><button onclick="openUserModal('${doc.id}')" class="btn btn-sm btn-light border me-1"><i class="fas fa-edit text-muted"></i></button><button onclick="confirmDelete('users', '${doc.id}')" class="btn btn-sm btn-light border"><i class="fas fa-trash text-danger"></i></button></td></tr>`; 
        }); 
    } catch(e) {} 
}

async function openUserModal(docId) { 
    document.getElementById('user-form').reset(); 
    if(docId && docId !== 'null') { 
        document.getElementById('u_mode').value = docId; document.getElementById('u_id').readOnly = true; document.getElementById('u_id').classList.add('bg-light'); 
        let doc = await db.collection('users').doc(docId).get(); 
        if(doc.exists) { let user = doc.data(); document.getElementById('u_id').value = user.id; document.getElementById('u_fname').value = user.fname; document.getElementById('u_lname').value = user.lname; document.getElementById('u_dept').value = user.dept || ''; document.getElementById('u_phone').value = user.phone || ''; document.getElementById('u_role').value = user.role || 'staff'; document.getElementById('u_status').value = user.status || 'active'; document.getElementById('u_user').value = user.user; document.getElementById('u_pass').value = user.pass; } 
    } else { document.getElementById('u_mode').value = 'add'; document.getElementById('u_id').readOnly = false; document.getElementById('u_id').classList.remove('bg-light'); document.getElementById('u_id').value = "EMP-" + Date.now().toString().slice(-4); } 
    userModal.show(); 
}

document.getElementById('user-form').addEventListener('submit', async function(e) { 
    e.preventDefault(); 
    let submitBtn = this.querySelector('button[type="submit"]');
    let originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังตรวจสอบข้อมูล...';

    let mode = document.getElementById('u_mode').value; 
    let u_fname = document.getElementById('u_fname').value.trim();
    let u_lname = document.getElementById('u_lname').value.trim();

    try {
        let duplicateQuery = await db.collection('users')
            .where('fname', '==', u_fname)
            .where('lname', '==', u_lname)
            .get();

        let isDuplicate = false;
        if (!duplicateQuery.empty) {
            if (mode === 'add') {
                isDuplicate = true;
            } else {
                duplicateQuery.forEach(doc => {
                    if (doc.id !== mode) isDuplicate = true; 
                });
            }
        }

        if (isDuplicate) {
            showAlert('error', 'ข้อมูลซ้ำซ้อน!', `มีพนักงานชื่อ "${u_fname} ${u_lname}" อยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return; 
        }

        let userData = { 
            id: document.getElementById('u_id').value.trim(), 
            fname: u_fname, 
            lname: u_lname, 
            dept: document.getElementById('u_dept').value.trim(), 
            phone: document.getElementById('u_phone').value.trim(), 
            role: document.getElementById('u_role').value, 
            status: document.getElementById('u_status').value, 
            user: document.getElementById('u_user').value.trim(), 
            pass: document.getElementById('u_pass').value.trim() 
        }; 

        if(mode === 'add') { 
            userData.loginCount = 0; 
            await db.collection('users').add(userData); 
            showAlert('success', 'เพิ่มพนักงานสำเร็จ', ''); 
        } else { 
            await db.collection('users').doc(mode).update(userData); 
            showAlert('success', 'อัปเดตสำเร็จ', ''); 
        } 
        
        loadAdminUsersTable(); 
        userModal.hide(); 

    } catch(e) { 
        showAlert('error', 'ข้อผิดพลาด', e.message); 
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// ---------------------------------------------------------
// จัดการรถยนต์
// ---------------------------------------------------------
async function loadAdminCarsTable() { 
    let tbody = document.getElementById('admin-cars-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>'; 
    try { 
        let snapshot = await db.collection('cars').get(); tbody.innerHTML = ''; 
        snapshot.forEach(doc => { 
            let c = doc.data(); let sColor = c.status === 'พร้อมใช้งาน' ? 'text-success' : (c.status === 'กำลังซ่อมบำรุง' ? 'text-warning' : 'text-danger'); 
            let carModel = c.model || c.brand || '-'; 
            tbody.innerHTML += `<tr><td class="px-4"><span class="badge bg-light text-dark border fs-6">${c.license}</span></td><td>${carModel}</td><td>${c.company || '-'}</td><td>${c.color || '-'}</td><td><span class="${sColor} fw-bold"><i class="fas fa-circle" style="font-size:10px;"></i> ${c.status}</span></td><td class="text-end px-4"><button onclick="openCarModal('${doc.id}')" class="btn btn-sm btn-light border me-1"><i class="fas fa-edit text-muted"></i></button><button onclick="confirmDelete('cars', '${doc.id}')" class="btn btn-sm btn-light border"><i class="fas fa-trash text-danger"></i></button></td></tr>`; 
        }); 
    } catch(e) {} 
}

async function openCarModal(docId) { 
    document.getElementById('car-form').reset(); 
    if(docId && docId !== 'null') { 
        document.getElementById('c_mode').value = docId; let doc = await db.collection('cars').doc(docId).get(); 
        if(doc.exists) { 
            let car = doc.data(); document.getElementById('c_license').value = car.license; document.getElementById('c_color').value = car.color || ''; 
            document.getElementById('c_model').value = car.model || car.brand || ''; 
            document.getElementById('c_company').value = car.company || ''; document.getElementById('c_status').value = car.status || 'พร้อมใช้งาน'; 
        } 
    } else { document.getElementById('c_mode').value = 'add'; } carModal.show(); 
}

document.getElementById('car-form').addEventListener('submit', async function(e) { 
    e.preventDefault(); let mode = document.getElementById('c_mode').value; 
    let carData = { license: document.getElementById('c_license').value.trim(), color: document.getElementById('c_color').value.trim(), model: document.getElementById('c_model').value.trim(), company: document.getElementById('c_company').value.trim(), status: document.getElementById('c_status').value }; 
    try { if(mode === 'add') { await db.collection('cars').add(carData); showAlert('success', 'เพิ่มรถสำเร็จ', ''); } else { await db.collection('cars').doc(mode).update(carData); showAlert('success', 'อัปเดตสำเร็จ', ''); } loadAdminCarsTable(); carModal.hide(); } catch(e) { showAlert('error', 'ข้อผิดพลาด', e.message); } 
});

// ---------------------------------------------------------
// พิจารณาอนุมัติซ่อม
// ---------------------------------------------------------
async function loadAdminRepairsTable() { 
    let tbody = document.getElementById('admin-repairs-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>'; 
    try { 
        let snapshot = await db.collection('repairs').where('status', '==', 'pending').get(); 
        let allData = []; snapshot.forEach(doc => { let data = doc.data(); allData.push({ id: doc.id, data: data, ts: data.timestamp ? data.timestamp.toMillis() : 0 }); }); allData.sort((a, b) => b.ts - a.ts);
        tbody.innerHTML = ''; if(allData.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ไม่มีรายการรออนุมัติ</td></tr>`; return; } 
        allData.forEach(item => { let r = item.data; let displayDate = r.timestamp ? new Date(r.timestamp.toDate()).toLocaleString('th-TH') : (r.date || '-'); tbody.innerHTML += `<tr><td class="px-4 text-muted small">${displayDate}</td><td><span class="fw-bold text-primary">${r.license || '-'}</span></td><td>${r.name || '-'}<br><small class="text-muted">${r.dept || '-'}</small></td><td>${(r.detail || '').substring(0,25)}...</td><td class="text-center px-4"><button onclick="openApprovalModal('${item.id}')" class="btn btn-sm btn-primary rounded-pill px-4 shadow-sm fw-bold"><i class="fas fa-search me-1"></i> พิจารณา</button></td></tr>`; }); 
    } catch(e) {} 
}

async function openApprovalModal(docId) {
    document.getElementById('approve_doc_id').value = docId; document.getElementById('approval-reason').value = ''; let detailsDiv = document.getElementById('approval-details'); detailsDiv.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>'; approvalModal.show();
    try {
        let doc = await db.collection('repairs').doc(docId).get();
        if(doc.exists) {
            let data = doc.data(); let imgHtml = ''; let imagesArr = data.images || (data.imageUrl ? [data.imageUrl] : []);
            if(imagesArr.length > 0) { let imgTags = imagesArr.map(url => `<a href="${url}" target="_blank"><img src="${url}" class="img-fluid rounded-4 shadow-sm border mx-1 mb-2" style="height: 120px; width: 120px; object-fit: cover;"></a>`).join(''); imgHtml = `<div class="mb-3 text-center d-flex flex-wrap justify-content-center">${imgTags}</div><small class="text-muted text-center d-block mb-3">คลิกที่รูปเพื่อดูขนาดเต็ม</small>`; } else { imgHtml = `<div class="alert alert-light border border-dashed text-center small py-3 mb-3 text-muted">ผู้แจ้งไม่ได้แนบรูปภาพ</div>`; }
            detailsDiv.innerHTML = `${imgHtml}<div class="row g-2 small mb-1 bg-white p-3 rounded-4 shadow-sm border"><div class="col-4 text-muted fw-bold">ทะเบียนรถ:</div><div class="col-8 fw-bold text-primary fs-6">${data.license}</div><div class="col-4 text-muted fw-bold">ผู้แจ้ง:</div><div class="col-8">${data.name} (${data.dept})</div><div class="col-4 text-muted fw-bold">อาการเสีย:</div><div class="col-8 text-dark">${data.detail}</div></div>`;
        }
    } catch(e) { detailsDiv.innerHTML = '<div class="alert alert-danger">โหลดข้อมูลไม่สำเร็จ</div>'; }
}

async function submitApproval(stat) { let docId = document.getElementById('approve_doc_id').value; let reason = document.getElementById('approval-reason').value.trim(); try { await db.collection('repairs').doc(docId).update({ status: stat, adminReason: reason }); approvalModal.hide(); loadAdminRepairsTable(); loadAdminDashboard(); showAlert('success', 'พิจารณาสำเร็จ!', 'ระบบส่งผลให้พนักงานแล้ว'); } catch(e) { showAlert('error', 'ข้อผิดพลาด', e.message); } }

// ---------------------------------------------------------
// รายงานรวม
// ---------------------------------------------------------
async function loadAdminReportsTable() { 
    let tbody = document.getElementById('admin-reports-table').getElementsByTagName('tbody')[0]; if(!tbody) return; tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>'; 
    try { 
        let snapshot = await db.collection('checks').get(); let allData = []; snapshot.forEach(doc => { let data = doc.data(); allData.push({ id: doc.id, data: data, ts: data.timestamp ? data.timestamp.toMillis() : 0 }); }); allData.sort((a, b) => b.ts - a.ts);
        tbody.innerHTML = ''; if(allData.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ไม่มีข้อมูลประวัติ</td></tr>`; return; } 
        allData.forEach((item) => { let r = item.data; let displayDate = r.timestamp ? new Date(r.timestamp.toDate()).toLocaleString('th-TH') : (r.date || '-'); let badge = r.status === 'ปกติ' ? 'bg-success' : 'bg-danger'; tbody.innerHTML += `<tr><td class="px-4 text-muted small">${displayDate}</td><td><span class="fw-bold text-primary">${r.license || '-'}</span></td><td>${r.staff || '-'}</td><td class="px-4"><span class="badge ${badge}">${r.status || '-'}</span></td><td class="text-center px-4"><button onclick="viewDetails('check', '${item.id}')" class="btn btn-sm btn-info text-white"><i class="fas fa-search"></i></button></td></tr>`; }); 
    } catch(e) {} 
}

async function viewDetails(type, docId) {
    let body = document.getElementById('detail-modal-body'); if(!body) return; body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>'; detailModal.show();
    try {
        let doc = await db.collection('checks').doc(docId).get();
        if(doc.exists) {
            let data = doc.data(); let statusColor = data.status === 'ปกติ' ? 'text-success' : 'text-danger'; let defectsHtml = (data.status !== 'ปกติ' && data.defects && data.defects.length > 0) ? `<div class="mt-4"><div class="text-danger fw-bold mb-2">รายการที่พบจุดบกพร่อง:</div><ul class="list-unstyled small bg-danger bg-opacity-10 p-3 rounded-4 border border-danger shadow-sm">${data.defects.map(d => `<li class="mb-2"><i class="fas fa-times-circle text-danger me-2"></i>${d}</li>`).join('')}</ul></div>` : '';
            body.innerHTML = `<div class="p-2"><div class="d-flex align-items-center border-bottom pb-3 mb-4"><div class="bg-primary bg-opacity-10 p-3 rounded-circle me-3"><i class="fas fa-clipboard-check text-primary fs-4"></i></div><div><h5 class="fw-bold text-dark mb-0">ข้อมูลตรวจเช็คสภาพรถ</h5></div></div><div class="row g-3 mb-2"><div class="col-5 text-muted small fw-bold">ทะเบียนรถ:</div><div class="col-7 fw-bold text-primary">${data.license || '-'}</div><div class="col-5 text-muted small fw-bold">ผู้ตรวจสอบ:</div><div class="col-7">${data.staff || '-'}</div></div><div class="row mt-4 bg-light p-3 rounded-4 align-items-center"><div class="col-5 text-muted small fw-bold">ผลประเมิน:</div><div class="col-7 fw-bold fs-5 ${statusColor}">${data.status || '-'}</div></div>${defectsHtml}</div>`;
        } else { body.innerHTML = '<div class="alert alert-danger text-center">ไม่พบข้อมูล</div>'; }
    } catch(err) { body.innerHTML = '<div class="alert alert-danger text-center">ข้อผิดพลาดในการดึงข้อมูล</div>'; }
}

function filterTable(inputId, tableId) { let input = document.getElementById(inputId).value.toLowerCase(); let tbody = document.getElementById(tableId).getElementsByTagName('tbody')[0]; if(tbody) Array.from(tbody.getElementsByTagName('tr')).forEach(tr => { tr.style.display = tr.innerText.toLowerCase().includes(input) ? '' : 'none'; }); }
function showAlert(type, title, desc) { document.getElementById('alert-title').innerText = title; document.getElementById('alert-desc').innerText = desc; let icon = document.getElementById('alert-icon'), btn = document.getElementById('alert-buttons'); if(type === 'success') { icon.innerHTML = '<i class="fas fa-check-circle text-success" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-success w-100 fw-bold rounded-pill" data-bs-dismiss="modal">ตกลง</button>`; } else if(type === 'error') { icon.innerHTML = '<i class="fas fa-exclamation-circle text-danger" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-100 fw-bold rounded-pill" data-bs-dismiss="modal">ตกลง</button>`; } else if(type === 'delete') { icon.innerHTML = '<i class="fas fa-trash-alt text-danger" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-50 fw-bold rounded-pill" onclick="executeDelete()">ลบเลย</button><button class="btn btn-light border w-50 fw-bold rounded-pill" data-bs-dismiss="modal">ยกเลิก</button>`; } else if(type === 'logout') { icon.innerHTML = '<i class="fas fa-sign-out-alt text-warning" style="font-size:60px;"></i>'; btn.innerHTML = `<button class="btn btn-danger w-50 fw-bold rounded-pill" onclick="logout()">ออกจากระบบ</button><button class="btn btn-light border w-50 fw-bold rounded-pill" data-bs-dismiss="modal">ยกเลิก</button>`; } if(!alertModal) alertModal = new bootstrap.Modal(document.getElementById('alertModal')); alertModal.show(); }
function confirmDelete(type, docId) { deleteType = type; deleteId = docId; showAlert('delete', 'ยืนยันการลบ?', 'ข้อมูลที่ลบจะไม่สามารถกู้คืนได้'); }
async function executeDelete() { try { await db.collection(deleteType).doc(deleteId).delete(); if(deleteType === 'users') loadAdminUsersTable(); if(deleteType === 'cars') loadAdminCarsTable(); loadAdminDashboard(); alertModal.hide(); setTimeout(() => showAlert('success', 'ลบสำเร็จ', ''), 300); } catch(err) { alertModal.hide(); setTimeout(() => showAlert('error', 'ลบไม่สำเร็จ', 'เช็คสิทธิ์ Firebase'), 300); } }
function showLogoutModal() { showAlert('logout', 'ยืนยันออกจากระบบ?', 'คุณต้องการสิ้นสุดการทำงานใช่หรือไม่'); }
function logout() { sessionStorage.removeItem('carma_current_user'); window.location.href = 'index.html'; }
