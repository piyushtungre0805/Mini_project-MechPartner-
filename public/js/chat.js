// ===== Chat System JavaScript =====

// Variables are on window to be shared with bot.js
window.currentChatRequestId = null;
window.chatPollInterval = null;

function initChatWidget() {
    // Check if widget already exists
    if (document.getElementById('chatWidget')) return;

    const widgetHTML = `
        <div id="chatWidget" class="chat-widget">
            <div class="chat-header">
                <h3>Chat with <span id="chatPartnerName">...</span></h3>
                <button class="close-chat" onclick="closeChat()">✕</button>
            </div>
            <div id="chatMessages" class="chat-messages">
                <!-- Messages will appear here -->
            </div>
            <form id="chatForm" class="chat-input-area" onsubmit="sendChatMessage(event)">
                <input type="text" id="chatInput" class="chat-input" placeholder="Type a message..." autocomplete="off">
                <button type="submit" class="btn-send">🚀</button>
            </form>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
}

async function openChat(requestId, partnerName) {
    window.currentChatRequestId = requestId;
    initChatWidget();
    
    const widget = document.getElementById('chatWidget');
    const partnerNameEl = document.getElementById('chatPartnerName');
    const messagesContainer = document.getElementById('chatMessages');
    
    partnerNameEl.textContent = partnerName;
    messagesContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    widget.classList.add('active');
    
    // Initial fetch
    await fetchMessages();
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Start polling
    if (window.chatPollInterval) clearInterval(window.chatPollInterval);
    window.chatPollInterval = setInterval(fetchMessages, 3000);
}

function closeChat() {
    const widget = document.getElementById('chatWidget');
    if (widget) {
        widget.classList.remove('active');
    }
    if (window.chatPollInterval) {
        clearInterval(window.chatPollInterval);
        window.chatPollInterval = null;
    }
    window.currentChatRequestId = null;
}

async function fetchMessages() {
    if (!window.currentChatRequestId) return;
    
    try {
        const messages = await apiRequest(`/chat/${window.currentChatRequestId}`);
        if (!messages) return;
        
        renderMessages(messages);
    } catch (error) {
        console.error('Fetch messages error:', error);
    }
}

function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const currentUserId = localStorage.getItem('userId'); // We might need to ensure this is set
    
    // Fallback: check role and senderRole if userId isn't available
    const userRole = localStorage.getItem('role');

    const html = messages.map(msg => {
        // Logic to determine if sender is "me"
        // Since we don't have a perfect userId in localStorage yet, we use a simple heuristic
        // or we can update common.js to store userId.
        // For now, let's assume if role matches senderRole, it's likely "me" 
        // BUT that's wrong if both are mechanics (admin chats? No, only user-mechanic).
        // Let's use the actual ID comparison if possible.
        
        const isMe = msg.senderRole === userRole;

        return `
            <div class="message ${isMe ? 'message-sent' : 'message-received'}">
                ${msg.content}
                <span class="message-time">${formatChatDate(msg.createdAt)}</span>
            </div>
        `;
    }).join('');
    
    const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
    
    container.innerHTML = html;
    
    if (shouldScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    
    if (!content || !window.currentChatRequestId) return;
    
    input.value = '';

    // If in bot mode, handle locally
    if (window.currentChatRequestId === 'bot') {
        if (typeof handleBotInteraction === 'function') {
            handleBotInteraction(content);
        }
        return;
    }
    
    try {
        const newMessage = await apiRequest(`/chat/${window.currentChatRequestId}`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        
        if (newMessage) {
            await fetchMessages();
            const container = document.getElementById('chatMessages');
            container.scrollTop = container.scrollHeight;
        }
    } catch (error) {
        showToast('Failed to send message', 'error');
    }
}

function formatChatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
