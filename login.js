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

document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = JSON.parse(sessionStorage.getItem('carma_current_user'));
    if (currentUser) { 
        window.location.href = currentUser.role === 'admin' ? 'admin.html' : 'staff.html'; 
    } else {
        try {
            const usersSnap = await db.collection('users').limit(1).get();
            if (usersSnap.empty) {
                await db.collection('users').doc('ADM-001').set({ id: "ADM-001", fname: "อลิส", lname: "มาร์ติน", user: "admin", pass: "admin123", role: "admin", dept: "ฝ่ายบริหาร", phone: "089-999-9999", status: "active", loginCount: 0 });
                await db.collection('users').doc('EMP-001').set({ id: "EMP-001", fname: "คาลอส", lname: "ไดรอน", user: "user", pass: "user123", role: "staff", dept: "แผนกจัดส่ง", phone: "081-234-5678", status: "active", loginCount: 0 });
                await db.collection('cars').add({ license: "ตอม4448", color: "ขาว", model: "Toyota Hilux", company: "บจก. ตัวอย่าง", status: "พร้อมใช้งาน" });
            }
        } catch(e) {}
    }
});

if(document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        let userIn = document.getElementById('username').value.trim();
        let passIn = document.getElementById('password').value.trim();
        let submitBtn = this.querySelector('button[type="submit"]');
        let errorBox = document.getElementById('login-error');
        
        let originalText = submitBtn.innerHTML; submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังตรวจสอบ...'; errorBox.style.display = 'none';

        try {
            const snapshot = await db.collection('users').where('user', '==', userIn).where('pass', '==', passIn).get();
            if (!snapshot.empty) {
                let foundUser = snapshot.docs[0].data(); let docId = snapshot.docs[0].id;
                if (foundUser.status === 'inactive') { errorBox.innerHTML = '<i class="fas fa-ban"></i> บัญชีนี้ถูกระงับ!'; errorBox.style.display = 'block'; submitBtn.disabled = false; submitBtn.innerHTML = originalText; return; }
                
                let newLoginCount = (foundUser.loginCount || 0) + 1;
                await db.collection('users').doc(docId).update({ loginCount: newLoginCount });
                foundUser.loginCount = newLoginCount;
                
                sessionStorage.setItem('carma_current_user', JSON.stringify(foundUser)); 
                window.location.href = foundUser.role === 'admin' ? 'admin.html' : 'staff.html';
            } else { 
                errorBox.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ข้อมูลไม่ถูกต้อง!'; errorBox.style.display = 'block'; submitBtn.disabled = false; submitBtn.innerHTML = originalText;
            }
        } catch (err) { errorBox.innerHTML = '<i class="fas fa-wifi"></i> เชื่อมต่อฐานข้อมูลไม่ได้'; errorBox.style.display = 'block'; submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
    });
}