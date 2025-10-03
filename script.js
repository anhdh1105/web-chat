// Import Firebase SDK (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// =============================
// BƯỚC 1: Cấu hình Firebase
// =============================
const firebaseConfig = {
    apiKey: "AIzaSyBC_zaWKozAN4gaRGFQs8Yfg6sSLjWczag",
    authDomain: "webchatapp-e6e15.firebaseapp.com",
    databaseURL: "https://webchatapp-e6e15-default-rtdb.firebaseio.com",
    projectId: "webchatapp-e6e15",
    storageBucket: "webchatapp-e6e15.firebasestorage.app",
    messagingSenderId: "395339001651",
    appId: "1:395339001651:web:e514a3b180ad92429b5846"
};

// Khởi tạo Firebase App & Database
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const messagesRef = ref(database, 'messages');

// =============================
// BƯỚC 2: DOM Elements
// =============================
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');

// Lưu username vào localStorage
usernameInput.value = localStorage.getItem('chatUsername') || '';
usernameInput.addEventListener('change', () => {
    localStorage.setItem('chatUsername', usernameInput.value.trim());
});

// =============================
// BƯỚC 3: Gửi tin nhắn
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
        await push(messagesRef, newMessage);
        messageInput.value = '';
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn:", error);
        alert("Không thể gửi tin nhắn. Kiểm tra kết nối.");
    }
}

// =============================
// BƯỚC 4: Hiển thị tin nhắn
// =============================
function displayMessage(messageData) {
    const messageElement = document.createElement('div');

    const time = new Date(messageData.timestamp).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageElement.innerHTML = `
      <div class="p-3 rounded-xl bg-purple-100 shadow text-gray-800">
        <span class="font-semibold text-purple-700">${messageData.username}</span><br>
        ${messageData.text}
        <div class="text-xs text-gray-500 mt-1">${time}</div>
      </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// =============================
// BƯỚC 5: Lắng nghe sự kiện
// =============================
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

// Lắng nghe tin nhắn mới từ Firebase
onChildAdded(messagesRef, (snapshot) => {
    displayMessage(snapshot.val());
});

// Focus input khi load trang
window.onload = () => {
    messageInput.focus();
};
