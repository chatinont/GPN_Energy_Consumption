const STORAGE_KEY = "energy_ai_history";
const API_KEY_STORAGE = "energy_ai_api_key"; // แยกเก็บคีย์ไว้ต่างหาก

document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('chatbot-fab');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('close-chat');
    const clearChat = document.getElementById('clear-chat');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    let chatHistory = [];

    // ฟังก์ชันดึงคีย์
    const getApiKey = () => localStorage.getItem(API_KEY_STORAGE);

    // Initialize: Load history
    const loadHistory = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            chatHistory = JSON.parse(saved);
            chatMessages.innerHTML = "";
            chatHistory.forEach(msg => appendMessageUI(msg.role === 'user' ? 'user' : 'ai', msg.text, false));
        }
        
        // ถ้ายังไม่มีคีย์ ให้แสดงข้อความต้อนรับและขอคีย์
        if (!getApiKey()) {
            appendMessageUI('ai', 'สวัสดีครับ! เพื่อเริ่มต้นใช้งาน กรุณาใส่ Gemini API Key ของคุณโดยพิมพ์คำว่า: setkey [ตามด้วยคีย์ของคุณ] เช่น:\nsetkey AIzaSy...', false);
        }
    };

    const saveHistory = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    };

    fab.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) chatInput.focus();
    });
    closeChat.addEventListener('click', () => chatWindow.classList.add('hidden'));
    
    clearChat.addEventListener('click', () => {
        if (confirm("คุณต้องการล้างประวัติการสนทนาทั้งหมดใช่หรือไม่?")) {
            chatHistory = [];
            localStorage.removeItem(STORAGE_KEY);
            chatMessages.innerHTML = '<div class="message ai">ประวัติถูกล้างแล้วครับ ข้อมูลคีย์ยังคงอยู่ครับ</div>';
        }
    });

    const appendMessageUI = (sender, text, addToHistory = true) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.innerText = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (addToHistory) {
            chatHistory.push({ role: sender === 'user' ? 'user' : 'model', text: text });
            saveHistory();
        }
    };

    const showTypingIndicator = () => {
        const indicator = document.createElement('div');
        indicator.className = 'message ai typing-dots';
        indicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return indicator;
    };

    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';

        // ดักจับคำสั่งตั้งค่าคีย์
        if (text.startsWith('setkey ')) {
            const newKey = text.replace('setkey ', '').trim();
            localStorage.setItem(API_KEY_STORAGE, newKey);
            appendMessageUI('user', 'กำลังตั้งค่า API Key...');
            appendMessageUI('ai', 'บันทึก API Key เรียบร้อยแล้วครับ! ตอนนี้คุณสามารถเริ่มถามข้อมูลได้เลยครับ');
            return;
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            appendMessageUI('user', text);
            appendMessageUI('ai', 'กรุณาตั้งค่า API Key ก่อนใช้งานครับ โดยพิมพ์: setkey [API_KEY_ของคุณ]');
            return;
        }

        appendMessageUI('user', text);
        const typing = showTypingIndicator();

        try {
            const context = window.getDashboardContext ? window.getDashboardContext() : {};
            const historySummary = window.getHistoricalSummary ? window.getHistoricalSummary(14) : "";
            
            const systemPrompt = `คุณคือ "Energy AI" ตอบเป็นภาษาไทย ข้อมูลบ้าน: บิล ${context.currentBill}, ใช้ไฟ ${context.liveWatt}kW\n\n${historySummary}`;
            
            const recentHistory = chatHistory.slice(-10).map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }));

            const finalContents = [
                { role: "user", parts: [{ text: `System: ${systemPrompt}` }] },
                ...recentHistory
            ];

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: finalContents })
            });

            const data = await response.json();
            typing.remove();

            if (!response.ok) {
                // ถ้าคีย์ผิด ให้แจ้งเตือนและลบคีย์เก่าออก
                if (response.status === 400 || response.status === 401) {
                    localStorage.removeItem(API_KEY_STORAGE);
                    appendMessageUI('ai', 'API Key ไม่ถูกต้องหรือหมดอายุครับ กรุณาตั้งค่าคีย์ใหม่ด้วยคำสั่ง setkey');
                } else {
                    appendMessageUI('ai', `ErrorCode: ${response.status}\nMessage: ${data.error?.message}`);
                }
                return;
            }

            if (data.candidates && data.candidates[0].content) {
                appendMessageUI('ai', data.candidates[0].content.parts[0].text);
            }
        } catch (e) {
            typing.remove();
            appendMessageUI('ai', 'ขออภัยครับ ระบบขัดข้องชั่วคราว');
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    loadHistory();
});
