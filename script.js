// Import Firebase SDK (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
// THƯ VIỆN MỚI CHO ĐĂNG NHẬP
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


// =============================
// BƯỚC 1: Cấu hình Firebase
// =============================
const firebaseConfig = {
    apiKey: "AIzaSyBC_zaWKozAN4gaRGFQs8Yfg6sSLjWczag", // <--- THAY THẾ BẰNG KHÓA CỦA BẠN
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
const auth = getAuth(app); // Khai báo Authentication
const messagesRef = ref(database, 'messages');

// =============================
// BƯỚC 2: DOM Elements
// =============================
// Chat Elements
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username');
const sendButton = document.getElementById('send-button'); // NÚT GỬI ĐÃ ĐƯỢC KHAI BÁO
const messagesContainer = document.getElementById('messages');
const chatScreen = document.getElementById('chat-screen');
const logoutButton = document.getElementById('logout-button');
const headerText = document.getElementById('header-text');

// Login Elements
const loginScreen = document.getElementById('login-screen');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const loginErrorText = document.getElementById('login-error');

// Lưu username vào localStorage
usernameInput.value = localStorage.getItem('chatUsername') || '';
usernameInput.addEventListener('change', () => {
    localStorage.setItem('chatUsername', usernameInput.value.trim());
});

// =============================
// BƯỚC 3: Logic Đăng nhập/Đăng xuất
// =============================

/**
 * Hiển thị màn hình Chat nếu đã đăng nhập, ngược lại hiển thị Login
 * @param {object} user - Đối tượng người dùng Firebase
 */
function handleAuthStateChange(user) {
    if (user) {
        // Đã đăng nhập
        loginScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        headerText.textContent = `💬 Chat với ${user.email}`;

        // Bắt đầu lắng nghe tin nhắn khi đã đăng nhập
        startMessageListener();

    } else {
        // Chưa đăng nhập
        chatScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        headerText.textContent = `💬 Đăng nhập để Chat`;
    }
}

/**
 * Hàm Đăng nhập
 */
async function handleLogin() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();
    loginErrorText.classList.add('hidden'); // Ẩn lỗi cũ

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Thành công: onAuthStateChanged sẽ tự động xử lý chuyển màn hình
    } catch (error) {
        let errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra Email/Mật khẩu.";
        console.error("Login Error:", error.code);

        // Hiển thị lỗi tùy theo mã lỗi
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Email hoặc mật khẩu không đúng.";
        }

        loginErrorText.textContent = errorMessage;
        loginErrorText.classList.remove('hidden');
    }
}

/**
 * Hàm Đăng xuất
 */
async function handleLogout() {
    try {
        await signOut(auth);
        // Tự động chuyển về màn hình Login
    } catch (error) {
        console.error("Logout Error:", error);
    }
}

// =============================
// BƯỚC 4: Logic Chat
// =============================
async function sendMessage() {
    const username = usernameInput.value.trim();
    const message = messageInput.value.trim();

    if (username === '' || message === '') {
        alert("Vui lòng nhập Tên và Tin nhắn.");
        return;
    }

    const newMessage = {
        username: username,
        text: message,
        timestamp: Date.now()
    };

    try {
        // Chỉ đẩy tin nhắn nếu người dùng đã được xác thực (Auth Rules)
        await push(messagesRef, newMessage);
        messageInput.value = '';
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn:", error);
        alert("Không thể gửi tin nhắn. Kiểm tra kết nối hoặc trạng thái đăng nhập.");
    }
}

function displayMessage(messageData) {
    const messageElement = document.createElement('div');

    const currentUsername = usernameInput.value.trim();
    const isMyMessage = messageData.username === currentUsername && currentUsername !== '';

    // Đảm bảo tin nhắn của tôi là màu tối/nổi bật, người khác là màu sáng/trung tính
    const baseClass = "p-3 rounded-xl shadow-md max-w-[80%] ";
    const messageClasses = isMyMessage
        ? baseClass + "bg-indigo-600 text-white"  // Màu của BẠN: Nền Tím, Chữ Trắng
        : baseClass + "bg-white text-gray-800 border border-gray-200"; // Màu của HỌ: Nền Trắng, Viền nhẹ


    // Căn phải/trái cho container tin nhắn
    // Tin nhắn của tôi (phải), tin nhắn của họ (trái)
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
// BƯỚC 5: Lắng nghe sự kiện
// =============================

// 1. Lắng nghe trạng thái đăng nhập
onAuthStateChanged(auth, handleAuthStateChange);

// 2. Lắng nghe sự kiện Login/Logout
loginButton.addEventListener('click', handleLogin);
loginPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});
logoutButton.addEventListener('click', handleLogout);

// 3. Lắng nghe sự kiện Gửi tin nhắn (ĐÃ ĐƯỢC SỬA ĐỂ BẮT SỰ KIỆN TỪ NÚT GỬI)
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

// Hàm bắt đầu lắng nghe tin nhắn (chỉ chạy sau khi đăng nhập)
function startMessageListener() {
    // Xóa nội dung cũ khi chuyển màn hình
    messagesContainer.innerHTML = '';

    // Lắng nghe tin nhắn mới từ Firebase
    onChildAdded(messagesRef, (snapshot) => {
        displayMessage(snapshot.val());
    });
}