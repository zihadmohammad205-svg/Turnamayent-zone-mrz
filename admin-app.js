// ফায়ারবেস কনফিগারেশন সেটআপ
const firebaseConfig = {
  apiKey: "AIzaSyDriDDwOMv1xxnDvPHAW3PkrvbdUaaurSQ",
  authDomain: "ff-turnament-z.firebaseapp.com",
  projectId: "ff-turnament-z",
  storageBucket: "ff-turnament-z.firebasestorage.app",
  messagingSenderId: "881865084692",
  appId: "1:881865084692:web:866d1165680d5f734cbc01",
  measurementId: "G-5EYY9KEMC0"
};

// ফায়ারবেস ইনিশিয়ালাইজেশন
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentActiveMatchId = null; // গ্লোবাল ট্র্যাকার
let allUsersDataArray = [];      // সার্চ কন্ট্রোলের গ্লোবাল ট্র্যাকার
let activeChatUID = null;        // চ্যাট সাপোর্টের জন্য গ্লোবাল ট্র্যাকার

// --- ৩-সেকেন্ডের বটম টোস্ট নোটিফিকেশন ---
function showToast(message, type = "success") {
    const toast = document.getElementById('toast-notification');
    document.getElementById('toast-message').innerText = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// --- মোডাল পপ-আপ ওপেন ও ক্লোজ ফাংশন ---
window.openModal = function(id) { document.getElementById(id).classList.add('active'); };
window.closeModal = function(id) { document.getElementById(id).classList.remove('active'); };

// ডম লোড হলে রিয়াল-টাইম ডেটা চালু করা
document.addEventListener("DOMContentLoaded", () => {
    loadCurrentControls();
    listenDepositRequests();
    listenWithdrawRequests();
    listenMatchesWithLiveCounterAndSorting();
    listenGameModesLive();
    listenUsersLive(); 
    listenAdminNotificationsLive(); 
    listenLiveSupportChats(); 
});

// --- ১. চলন্ত নোটিশ আপডেট ---
document.getElementById('btn-update-notice').addEventListener('click', () => {
    const noticeText = document.getElementById('input-notice').value.trim();
    if(!noticeText) return alert("নোটিশ লিখুন!");
    database.ref('app_controls').update({ notice: noticeText }).then(() => {
        showToast("চলন্ত নোটিশ আপডেট সফল হয়েছে!"); closeModal('notice-modal');
    });
});

// --- ২. পেমেন্ট নাম্বার সংরক্ষণ ---
document.getElementById('btn-update-numbers').addEventListener('click', () => {
    database.ref('app_controls').update({
        bkash_num: document.getElementById('input-bkash').value.trim() || "Not Set",
        nagad_num: document.getElementById('input-nagad').value.trim() || "Not Set",
        rocket_num: document.getElementById('input-rocket').value.trim() || "Not Set"
    }).then(() => { showToast("পেমেন্ট নাম্বারগুলো সেভ হয়েছে!"); closeModal('payment-modal'); });
});

// --- ৩. নোটিফিকেশন ফায়ারবেসে পাঠানো ---
document.getElementById('btn-send-global-notification').addEventListener('click', () => {
    const title = document.getElementById('noti-title').value.trim();
    const message = document.getElementById('noti-message').value.trim();
    const expiryHours = parseInt(document.getElementById('admin-noti-expiry').value); 

    if (!title || !message) {
        return alert("দয়া করে নোটিফিকেশনের শিরোনাম এবং মূল বার্তা দুটিই লিখুন!");
    }

    const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    const currentTimeMillis = Date.now();
    const currentTimestamp = new Date(currentTimeMillis).toLocaleString('en-US', options);
    const expiryTimeStamp = currentTimeMillis + (expiryHours * 60 * 60 * 1000);

    database.ref('notifications').push({
        title: title,
        message: message,
        time: currentTimestamp,
        timestamp: currentTimeMillis, 
        expiry_time: expiryTimeStamp   
    }).then(() => {
        showToast("ইন-অ্যাপ নোটিফিকেশন সফলভাবে ব্রডকাস্ট করা হয়েছে!");
        document.getElementById('noti-title').value = "";
        document.getElementById('noti-message').value = "";
    }).catch((err) => {
        alert("নোটিফিকেশন পাঠাতে সমস্যা হয়েছে: " + err.message);
    });
});

// --- ৪. নোটিফিকেশন লাইভ শো ---
function listenAdminNotificationsLive() {
    database.ref('notifications').on('value', (snapshot) => {
        const container = document.getElementById('admin-noti-list-container');
        if (!container) return;
        container.innerHTML = "";

        if (!snapshot.exists()) {
            container.innerHTML = `<p style="color: #666; text-align: center; font-size: 12px; margin: 10px 0;">বর্তমানে ডাটাবেসে কোনো একটিভ নোটিফিকেশন নেই।</p>`;
            return;
        }

        let notiArray = [];
        snapshot.forEach((child) => {
            notiArray.push({ id: child.key, data: child.val() });
        });

        notiArray.sort((a, b) => (b.data.timestamp || 0) - (a.data.timestamp || 0));

        notiArray.forEach((item) => {
            const notiId = item.id;
            const noti = item.data;

            const card = document.createElement('div');
            card.style.background = "#1f2833";
            card.style.border = "1px solid #2b3542";
            card.style.padding = "10px";
            card.style.borderRadius = "6px";
            card.style.marginBottom = "8px";
            card.style.display = "flex";
            card.style.justifyContent = "space-between";
            card.style.alignItems = "center";
            card.style.gap = "10px";

            card.innerHTML = `
                <div style="flex: 1; min-width: 0;">
                    <h4 style="margin: 0 0 4px 0; color: #45f3ff; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${noti.title} 
                        <span style="font-size: 9px; color: #aaa; font-weight: normal; margin-left: 5px;">(${noti.time})</span>
                    </h4>
                    <p style="margin: 0; color: #fff; font-size: 11px; line-height: 1.4; white-space: pre-line;">${noti.message}</p>
                </div>
                <div>
                    <button onclick="deleteNotificationDirect('${notiId}')" style="background: #e74c3c; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

window.deleteNotificationDirect = function(notiId) {
    if (confirm("আপনি কি নিশ্চিতভাবে এই নোটিফিকেশনটি মুছে ফেলতে চান? এটি ইউজার অ্যাপ থেকেও সাথে সাথে মুছে যাবে।")) {
        database.ref('notifications/' + notiId).remove().then(() => {
            showToast("নোটিফিকেশনটি সফলভাবে ডিলিট করা হয়েছে!", "error");
        }).catch((err) => {
            alert("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
        });
    }
};

// --- ৫. ক্যাটাগরি ফর্ম কন্ট্রোল ---
window.toggleCategoryForm = function() {
    const formArea = document.getElementById('add-category-form-area');
    const toggleIcon = document.getElementById('toggle-cat-form-btn');
    if(formArea.style.display === "none") {
        formArea.style.display = "block";
        toggleIcon.className = "fa-solid fa-circle-minus";
        toggleIcon.style.color = "#e74c3c";
    } else {
        formArea.style.display = "none";
        toggleIcon.className = "fa-solid fa-circle-plus";
        toggleIcon.style.color = "#2ecc71";
    }
};

document.getElementById('btn-save-new-category').addEventListener('click', () => {
    const name = document.getElementById('new-cat-name').value.trim();
    const img = document.getElementById('new-cat-img').value.trim();
    
    if(!name || !img) return alert("ক্যাটাগরির নাম এবং ইমেজ লিংক দুটোই দিন!");
    
    database.ref('game_modes').push({
        name: name,
        image_url: img
    }).then(() => {
        showToast("নতুন ক্যাটাগরি সফলভাবে যোগ হয়েছে!");
        document.getElementById('new-cat-name').value = "";
        document.getElementById('new-cat-img').value = "";
        toggleCategoryForm();
    });
});

// --- ৬. ক্যাটাগরি লাইভ লিস্ট ---
function listenGameModesLive() {
    database.ref('game_modes').on('value', (snapshot) => {
        const listArea = document.getElementById('live-categories-list-area');
        const matchCatDropdown = document.getElementById('m-category');
        
        listArea.innerHTML = "";
        matchCatDropdown.innerHTML = '<option value="">ক্যাটাগরি সিলেক্ট করুন...</option>';
        
        if(!snapshot.exists()) {
            listArea.innerHTML = `<p class="no-data">কোনো ক্যাটাগরি পাওয়া যায়নি। প্লাস আইকনে ক্লিক করে যোগ করুন।</p>`;
            return;
        }
        
        snapshot.forEach((child) => {
            const catId = child.key;
            const catData = child.val();
            
            const option = new Option(catData.name, catData.name);
            matchCatDropdown.add(option);
            
            const div = document.createElement('div');
            div.className = "req-card";
            div.style.borderLeftColor = "#45f3ff";
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.justifyContent = "space-between";
            div.style.padding = "8px 12px";
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${catData.image_url}" style="width: 35px; height: 35px; object-fit: cover; border-radius: 6px; background: #000;" onerror="this.src='https://via.placeholder.com/50'">
                    <strong>${catData.name}</strong>
                </div>
                <button class="btn-reject" style="width: auto; padding: 5px 10px; margin: 0; font-size: 11px;" onclick="deleteCategory('${catId}', '${catData.name}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            listArea.appendChild(div);
        });
    });
}

window.deleteCategory = function(catId, name) {
    if(confirm(`আপনি কি "${name}" ক্যাটাগরিট ডিলিট করতে চান?`)) {
        database.ref('game_modes/' + catId).remove().then(() => {
            showToast("ক্যাটাগরি ডিলিট করা হয়েছে!", "error");
        });
    }
};

// --- ৭. নতুন ম্যাচ পাবলিশ ---
document.getElementById('btn-create-match').addEventListener('click', () => {
    const category = document.getElementById('m-category').value;
    const title = document.getElementById('m-title').value.trim();
    const datetime = document.getElementById('m-datetime').value.trim();
    const prize = parseFloat(document.getElementById('m-prize').value);
    const fee = parseFloat(document.getElementById('m-fee').value);
    const seats = parseInt(document.getElementById('m-seats').value);
    const thumb = document.getElementById('m-thumb').value.trim();
    const logo = document.getElementById('m-logo').value.trim();

    if(!category || !title || !datetime || isNaN(prize) || isNaN(fee) || !thumb) return alert("ক্যাটাগরিসহ সব ঘর পূরণ করুন!");

    database.ref('matches').push({
        category: category,
        title: title, date_time: datetime, win_prize: prize, entry_fee: fee,
        total_seats: seats, thumbnail_url: thumb, logo_url: logo || "https://via.placeholder.com/100"
    }).then(() => {
        showToast("নতুন ম্যাচ ড্যাশবোর্ডে লাইভ করা হয়েছে!"); closeModal('match-modal');
        document.getElementById('m-category').value = ""; document.getElementById('m-title').value = ""; 
        document.getElementById('m-datetime').value = ""; document.getElementById('m-prize').value = ""; 
        document.getElementById('m-fee').value = ""; document.getElementById('m-thumb').value = ""; 
        document.getElementById('m-logo').value = "";
    });
});

// --- ৮. লাইভ ম্যাচ লোডার ---
function listenMatchesWithLiveCounterAndSorting() {
    database.ref('matches').on('value', (snapshot) => {
        const matchContainer = document.getElementById('admin-match-list');
        matchContainer.innerHTML = "";
        if(!snapshot.exists()) { matchContainer.innerHTML = `<p class="no-data">কোনো একটিভ ম্যাচ পাওয়া যায়নি।</p>`; return; }

        let matchArray = [];
        snapshot.forEach((child) => { matchArray.push({ id: child.key, data: child.val() }); });
        matchArray.sort((a, b) => b.data.date_time.toLowerCase().localeCompare(a.data.date_time.toLowerCase()));

        matchArray.forEach((item) => {
            const matchId = item.id; const match = item.data;
            const currentRoomId = (match.room_info && match.room_info.id) ? match.room_info.id : "";
            const currentRoomPass = (match.room_info && match.room_info.password) ? match.room_info.password : "";

            let joinedCount = 0;
            if(match.joined_users) { joinedCount = Object.keys(match.joined_users).length; }

            const card = document.createElement('div');
            card.className = "admin-match-card";
            card.innerHTML = `
                <div class="match-thumb-box">
                    <img src="${match.thumbnail_url}" alt="Thumbnail" onerror="this.src='https://via.placeholder.com/640x360?text=No+Image'">
                    <div class="match-overlay-info">
                        <span style="background:#45f3ff; color:#0b0c10; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${match.category || 'Uncategorized'}</span>
                        <h4 style="margin-top:4px;">${match.title}</h4>
                        <div class="match-meta-grid">
                            <div class="meta-item"><i class="fa-regular fa-clock"></i> ${match.date_time}</div>
                            <div class="meta-item"><i class="fa-solid fa-chair"></i> Seats: ${match.total_seats}</div>
                            <div class="meta-item highlight"><i class="fa-solid fa-sack-dollar"></i> Win: ৳${match.win_prize}</div>
                            <div class="meta-item fee-tag"><i class="fa-solid fa-ticket"></i> Fee: ৳${match.entry_fee}</div>
                            <div class="meta-item joined-count-tag"><i class="fa-solid fa-users-viewfinder"></i> Joined Total Player: ${joinedCount} / ${match.total_seats}</div>
                        </div>
                    </div>
                </div>
                <div class="match-control-body">
                    <div class="room-inputs-inline">
                        <div class="room-field"><label>Room ID</label><input type="text" id="room-id-${matchId}" value="${currentRoomId}"></div>
                        <div class="room-field"><label>Password</label><input type="text" id="room-pass-${matchId}" value="${currentRoomPass}"></div>
                    </div>
                    <div class="card-action-buttons">
                        <div class="action-row-1">
                            <button class="btn-save-room" onclick="updateRoomInfo('${matchId}')"><i class="fa-solid fa-save"></i> Save Room</button>
                            <button class="btn-delete-match" onclick="deleteMatch('${matchId}', '${match.title}')"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                        <button class="btn-winner-panel" onclick="openWinnerManagement('${matchId}', ${match.win_prize})">
                            <i class="fa-solid fa-trophy"></i> Winner & Join List Panel
                        </button>
                    </div>
                </div>`;
            matchContainer.appendChild(card);
        });
    });
}

window.updateRoomInfo = function(matchId) {
    const rId = document.getElementById(`room-id-${matchId}`).value.trim();
    const rPass = document.getElementById(`room-pass-${matchId}`).value.trim();
    if(!rId || !rPass) return alert("আইডি এবং পাসওয়ার্ড দিন!");
    database.ref('matches/' + matchId + '/room_info').set({ id: rId, password: rPass }).then(() => { showToast("রুম আইডি ও পাসওয়ার্ড সেভ হয়েছে!"); });
};

window.deleteMatch = function(matchId, title) {
    if(confirm(`আপনি কি "${title}" ম্যাচটি ডিলিট করতে চান?`)) {
        database.ref('matches/' + matchId).remove().then(() => { showToast("ম্যাচটি ডিলিট করা হয়েছে!", "error"); });
    }
};

// --- ৯. উইনার ও জয়েন লিস্ট কন্ট্রোল ---
window.openWinnerManagement = function(matchId, winPrize) {
    currentActiveMatchId = matchId;
    document.getElementById('win-prize-distribute').value = winPrize;

    const select1st = document.getElementById('select-1st-place');
    const select2nd = document.getElementById('select-2nd-place');
    const select3rd = document.getElementById('select-3rd-place');
    const listArea = document.getElementById('winner-joined-users-list');

    select1st.innerHTML = '<option value="">1st Place সিলেক্ট করুন...</option>';
    select2nd.innerHTML = '<option value="">2nd Place সিলেক্ট করুন...</option>';
    select3rd.innerHTML = '<option value="">3rd Place সিলেক্ট করুন...</option>';
    listArea.innerHTML = `<p class="no-data">প্লেয়ার লিস্ট চেক করা হচ্ছে...</p>`;

    database.ref('matches/' + matchId + '/joined_users').once('value', (snapshot) => {
        if(!snapshot.exists()) { listArea.innerHTML = `<p class="no-data" style="color:#e74c3c;">এই ম্যাচে এখনও কোনো প্লেয়ার জয়েন করেনি।</p>`; openModal('winner-management-modal'); return; }

        listArea.innerHTML = "";
        snapshot.forEach((child) => {
            const userUID = child.key; const userData = child.val();
            const username = userData.username || "Unknown Player";
            const slotsBooked = userData.slots_booked || 1;

            const opt1 = new Option(`${username} (${userUID})`, userUID);
            const opt2 = new Option(`${username} (${userUID})`, userUID);
            const opt3 = new Option(`${username} (${userUID})`, userUID);
            select1st.add(opt1); select2nd.add(opt2); select3rd.add(opt3);

            let teamRowsHtml = "";
            if(userData.teammates) {
                Object.values(userData.teammates).forEach((member, index) => {
                    teamRowsHtml += `<div class="team-member-row"><i class="fa-solid fa-user-tag" style="color:#45f3ff;"></i> Member ${index+1}: ${member}</div>`;
                });
            } else {
                teamRowsHtml = `<div style="padding:5px 0; font-style:italic; color:#666;">কোনো সাব-প্লেয়ার বা স্কোয়াড টিমমেট নেই (Solo)</div>`;
            }

            const collapseCard = document.createElement('div');
            collapseCard.className = "leader-collapse-card";
            collapseCard.innerHTML = `
                <div class="leader-header-click" onclick="toggleSquadDropdown(this)">
                    <span><i class="fa-solid fa-user-shield" style="color:#2ecc71;"></i> <strong>${username}</strong> (${slotsBooked} Slots)</span>
                    <i class="fa-solid fa-chevron-down" style="font-size:10px; color:#aaa;"></i>
                </div>
                <div class="squad-dropdown-body">${teamRowsHtml}</div>`;
            listArea.appendChild(collapseCard);
        });

        openModal('winner-management-modal');
    });
};

window.toggleSquadDropdown = function(element) {
    const body = element.nextElementSibling;
    const icon = element.querySelector('.fa-chevron-down');
    body.classList.toggle('open');
    if(body.classList.contains('open')) { icon.style.transform = "rotate(180deg)"; } else { icon.style.transform = "rotate(0deg)"; }
};

// --- ১০. প্রাইজ ডিসট্রিবিউশন ---
document.getElementById('btn-confirm-prize-distribution').addEventListener('click', () => {
    const finalPrize = parseFloat(document.getElementById('win-prize-distribute').value);
    const uid1st = document.getElementById('select-1st-place').value;
    const uid2nd = document.getElementById('select-2nd-place').value;
    const uid3rd = document.getElementById('select-3rd-place').value;

    if(!uid1st) return alert("কমপক্ষে ১ম স্থান অধিকারী অবশ্যই সিলেক্ট করুন!");
    if(isNaN(finalPrize)) return alert("উইন প্রাইজ এর সঠিক অংকটি বসান!");

    database.ref('users/' + uid1st).once('value').then((snap) => {
        let uData = snap.val() || {};
        let oldBal = uData.balance || 0;
        let oldEarned = uData.total_earned || 0;
        return database.ref('users/' + uid1st).update({ 
            balance: oldBal + finalPrize,
            total_earned: oldEarned + finalPrize 
        });
    }).then(() => {
        if(uid2nd) {
            return database.ref('users/' + uid2nd).once('value').then((snap2) => {
                let uData2 = snap2.val() || {};
                let oldBal2 = uData2.balance || 0;
                let oldEarned2 = uData2.total_earned || 0;
                let bonus = finalPrize * 0.20;
                return database.ref('users/' + uid2nd).update({ 
                    balance: oldBal2 + bonus,
                    total_earned: oldEarned2 + bonus
                });
            });
        }
    }).then(() => {
        if(uid3rd) {
            return database.ref('users/' + uid3rd).once('value').then((snap3) => {
                let uData3 = snap3.val() || {};
                let oldBal3 = uData3.balance || 0;
                let oldEarned3 = uData3.total_earned || 0;
                let bonus3 = finalPrize * 0.10;
                return database.ref('users/' + uid3rd).update({ 
                    balance: oldBal3 + bonus3,
                    total_earned: oldEarned3 + bonus3
                });
            });
        }
    }).then(() => {
        return database.ref('matches/' + currentActiveMatchId).update({ match_status: "completed", win_prize: finalPrize });
    }).then(() => {
        showToast("উইনারদের ওয়ালেটে ও লিডারবোর্ডে প্রাইজমানি যোগ হয়েছে!");
        closeModal('winner-management-modal');
        closeModal('all-matches-modal');
    }).catch(err => alert("সমস্যা হয়েছে: " + err.message));
});

// --- ১১. ডিপোজিট রিকোয়েস্ট ---
function listenDepositRequests() {
    database.ref('deposit_requests').on('value', (snapshot) => {
        const area = document.getElementById('deposit-list-area');
        const badge = document.getElementById('deposit-badge');
        area.innerHTML = ""; let pendingCount = 0;

        snapshot.forEach(child => {
            const reqId = child.key; const req = child.val();
            if(req.status === "pending") {
                pendingCount++;
                const div = document.createElement('div'); div.className = "req-card";
                div.innerHTML = `
                    <div class="req-row"><span>User:</span><strong>${req.username}</strong></div>
                    <div class="req-row"><span>Amount:</span><strong style="color:#2ecc71;">৳${req.amount}</strong></div>
                    <div class="req-row"><span>Sender Phone:</span><strong style="color:#ff9f43;">${req.sender_phone || 'N/A'}</strong></div>
                    <div class="req-row"><span>TxID:</span><strong style="color:#45f3ff;">${req.txid}</strong></div>
                    <div class="req-actions">
                        <button class="btn-accept" onclick="approveDeposit('${reqId}', '${req.uid}', ${req.amount})">Accept</button>
                        <button class="btn-reject" onclick="rejectRequest('deposit_requests', '${reqId}')">Reject</button>
                    </div>`;
                area.appendChild(div);
            }
        });
        badge.style.display = pendingCount > 0 ? "block" : "none";
        if(pendingCount === 0) area.innerHTML = `<p class="no-data">কোনো পেন্ডিং ডিপোজিট রিকোয়েস্ট নেই।</p>`;
    });
}
window.approveDeposit = function(reqId, userUID, amount) {
    database.ref('users/' + userUID + '/balance').once('value', (snapshot) => {
        let curBal = snapshot.val() || 0;
        database.ref('users/' + userUID).update({ balance: curBal + amount }).then(() => {
            return database.ref('deposit_requests/' + reqId).update({ status: "success" });
        }).then(() => { showToast("ডিপোজিট সফলভাবে অ্যাপ্রুভ হয়েছে!"); });
    });
};

// --- ১২. উইথড্র রিকোয়েস্ট ---
function listenWithdrawRequests() {
    database.ref('withdraw_requests').on('value', (snapshot) => {
        const area = document.getElementById('withdraw-list-area');
        const badge = document.getElementById('withdraw-badge');
        area.innerHTML = ""; let pendingCount = 0;

        snapshot.forEach(child => {
            const reqId = child.key; const req = child.val();
            if(req.status === "pending") {
                pendingCount++;
                const div = document.createElement('div'); div.className = "req-card"; div.style.borderLeftColor = "#e74c3c";
                div.innerHTML = `
                    <div class="req-row"><span>User:</span><strong>${req.username}</strong></div>
                    <div class="req-row"><span>Method:</span><strong>${req.method}</strong></div>
                    <div class="req-row"><span>Amount:</span><strong style="color:#e74c3c;">৳${req.amount}</strong></div>
                    <div class="req-row"><span>Phone:</span><strong>${req.payment_phone}</strong></div>
                    <div class="req-actions">
                        <button class="btn-accept" style="background:#45f3ff;" onclick="approveWithdraw('${reqId}', '${req.uid}', ${req.amount})">Success</button>
                        <button class="btn-reject" onclick="rejectRequest('withdraw_requests', '${reqId}')">Reject</button>
                    </div>`;
                area.appendChild(div);
            }
        });
        badge.style.display = pendingCount > 0 ? "block" : "none";
        if(pendingCount === 0) area.innerHTML = `<p class="no-data">কোনো পেন্ডিং উইথড্র রিকোয়েস্ট নেই।</p>`;
    });
}
window.approveWithdraw = function(reqId, userUID, amount) {
    database.ref('withdraw_requests/' + reqId).update({ status: "success" }).then(() => {
        showToast("উইথড্র রিকোয়েস্ট সম্পন্ন হয়েছে!");
    }).catch(() => {
        showToast("কিছু একটা সমস্যা হয়েছে!", "error");
    });
};
window.rejectRequest = function(node, reqId) {
    const reqRef = database.ref(node + '/' + reqId);
    reqRef.once('value').then(snap => {
        const reqData = snap.val();
        if (!reqData) return;

        const updatePromise = reqRef.update({ status: "rejected" });

        // শুধু withdraw reject হলে টাকা ফেরত দাও
        if (node === 'withdraw_requests' && reqData.uid && reqData.amount) {
            const userRef = database.ref('users/' + reqData.uid);
            return userRef.once('value').then(uSnap => {
                const userData = uSnap.val();
                const currentBalance = userData ? (userData.balance || 0) : 0;
                const refundedBalance = currentBalance + reqData.amount;
                return Promise.all([
                    updatePromise,
                    userRef.update({ balance: refundedBalance })
                ]);
            });
        }
        return updatePromise;
    }).then(() => {
        showToast("রিকোয়েস্টটি বাতিল করা হয়েছে এবং টাকা ফেরত দেওয়া হয়েছে।", "error");
    }).catch(() => {
        showToast("কিছু একটা সমস্যা হয়েছে!", "error");
    });
};

// --- ১৩. হোম ব্যানার ইমেজ चेन्जर ---
document.getElementById('btn-update-banner').addEventListener('click', () => {
    const url = document.getElementById('input-banner-url').value.trim();
    if(!url) return alert("URL দিন!");
    database.ref('app_controls').update({ banner_url: url }).then(() => {
        showToast("হোম ব্যানার ইমেজ পরিবর্তন করা হয়েছে!"); closeModal('banner-modal');
    });
});

// --- ১৪. লাইভ ইউজার লিস্ট ও সার্চ ---
function listenUsersLive() {
    database.ref('users').on('value', (snapshot) => {
        const totalUsersCount = document.getElementById('total-users-count');
        const headerTotalUsers = document.getElementById('header-total-users');
        
        allUsersDataArray = [];
        
        if (!snapshot.exists()) {
            if(totalUsersCount) totalUsersCount.innerText = "০";
            if(headerTotalUsers) headerTotalUsers.innerHTML = `<i class="fa-solid fa-users"></i> ০ জন ইউজার`;
            document.getElementById('admin-user-list-area').innerHTML = `<p class="no-data">অ্যাপে এখনও কোনো ইউজার রেজিস্টার করেনি।</p>`;
            return;
        }
        
        let userCount = 0;
        snapshot.forEach((child) => {
            userCount++;
            const userUID = child.key;
            const userData = child.val();
            
            allUsersDataArray.push({
                uid: userUID,
                username: userData.username || "Unknown User",
                email: userData.gmail || userData.email || "No Email Provided",
                phone: userData.phone || "No Phone Number",
                balance: userData.balance !== undefined ? userData.balance : 0,
                total_earned: userData.total_earned !== undefined ? userData.total_earned : 0
            });
        });
        
        if(totalUsersCount) totalUsersCount.innerText = userCount;
        if(headerTotalUsers) {
            headerTotalUsers.innerHTML = `<i class="fa-solid fa-users"></i> ${userCount} জন ইউজার`;
        }
        renderUsersToDOM(allUsersDataArray);
    });
}

function renderUsersToDOM(usersArray) {
    const userListArea = document.getElementById('admin-user-list-area');
    userListArea.innerHTML = "";
    
    if (usersArray.length === 0) {
        userListArea.innerHTML = `<p class="no-data" style="color: #e74c3c;">এই সার্চ কি-ওয়ার্ডের কোনো ইউজার পাওয়া যায়নি!</p>`;
        return;
    }
    
    usersArray.forEach((user) => {
        const div = document.createElement('div');
        div.className = "req-card";
        div.style.borderLeftColor = "#2ecc71";
        div.style.padding = "15px";
        div.style.marginBottom = "15px";
        div.style.background = "#0b0c10";
        
        div.innerHTML = `
            <div class="req-row" style="margin-bottom: 6px;">
                <span><i class="fa-solid fa-user" style="color: #2ecc71; margin-right: 5px;"></i> Name:</span>
                <strong>${user.username}</strong>
            </div>
            <div class="req-row" style="font-size: 11px; margin-bottom: 8px; background: #1f2833; padding: 4px 8px; border-radius: 4px;">
                <span>UID:</span>
                <strong style="color: #aaa; font-family: monospace;">${user.uid}</strong>
            </div>
            <div class="req-row" style="margin-bottom: 6px;">
                <span><i class="fa-solid fa-envelope" style="color: #45f3ff; margin-right: 5px;"></i> Gmail:</span>
                <strong style="color: #fff; font-size: 11px;">${user.email}</strong>
            </div>
            <div class="req-row" style="margin-bottom: 8px;">
                <span><i class="fa-solid fa-phone" style="color: #ff9f43; margin-right: 5px;"></i> Phone:</span>
                <strong style="color: #fff;">${user.phone}</strong>
            </div>
            <hr style="border: 0; height: 1px; background: #2b3542; margin: 10px 0;">
            <div class="req-row" style="align-items: center; margin-bottom: 6px;">
                <span>Current Balance:</span>
                <div id="balance-display-box-${user.uid}" style="display: flex; align-items: center; gap: 8px;">
                    <strong style="color: #2ecc71; font-size: 15px;">৳${user.balance}</strong>
                    <button onclick="showBalanceEditForm('${user.uid}', ${user.balance})" style="background: #3a3f47; color: #45f3ff; border: none; padding: 3px 8px; font-size: 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                </div>
            </div>
            <div id="balance-edit-input-box-${user.uid}" style="display: none; gap: 8px; margin-bottom: 8px; margin-top: 5px;">
                <input type="number" id="new-balance-value-${user.uid}" value="${user.balance}" style="width: 100px; padding: 5px; font-size: 13px; background: #1f2833; border: 1px solid #45f3ff; color: #fff; border-radius: 4px;">
                <button onclick="saveUserNewBalance('${user.uid}')" style="background: #2ecc71; color: #0b0c10; border: none; padding: 5px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;">Save</button>
                <button onclick="cancelBalanceEdit('${user.uid}')" style="background: #e74c3c; color: #fff; border: none; padding: 5px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
            <div class="req-row">
                <span>Total Earned:</span>
                <strong style="color: #45f3ff;">৳${user.total_earned}</strong>
            </div>`;
        userListArea.appendChild(div);
    });
}

window.filterUsersList = function() {
    const searchKey = document.getElementById('admin-user-search-input').value.toLowerCase().trim();
    if (!searchKey) { renderUsersToDOM(allUsersDataArray); return; }
    const filteredUsers = allUsersDataArray.filter(user => {
        return user.uid.toLowerCase().includes(searchKey) || user.phone.toLowerCase().includes(searchKey);
    });
    renderUsersToDOM(filteredUsers);
};

window.showBalanceEditForm = function(uid, currentBal) {
    document.getElementById(`balance-display-box-${uid}`).style.display = 'none';
    document.getElementById(`balance-edit-input-box-${uid}`).style.display = 'flex';
    document.getElementById(`new-balance-value-${uid}`).focus();
};

window.cancelBalanceEdit = function(uid) {
    document.getElementById(`balance-display-box-${uid}`).style.display = 'flex';
    document.getElementById(`balance-edit-input-box-${uid}`).style.display = 'none';
};

window.saveUserNewBalance = function(uid) {
    const inputField = document.getElementById(`new-balance-value-${uid}`);
    const newBalance = parseFloat(inputField.value);
    if (isNaN(newBalance) || newBalance < 0) return alert("দয়া করে সঠিক ব্যালেন্স ইনপুট দিন!");
    
    database.ref('users/' + uid).update({ balance: newBalance }).then(() => {
        showToast("ইউজারের ব্যালেন্স সফলভাবে আপডেট করা হয়েছে!");
    });
};

// --- ১৫. লাইভ চ্যাট সাপোর্ট সিস্টেম (ডিলিট বাটন মেকানিজম সহ) ---
function listenLiveSupportChats() {
    database.ref('chats').on('value', (snapshot) => {
        const usersListContainer = document.getElementById('admin-chat-users-list');
        const chatBadge = document.getElementById('chat-badge');
        const clearBtn = document.getElementById('btn-clear-chat-history');
        if(!usersListContainer) return;
        usersListContainer.innerHTML = "";

        if(!snapshot.exists()) {
            if(chatBadge) chatBadge.style.display = "none";
            if(clearBtn) clearBtn.style.display = "none";
            usersListContainer.innerHTML = `<p style="color:#666; font-size:11px; text-align:center; margin-top:20px;">কোনো চ্যাট হিস্ট্রি নেই</p>`;
            document.getElementById('active-chat-user-header').innerHTML = '<span>ইউজার সিলেক্ট করুন</span>';
            document.getElementById('admin-chat-messages-body').innerHTML = '<p style="color:#555; font-size:11px; text-align:center; margin-top:40px;">মেসেজ হিস্ট্রি দেখতে বাম থেকে কোনো ইউজারের উপর ক্লিক করুন।</p>';
            activeChatUID = null;
            return;
        }

        // Admin-এর seen timestamp পড়ো
        database.ref('admin_chat_seen').once('value', (seenSnap) => {
            const seenData = seenSnap.val() || {};
            let hasUnread = false;

            snapshot.forEach((userChatNode) => {
                const userUID = userChatNode.key;
                let lastMsgText = "Click to view chat";
                let senderName = "UID: " + userUID.substring(0, 8) + "...";
                let lastMsgTimestamp = 0;
                let lastMsgSender = "";

                userChatNode.forEach((msgChild) => {
                    const msgData = msgChild.val();
                    if(msgData.message) lastMsgText = msgData.message;
                    if(msgData.name && msgData.name !== "Admin Support") senderName = msgData.name;
                    if(msgData.timestamp && msgData.timestamp > lastMsgTimestamp) {
                        lastMsgTimestamp = msgData.timestamp;
                        lastMsgSender = msgData.sender || "";
                    }
                });

                // শুধু User-এর message unread হিসেবে গণ্য হবে
                const adminSeenAt = seenData[userUID] || 0;
                const isUnread = lastMsgSender !== "admin" && lastMsgTimestamp > adminSeenAt;
                if(isUnread) hasUnread = true;

                const userRow = document.createElement('div');
                userRow.className = `chat-user-item ${activeChatUID === userUID ? 'active' : ''}`;
                userRow.innerHTML = `
                    <strong style="display:block; color:#fff; font-size:11px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;"><i class="fa-solid fa-user-circle"></i> ${senderName} ${isUnread ? '<span style="color:#ff4757; font-size:9px;">● নতুন</span>' : ''}</strong>
                    <span style="font-size:9px; color:#888; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display:block; margin-top:2px;">${lastMsgText}</span>
                `;
                userRow.onclick = () => { selectUserToChat(userUID, senderName); };
                usersListContainer.appendChild(userRow);
            });

            if(chatBadge) chatBadge.style.display = hasUnread ? "block" : "none";
        });
    });
}

function selectUserToChat(uid, name) {
    activeChatUID = uid;

    // Admin এই chat দেখেছে — seen timestamp সেভ করো
    database.ref('admin_chat_seen/' + uid).set(Date.now());

    const headerElement = document.getElementById('active-chat-user-header');
    headerElement.innerHTML = `
        <span>Chatting with: ${name}</span>
        <button id="btn-clear-chat-history" onclick="clearActiveChatHistory()" style="background: #e74c3c; color: #fff; border: none; padding: 4px 10px; font-size: 10px; border-radius: 4px; cursor: pointer; font-weight: bold;"><i class="fa-solid fa-trash-can"></i> Clear Chat</button>
    `;

    listenLiveMessagesForActiveUser(uid);
}

function listenLiveMessagesForActiveUser(uid) {
    database.ref('chats/' + uid).on('value', (snapshot) => {
        const msgBody = document.getElementById('admin-chat-messages-body');
        if(activeChatUID !== uid || !msgBody) return;
        msgBody.innerHTML = "";

        if(!snapshot.exists()) {
            msgBody.innerHTML = '<p style="color:#555; font-size:11px; text-align:center; margin-top:40px;">এই চ্যাটের সমস্ত মেসেজ ডিলিট করা হয়েছে।</p>';
            return;
        }

        snapshot.forEach((child) => {
            const msg = child.val();
            const bubble = document.createElement('div');
            
            if(msg.name === "Admin Support") {
                bubble.className = "msg-bubble admin";
            } else {
                bubble.className = "msg-bubble user";
            }
            bubble.innerText = msg.message;
            msgBody.appendChild(bubble);
        });
        msgBody.scrollTop = msgBody.scrollHeight; 
    });
}

// --- নতুন যুক্ত করা লাইভ চ্যাট ডিলিট ফাংশন ---
window.clearActiveChatHistory = function() {
    if (!activeChatUID) return;

    if (confirm("আপনি কি নিশ্চিতভাবে এই ইউজারের পুরো চ্যাট হিস্ট্রি মুছে ফেলতে চান?\nএটি ডিলিট করলে ইউজার অ্যাপ থেকেও সব মেসেজ মুছে যাবে।")) {
        database.ref('chats/' + activeChatUID).remove().then(() => {
            showToast("চ্যাট হিস্ট্রি সফলভাবে পরিষ্কার করা হয়েছে!", "error");
        }).catch((err) => {
            alert("চ্যাট ডিলিট করতে সমস্যা হয়েছে: " + err.message);
        });
    }
};

// অ্যাডমিন চ্যাট মেসেজ সেন্ড
document.getElementById('btn-send-admin-chat').addEventListener('click', sendAdminSupportMessage);
document.getElementById('admin-chat-input-text').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendAdminSupportMessage();
});

function sendAdminSupportMessage() {
    const inputField = document.getElementById('admin-chat-input-text');
    const txt = inputField.value.trim();
    if(!txt || !activeChatUID) return;

    database.ref('chats/' + activeChatUID).push({
        name: "Admin Support",
        sender: "admin",
        message: txt,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        inputField.value = "";
    });
}

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
