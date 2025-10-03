// Import Firebase SDK (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, off } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"; // THÊM createUserWithEmailAndPassword


// =============================
// BƯỚC 1: Cấu hình Firebase
// =============================
const firebaseConfig = {
    apiKey: "AIzaSyBC_zaWKozAN4gaRGFQs8Yfg6sSLjWczag", // <--- KHÓA CỦA BẠN
    authDomain: "webchatapp-e6e15.firebaseapp.com",
    databaseURL: "https://webchatapp-e6e15-default-rtdb.firebaseio.com",
    projectId: "webchatapp-e6e15",
    storageBucket: "webchatapp-e6e15.firebasestorage.app",
    messagingSenderId: "395339001651",
    appId: "1:395339001651:web:e514a3b180ad92429b5846"
};

// Khởi tạo Firebase App, Database, và Auth
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Biến lưu trữ trạng thái
let currentChatRef = null;
let messageListener = null;
let isRoomJoined = false;
let isLoginMode = true; // TRẠNG THÁI MỚI: Theo dõi chế độ Login hay Sign Up

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

// Room Elements
const roomIdInput = document.getElementById('room-id-input');
const roomActionButton = document.getElementById('room-action-button');

// Login/Sign Up Elements (ĐÃ ĐỔI TÊN ĐỂ TỔNG QUÁT HƠN)
const loginScreen = document.getElementById('login-screen');
const authTitle = document.getElementById('auth-title');
const authEmailInput = document.getElementById('auth-email'); // Đổi tên từ login-email
const authPasswordInput = document.getElementById('auth-password'); // Đổi tên từ login-password
const authConfirmPasswordInput = document.getElementById('auth-confirm-password'); // MỚI
const authActionButton = document.getElementById('auth-action-button'); // Đổi tên từ login-button
const loginErrorText = document.getElementById('login-error');
const toggleAuthModeButton = document.getElementById('toggle-auth-mode'); // Nút chuyển đổi

// Lưu username và Room ID vào localStorage
usernameInput.value = localStorage.getItem('chatUsername') || '';
roomIdInput.value = localStorage.getItem('chatRoomId') || '';

usernameInput.addEventListener('change', () => {
    localStorage.setItem('chatUsername', usernameInput.value.trim());
});
roomIdInput.addEventListener('input', updateRoomUI);


// =============================
// BƯỚC 3: Logic Đăng nhập/Đăng ký/Đăng xuất
// =============================

/**
 * Hàm chuyển đổi giữa chế độ Đăng nhập và Đăng ký
 */
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    loginErrorText.classList.add('hidden');

    if (isLoginMode) {
        authTitle.textContent = 'Đăng Nhập';
        authActionButton.textContent = 'Đăng Nhập';
        toggleAuthModeButton.textContent = 'Chưa có tài khoản? Chuyển sang Đăng ký';
        authConfirmPasswordInput.classList.add('hidden');
    } else {
        authTitle.textContent = 'Đăng Ký Tài Khoản';
        authActionButton.textContent = 'Đăng Ký';
        toggleAuthModeButton.textContent = 'Đã có tài khoản? Quay lại Đăng nhập';
        authConfirmPasswordInput.classList.remove('hidden');
    }
}

/**
 * Xử lý hành động Đăng nhập hoặc Đăng ký
 */
async function handleAuthAction() {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();
    loginErrorText.classList.add('hidden');

    if (email === '' || password === '') {
        loginErrorText.textContent = "Vui lòng nhập Email và Mật khẩu.";
        loginErrorText.classList.remove('hidden');
        return;
    }

    if (isLoginMode) {
        // --- LOGIC ĐĂNG NHẬP (Đã có) ---
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            let errorMessage = "Đăng nhập thất bại. Kiểm tra Email/Mật khẩu.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Email hoặc mật khẩu không đúng.";
            }
            loginErrorText.textContent = errorMessage;
            loginErrorText.classList.remove('hidden');
        }

    } else {
        // --- LOGIC ĐĂNG KÝ (MỚI) ---
        const confirmPassword = authConfirmPasswordInput.value.trim();

        if (password !== confirmPassword) {
            loginErrorText.textContent = "Mật khẩu xác nhận không khớp.";
            loginErrorText.classList.remove('hidden');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            alert("Đăng ký thành công! Bạn đã được đăng nhập.");
            // Tự động đăng nhập sau khi đăng ký thành công
        } catch (error) {
            let errorMessage = "Đăng ký thất bại.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Email này đã được sử dụng.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Mật khẩu phải có ít nhất 6 ký tự.";
            }
            loginErrorText.textContent = errorMessage;
            loginErrorText.classList.remove('hidden');
        }
    }
}

function handleAuthStateChange(user) {
    if (user) {
        loginScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        headerText.textContent = `💬 Chat với ${user.email}`;
        updateRoomUI();
    } else {
        chatScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        headerText.textContent = `💬 Đăng nhập để Chat`;
        toggleAuthMode(); // Đảm bảo bắt đầu ở chế độ Login
    }
}

async function handleLogout() {
    try {
        leaveRoom();
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
}

// ... (GIỮ NGUYÊN BƯỚC 4: Logic Quản lý Phòng và BƯỚC 5: Logic Gửi tin nhắn và BƯỚC 6: displayMessage) ...
// (LƯU Ý: Do giới hạn độ dài, tôi sẽ chỉ giữ nguyên các hàm ở dưới đây và bạn sẽ dán chúng vào file script.js của mình)
// -------------------------------------------------------------------------------------------------------------------
// (Hàm updateRoomUI, joinRoom, leaveRoom, handleRoomAction, sendMessage, displayMessage đều được giữ nguyên)
// -------------------------------------------------------------------------------------------------------------------

// =============================
// BƯỚC 7: Lắng nghe sự kiện
// =============================

onAuthStateChanged(auth, handleAuthStateChange);
// Lắng nghe nút hành động chính
authActionButton.addEventListener('click', handleAuthAction);
// Lắng nghe nút chuyển đổi
toggleAuthModeButton.addEventListener('click', toggleAuthMode);

// Thêm lắng nghe Enter trên mật khẩu
authPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAuthAction();
});

logoutButton.addEventListener('click', handleLogout);
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

function updateRoomUI() {
    const roomId = roomIdInput.value.trim();

    // Nếu chưa tham gia phòng
    if (!isRoomJoined) {
        roomIdInput.disabled = false;
        roomActionButton.textContent = 'VÀO PHÒNG';
        roomActionButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        roomActionButton.classList.add('bg-purple-600', 'hover:bg-purple-700');

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
        roomActionButton.textContent = 'THOÁT PHÒNG';
        roomActionButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        roomActionButton.classList.add('bg-red-600', 'hover:bg-red-700');
        roomActionButton.disabled = false;

        messageInput.disabled = false;
        sendButton.disabled = false;

        headerText.textContent = `💬 Phòng: ${roomId}`;
    }
}

function joinRoom() {
    const roomId = roomIdInput.value.trim();
    if (roomId === '') return;

    localStorage.setItem('chatRoomId', roomId);

    if (currentChatRef && messageListener) {
        off(currentChatRef, 'child_added', messageListener);
    }

    currentChatRef = ref(database, `messages/${roomId}`);
    messagesContainer.innerHTML = '';

    messageListener = onChildAdded(currentChatRef, (snapshot) => {
        displayMessage(snapshot.val());
    });

    isRoomJoined = true;
    updateRoomUI();
    messageInput.focus();
}

function leaveRoom() {
    if (currentChatRef && messageListener) {
        off(currentChatRef, 'child_added', messageListener);
    }
    currentChatRef = null;
    messageListener = null;

    messagesContainer.innerHTML = '<p class="text-center text-muted p-4">Bạn đã thoát phòng chat.</p>';

    isRoomJoined = false;
    updateRoomUI();
}

function handleRoomAction() {
    if (isRoomJoined) {
        leaveRoom();
    } else {
        joinRoom();
    }
}

async function sendMessage() {
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

function startMessageListener() {
    const roomId = roomIdInput.value.trim();

    if (roomId === '') {
        messagesContainer.innerHTML = '<p class="text-center text-muted">Vui lòng nhập ID phòng chat để bắt đầu.</p>';
        return;
    }

    if (currentChatRef && messageListener) {
        off(currentChatRef, 'child_added', messageListener);
    }

    currentChatRef = ref(database, `messages/${roomId}`);
    messagesContainer.innerHTML = '';

    messageListener = onChildAdded(currentChatRef, (snapshot) => {
        displayMessage(snapshot.val());
    });
}