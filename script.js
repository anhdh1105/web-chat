
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, off } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";



const firebaseConfig = {
    apiKey: "AIzaSyBC_zaWKozAN4gaRGFQs8Yfg6sSLjWczag", // <--- KHÓA CỦA BẠN
    authDomain: "webchatapp-e6e15.firebaseapp.com",
    databaseURL: "https://webchatapp-e6e15-default-rtdb.firebaseio.com",
    projectId: "webchatapp-e6e15",
    storageBucket: "webchatapp-e6e15.firebasestorage.app",
    messagingSenderId: "395339001651",
    appId: "1:395339001651:web:e514a3b180ad92429b5846"
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

let currentChatRef = null;
let messageListener = null;
let isRoomJoined = false; // TRẠNG THÁI MỚI: Đã tham gia phòng chưa

// =============================
// BƯỚC 2: DOM Elements
// =============================
// Chat Elements
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const chatScreen = document.getElementById('chat-screen');
const logoutButton = document.getElementById('logout-button');
const headerText = document.getElementById('header-text');

// Room ID Element MỚI
const roomIdInput = document.getElementById('room-id-input');
const roomActionButton = document.getElementById('room-action-button'); // NÚT CHUYỂN ĐỔI

// Login Elements
const loginScreen = document.getElementById('login-screen');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const loginErrorText = document.getElementById('login-error');

// Lưu username và Room ID vào localStorage
usernameInput.value = localStorage.getItem('chatUsername') || '';
roomIdInput.value = localStorage.getItem('chatRoomId') || ''; // Bỏ default room

usernameInput.addEventListener('change', () => {
    localStorage.setItem('chatUsername', usernameInput.value.trim());
});
roomIdInput.addEventListener('input', updateRoomUI); // Cập nhật UI ngay khi gõ

// =============================
// BƯỚC 3: Logic Đăng nhập/Đăng xuất (Giữ nguyên)
// =============================
function handleAuthStateChange(user) {
    if (user) {
        loginScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        headerText.textContent = `💬 Chat với ${user.email}`;
        updateRoomUI(); // Cập nhật trạng thái phòng khi đăng nhập
    } else {
        chatScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        headerText.textContent = `💬 Đăng nhập để Chat`;
    }
}

async function handleLogin() {
    // ... (Giữ nguyên logic Login)
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();
    loginErrorText.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        let errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra Email/Mật khẩu.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Email hoặc mật khẩu không đúng.";
        }
        loginErrorText.textContent = errorMessage;
        loginErrorText.classList.remove('hidden');
    }
}

async function handleLogout() {
    // ... (Giữ nguyên logic Logout)
    try {
        // Thoát phòng trước khi đăng xuất
        leaveRoom();
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
}

// =============================
// BƯỚC 4: Logic Quản lý Phòng
// =============================

/**
 * Cập nhật giao diện và trạng thái các nút dựa trên Room ID
 */
function updateRoomUI() {
    const roomId = roomIdInput.value.trim();

    // Nếu chưa tham gia phòng
    if (!isRoomJoined) {
        // Cho phép nhập Room ID
        roomIdInput.disabled = false;

        // Hiển thị nút VÀO PHÒNG
        roomActionButton.textContent = 'VÀO PHÒNG';
        roomActionButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        roomActionButton.classList.add('bg-purple-600', 'hover:bg-purple-700');

        // Vô hiệu hóa controls chat nếu chưa nhập Room ID
        const canJoin = roomId !== '' && usernameInput.value.trim() !== '';
        roomActionButton.disabled = !canJoin;

        messageInput.disabled = true;
        sendButton.disabled = true;

        if (messagesContainer.innerHTML === '') {
            messagesContainer.innerHTML = '<p class="text-center text-muted p-4">Nhập ID phòng chat và nhấn "VÀO PHÒNG" để xem lịch sử.</p>';
        }

    } else {
        // Đã tham gia phòng
        roomIdInput.disabled = true;

        // Hiển thị nút THOÁT PHÒNG
        roomActionButton.textContent = 'THOÁT PHÒNG';
        roomActionButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        roomActionButton.classList.add('bg-red-600', 'hover:bg-red-700');
        roomActionButton.disabled = false;

        // Kích hoạt controls chat
        messageInput.disabled = false;
        sendButton.disabled = false;

        // Tên phòng hiển thị trên header (dù đã có email)
        headerText.textContent = `💬 Phòng: ${roomId}`;
    }
}


/**
 * Tham gia phòng chat
 */
function joinRoom() {
    const roomId = roomIdInput.value.trim();
    if (roomId === '') return;

    // Lưu Room ID
    localStorage.setItem('chatRoomId', roomId);

    // 1. Dừng lắng nghe phòng chat cũ (nếu có)
    if (currentChatRef && messageListener) {
        off(currentChatRef, 'child_added', messageListener);
    }

    // 2. Thiết lập tham chiếu mới
    currentChatRef = ref(database, `messages/${roomId}`);

    // 3. Xóa tin nhắn cũ khỏi giao diện (để tải tin nhắn phòng mới)
    messagesContainer.innerHTML = '';

    // 4. Lắng nghe tin nhắn mới và lưu hàm hủy lắng nghe
    messageListener = onChildAdded(currentChatRef, (snapshot) => {
        displayMessage(snapshot.val());
    });

    isRoomJoined = true;
    updateRoomUI();
    messageInput.focus();
}

/**
 * Thoát phòng chat
 */
function leaveRoom() {
    // Dừng lắng nghe phòng chat hiện tại
    if (currentChatRef && messageListener) {
        off(currentChatRef, 'child_added', messageListener);
    }
    currentChatRef = null;
    messageListener = null;

    // Xóa lịch sử chat khỏi giao diện
    messagesContainer.innerHTML = '<p class="text-center text-muted p-4">Bạn đã thoát phòng chat.</p>';

    isRoomJoined = false;
    updateRoomUI();
}

// Hàm xử lý khi nhấn nút VÀO/THOÁT
function handleRoomAction() {
    if (isRoomJoined) {
        leaveRoom();
    } else {
        joinRoom();
    }
}

// =============================
// BƯỚC 5: Logic Gửi Tin nhắn (Đã điều chỉnh)
// =============================
async function sendMessage() {
    // ... (Giữ nguyên logic sendMessage)
    const username = usernameInput.value.trim();
    const message = messageInput.value.trim();

    if (username === '' || message === '' || !isRoomJoined) {
        alert("Vui lòng nhập Tên và tin nhắn, và phải tham gia phòng.");
        return;
    }

    const newMessage = {
        username: username,
        text: message,
        timestamp: Date.now()
    };

    try {
        if (currentChatRef) {
            await push(currentChatRef, newMessage);
            messageInput.value = '';
        }
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn:", error);
        alert("Không thể gửi tin nhắn. Kiểm tra kết nối.");
    }
}

// ... (Giữ nguyên logic displayMessage)
function displayMessage(messageData) {
    const messageElement = document.createElement('div');
    const currentUsername = usernameInput.value.trim();
    const isMyMessage = messageData.username === currentUsername && currentUsername !== '';

    const baseClass = "p-3 rounded-xl shadow-md max-w-[80%] ";
    const messageClasses = isMyMessage
        ? baseClass + "bg-indigo-600 text-white"
        : baseClass + "bg-white text-gray-800 border border-gray-200";

    messageElement.className = isMyMessage ? "flex justify-end mb-3" : "flex justify-start mb-3";

    messageElement.innerHTML = `
      <div class="${messageClasses}">
        <span class="font-semibold text-sm ${isMyMessage ? 'text-indigo-200' : 'text-indigo-700'}">${messageData.username}</span><br>
        ${messageData.text}
        <div class="text-xs ${isMyMessage ? 'text-indigo-300' : 'text-gray-500'} mt-1 text-right">${new Date(messageData.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// =============================
// BƯỚC 6: Lắng nghe sự kiện
// =============================

onAuthStateChanged(auth, handleAuthStateChange);
loginButton.addEventListener('click', handleLogin);
loginPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});
logoutButton.addEventListener('click', handleLogout);

// Lắng nghe sự kiện ROOM ACTION MỚI
roomActionButton.addEventListener('click', handleRoomAction);
roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isRoomJoined) {
        handleRoomAction();
    }
});

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});