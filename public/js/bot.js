// ===== MechBot: Help Assistant Logic =====

const MECHBOT_KNOWLEDGE = [
    {
        keywords: ['how', 'use', 'start', 'works'],
        response: "Welcome to MechPartner! 🔧 To get started: \n1. Go to **Find Mechanics** to see nearby experts.\n2. Click on a mechanic to see their profile.\n3. Click **Request Service** and describe your issue.\n4. Track progress in your **Dashboard**!"
    },
    {
        keywords: ['find', 'search', 'nearby', 'location'],
        response: "You can find mechanics by clicking the **Find Mechanics** 🔍 option in your sidebar. Make sure to allow location access so we can find those closest to you!"
    },
    {
        keywords: ['status', 'track', 'pending', 'complete'],
        response: "Check your **Dashboard** 📊 or **Service History** 📋 to see the current status of your requests. 'Accepted' means the mechanic is on it!"
    },
    {
        keywords: ['profile', 'update', 'photo', 'address'],
        response: "You can update your details in the **My Profile** 👤 section. Don't forget to save your changes!"
    },
    {
        keywords: ['contact', 'mechanic', 'phone'],
        response: "Once a mechanic accepts your request, their phone number will be visible in the request details on your dashboard. You can also use the **Chat** button to message them directly!"
    },
    {
        keywords: ['payment', 'cost', 'price', 'money'],
        response: "Currently, you can discuss the service cost directly with your mechanic via chat or phone. Payments are handled outside the app for now."
    },
    {
        keywords: ['hello', 'hi', 'hey', 'help'],
        response: "Hello! I am **MechBot**, your personal assistant. How can I help you navigate MechPartner today? Ask me about finding mechanics, tracking services, or updating your profile!"
    }
];

function getBotResponse(userMessage) {
    const input = userMessage.toLowerCase();
    
    // Find matching knowledge item
    const match = MECHBOT_KNOWLEDGE.find(item => 
        item.keywords.some(keyword => input.includes(keyword))
    );

    if (match) {
        return match.response;
    }

    return "I'm not quite sure about that. Try asking 'How do I find a mechanic?' or 'How do I use the website?'. You can also contact support if you need more help!";
}

async function openMechBot() {
    // We use a special ID "bot" to signify this is a bot conversation
    const botName = "MechBot (AI Assistant)";
    
    // Initialize standard chat widget but with bot mode
    initChatWidget();
    
    const widget = document.getElementById('chatWidget');
    const partnerNameEl = document.getElementById('chatPartnerName');
    const messagesContainer = document.getElementById('chatMessages');
    
    partnerNameEl.textContent = botName;
    widget.classList.add('active');
    
    // Clear previous polling if any
    if (window.chatPollInterval) clearInterval(window.chatPollInterval);
    window.currentChatRequestId = "bot";
    
    // Add welcome message if empty
    messagesContainer.innerHTML = `
        <div class="message message-received">
            Hello! I'm <strong>MechBot</strong>. How can I help you use MechPartner today? 🛠️
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
}

// Intercept sending messages if it's "bot" mode
async function handleBotInteraction(content) {
    const container = document.getElementById('chatMessages');
    
    // Add user message to UI
    const userMsgHTML = `
        <div class="message message-sent">
            ${content}
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', userMsgHTML);
    container.scrollTop = container.scrollHeight;

    // Show typing indicator
    const typingHTML = `<div id="botTyping" class="message message-received" style="font-style: italic; opacity: 0.7;">MechBot is thinking...</div>`;
    container.insertAdjacentHTML('beforeend', typingHTML);
    container.scrollTop = container.scrollHeight;

    // Simulate delay
    setTimeout(() => {
        const typingEl = document.getElementById('botTyping');
        if (typingEl) typingEl.remove();

        const response = getBotResponse(content);
        const botMsgHTML = `
            <div class="message message-received">
                ${response.replace(/\n/g, '<br>')}
                <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', botMsgHTML);
        container.scrollTop = container.scrollHeight;
    }, 1000);
}
