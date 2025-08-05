// src/services/websocket.js
class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
  }

  connect(electionId) {
    this.socket = new WebSocket(`wss://your-api-url/ws/${electionId}`);

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (this.callbacks[message.type]) {
        this.callbacks[message.type](message.data);
      }
    };

    this.socket.onclose = () => {
      setTimeout(() => this.connect(electionId), 5000); // إعادة الاتصال تلقائياً
    };
  }

  registerCallback(type, callback) {
    this.callbacks[type] = callback;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

export const webSocketService = new WebSocketService();
