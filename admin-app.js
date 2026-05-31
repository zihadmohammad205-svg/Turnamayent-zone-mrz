// ইউজার অ্যাপের সাথে হুবহু মিল রেখে ফায়ারবেস কনফিগারেশন সেটআপ
const firebaseConfig = {
  apiKey: "AIzaSyDriDDwOMv1xxnDvPHAW3PkrvbdUaaurSQ",
  authDomain: "ff-turnament-z.firebaseapp.com",
  projectId: "ff-turnament-z",
  storageBucket: "ff-turnament-z.firebasestorage.app",
  messagingSenderId: "881865084692",
  appId: "1:881865084692:web:866d1165680d5f734cbc01",
  measurementId: "G-5EYY9KEMC0"
};

// ফায়ারবেস ডিক্লেয়ারেশন
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- ৩-সেকেন্ডের স্পেশাল বটম টোস্ট নোটিফিকেশন লজিক ---
function showToast(message, type = "success") {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.innerText = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// --- মোডাল পপ-আপ ওপেন ও ক্লোজ ফাংশন ---
window.openModal = function(id) {
    document.getElementById(id).classList.add('active');
};
window.closeModal = function(id) {
    document.getElementById(id).classList.remove('active');
};

// --- অ্যাপ লোড হওয়ার সাথে সাথে রিয়েল-টাইম ডেটা লিসেন করা ---
document.addEventListener("DOMContentLoaded", () => {
    loadCurrentControls();
    listenDepositRequests();
    listenWithdrawRequests();
    listenMatchesForDropdown();
});

// --- ১. চলন্ত নোটিশ ফায়ারবেসে সেভ করা ---
document.getElementById('btn-update-notice').addEventListener('click', () => {
    const noticeText = document.getElementById('input-notice').value.trim();
    if(!noticeText) return alert("নোটিশ খালি রাখা যাবে না!");
    
    database.ref('app_controls').update({ notice: noticeText }).then(() => {
        showToast("চলন্ত নোটিশ আপডেট সফল হয়েছে!");
        closeModal('notice-modal');
    });
});

// --- ২. পেমেন্ট নাম্বারসমূহ সেভ করা ---
document.getElementById('btn-update-numbers').addEventListener('click', () => {
    const bkash = document.getElementById('input-bkash').value.trim();
    const nagad = document.getElementById('input-nagad').value.trim();
    const rocket = document.getElementById('input-rocket').value.trim();

    database.ref('app_controls').update({
        bkash_num: bkash || "Not Set",
        nagad_num: nagad || "Not Set",
        rocket_num: rocket || "Not Set"
    }).then(() => {
        showToast("সবগুলো পেমেন্ট নাম্বার সফলভাবে সেভ হয়েছে!");
        closeModal('payment-modal');
    });
});

// --- ৩. নতুন ১৬:৯ ম্যাচ তৈরি ও পাবলিশ ---
document.getElementById('btn-create-match').addEventListener('click', () => {
    const title = document.getElementById('m-title').value.trim();
    const datetime = document.getElementById('m-datetime').value.trim();
    const prize = parseFloat(document.getElementById('m-prize').value);
    const fee = parseFloat(document.getElementById('m-fee').value);
    const seats = parseInt(document.getElementById('m-seats').value);
    const thumb = document.getElementById('m-thumb').value.trim();
    const logo = document.getElementById('m-logo').value.trim();

    if(!title || !datetime || isNaN(prize) || isNaN(fee) || !thumb) {
        alert("স্টার চিহ্নিত বা প্রয়োজনীয় ম্যাচ ইনফো দিন!"); return;
    }

    const matchData = {
        title: title, date_time: datetime, win_prize: prize, entry_fee: fee,
        total_seats: seats, thumbnail_url: thumb, logo_url: logo || "https://via.placeholder.com/100"
    };

    database.ref('matches').push(matchData).then(() => {
        showToast("নতুন ম্যাচ ড্যাশবোর্ডে লাইভ করা হয়েছে!");
        closeModal('match-modal');
        // ইনপুট ক্লিয়ার
        document.getElementById('m-title').value = ""; document.getElementById('m-datetime').value = "";
        document.getElementById('m-prize').value = ""; document.getElementById('m-fee').value = "";
    });
});

// --- ৪. গেম মোড ক্যাটাগরি তৈরি ---
document.getElementById('btn-add-mode').addEventListener('click', () => {
    const name = document.getElementById('mode-name').value.trim();
    const img = document.getElementById('mode-img').value.trim();
    if(!name || !img) return alert("সব ঘর পূরণ করুন!");

    database.ref('game_modes').push({ name: name, image_url: img }).then(() => {
        showToast("গেম মোড ক্যাটাগরি যুক্ত হয়েছে!");
        closeModal('mode-modal');
        document.getElementById('mode-name').value = ""; document.getElementById('mode-img').value = "";
    });
});

// --- ৫. ডিপোজিট রিকোয়েস্ট ম্যানেজমেন্ট (অ্যাপ্রুভ ও রিজেক্ট লজিক) ---
function listenDepositRequests() {
    database.ref('deposit_requests').on('value', (snapshot) => {
        const area = document.getElementById('deposit-list-area');
        area.innerHTML = "";
        let hasPending = false;

        snapshot.forEach(child => {
            const reqId = child.key;
            const req = child.val();
            if(req.status === "pending") {
                hasPending = true;
                const div = document.createElement('div');
                div.className = "req-card";
                div.innerHTML = `
                    <div class="req-row"><span>User Name:</span><strong>${req.username}</strong></div>
                    <div class="req-row"><span>UID:</span><strong>${req.uid}</strong></div>
                    <div class="req-row"><span>Amount:</span><strong style="color:#2ecc71;">৳${req.amount}</strong></div>
                    <div class="req-row"><span>Sender Num:</span><strong>${req.sender_phone}</strong></div>
                    <div class="req-row"><span>TxID:</span><strong style="color:#45f3ff;">${req.txid}</strong></div>
                    <div class="req-actions">
                        <button class="btn-accept" onclick="approveDeposit('${reqId}', '${req.uid}', ${req.amount})">Accept</button>
                        <button class="btn-reject" onclick="rejectRequest('deposit_requests', '${reqId}')">Reject</button>
                    </div>`;
                area.appendChild(div);
            }
        });
        if(!hasPending) area.innerHTML = `<p class="no-data">কোনো পেন্ডিং ডিপোজিট রিকোয়েস্ট নেই।</p>`;
    });
}

window.approveDeposit = function(reqId, userUID, amount) {
    // ইউজারের ব্যালেন্স রিড করে তার সাথে ডিপোজিট অ্যামাউন্ট যোগ করা
    database.ref('users/' + userUID + '/balance').once('value', (snapshot) => {
        let currentBalance = snapshot.val() || 0;
        let newBalance = currentBalance + amount;
        
        database.ref('users/' + userUID).update({ balance: newBalance }).then(() => {
            return database.ref('deposit_requests/' + reqId).update({ status: "success" });
        }).then(() => {
            showToast("ডিপোজিট সফলভাবে অ্যাপ্রুভ হয়েছে এবং ওয়ালেটে টাকা যোগ হয়েছে!");
        });
    });
};

// --- ৬. উইথড্র রিকোয়েস্ট ম্যানেজমেন্ট (টাকা কেটে নিয়ে রিকোয়েস্ট সফল করা) ---
function listenWithdrawRequests() {
    database.ref('withdraw_requests').on('value', (snapshot) => {
        const area = document.getElementById('withdraw-list-area');
        area.innerHTML = "";
        let hasPending = false;

        snapshot.forEach(child => {
            const reqId = child.key;
            const req = child.val();
            if(req.status === "pending") {
                hasPending = true;
                const div = document.createElement('div');
                div.className = "req-card";
                div.style.borderLeftColor = "#e74c3c";
                div.innerHTML = `
                    <div class="req-row"><span>User Name:</span><strong>${req.username}</strong></div>
                    <div class="req-row"><span>UID:</span><strong>${req.uid}</strong></div>
                    <div class="req-row"><span>Method:</span><strong style="color:#ffc107;">${req.method}</strong></div>
                    <div class="req-row"><span>Amount:</span><strong style="color:#e74c3c;">৳${req.amount}</strong></div>
                    <div class="req-row"><span>Payment Num:</span><strong>${req.payment_phone}</strong></div>
                    <div class="req-actions">
                        <button class="btn-accept" style="background:#45f3ff;" onclick="approveWithdraw('${reqId}', '${req.uid}', ${req.amount})">Sent Success</button>
                        <button class="btn-reject" onclick="rejectRequest('withdraw_requests', '${reqId}')">Reject</button>
                    </div>`;
                area.appendChild(div);
            }
        });
        if(!hasPending) area.innerHTML = `<p class="no-data">কোনো পেন্ডিং উইথড্র রিকোয়েস্ট নেই।</p>`;
    });
}

window.approveWithdraw = function(reqId, userUID, amount) {
    // উইথড্র দিলে ইউজারের কারেন্ট ব্যালেন্স থেকে ওই টাকা মাইনাস করে দেওয়া
    database.ref('users/' + userUID + '/balance').once('value', (snapshot) => {
        let currentBalance = snapshot.val() || 0;
        let newBalance = currentBalance - amount;
        if(newBalance < 0) newBalance = 0; // মাইনাস সেফটি গার্ড

        database.ref('users/' + userUID).update({ balance: newBalance }).then(() => {
            return database.ref('withdraw_requests/' + reqId).update({ status: "success" });
        }).then(() => {
            showToast("উইথড্র রিকোয়েস্ট কমপ্লিট! ইউজারের ওয়ালেট থেকে টাকা কেটে নেওয়া হয়েছে।");
        });
    });
};

window.rejectRequest = function(node, reqId) {
    database.ref(node + '/' + reqId).update({ status: "rejected" }).then(() => {
        showToast("রিকোয়েস্টটি রিজেক্ট বা বাতিল করা হয়েছে।", "error");
    });
};

// --- ৭. রুম আইডি ও পাসওয়ার্ড আপলোডার মেকানিজম ---
function listenMatchesForDropdown() {
    database.ref('matches').on('value', (snapshot) => {
        const select = document.getElementById('room-match-select');
        select.innerHTML = '<option value="">ম্যাচ সিলেক্ট করুন</option>';
        snapshot.forEach(child => {
            select.innerHTML += `<option value="${child.key}">${child.val().title}</option>`;
        });
    });
}

document.getElementById('btn-update-room').addEventListener('click', () => {
    const matchId = document.getElementById('room-match-select').value;
    const roomId = document.getElementById('room-id').value.trim();
    const roomPass = document.getElementById('room-pass').value.trim();

    if(!matchId || !roomId || !roomPass) return alert("সব ঘর পূরণ করুন!");

    database.ref('matches/' + matchId + '/room_info').set({
        id: roomId, password: roomPass
    }).then(() => {
        showToast("এই ম্যাচের রুম আইডি ও পাসওয়ার্ড সফলভাবে পাবলিশ হয়েছে!");
        closeModal('room-modal');
        document.getElementById('room-id').value = ""; document.getElementById('room-pass').value = "";
    });
});

// --- ৮. হোম মেইন ব্যানার ইমেজ চেঞ্জার ---
document.getElementById('btn-update-banner').addEventListener('click', () => {
    const url = document.getElementById('input-banner-url').value.trim();
    if(!url) return alert("ইমেজ লিংক (URL) দিন!");

    database.ref('app_controls').update({ banner_url: url }).then(() => {
        showToast("হোম স্ক্রিনের টপ ব্যানার ইমেজ পরিবর্তন করা হয়েছে!");
        closeModal('banner-modal');
    });
});

// কারেন্ট ডাটা ইনপুট বক্সে প্রিপোপুলেট করার জন্য
function loadCurrentControls() {
    database.ref('app_controls').once('value', (snapshot) => {
        const data = snapshot.val();
        if(data) {
            if(data.notice) document.getElementById('input-notice').value = data.notice;
            if(data.bkash_num) document.getElementById('input-bkash').value = data.bkash_num;
            if(data.nagad_num) document.getElementById('input-nagad').value = data.nagad_num;
            if(data.rocket_num) document.getElementById('input-rocket').value = data.rocket_num;
            if(data.banner_url) document.getElementById('input-banner-url').value = data.banner_url;
        }
    });
}
