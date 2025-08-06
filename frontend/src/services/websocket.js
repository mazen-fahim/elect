// src/services/websocket.js
class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
    this.retryCount = 0;
    this.maxRetries = 5;
    this.reconnectDelay = 5000; // 5 seconds
    this.electionId = null;
    this.pendingMessages = [];
    this.connectionStatusListeners = [];
  }

  connect(electionId) {
    if (this.retryCount >= this.maxRetries) {
      console.error('Max reconnection attempts reached');
      return;
    }

    // Close existing connection if different election
    if (this.socket && this.electionId !== electionId) {
      this.disconnect();
    }

    this.electionId = electionId;

    try {
      this.socket = new WebSocket(`wss://your-api-url/ws/${electionId}`);

      this.socket.onopen = () => {
        this.retryCount = 0; // Reset retry count on successful connection
        this.notifyConnectionStatus(true);
        this.flushPendingMessages();
        console.log('WebSocket connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (this.callbacks[message.type]) {
            this.callbacks[message.type](message.data);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      this.socket.onclose = (event) => {
        this.notifyConnectionStatus(false);
        if (!event.wasClean) {
          this.reconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyConnectionStatus(false);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.reconnect();
    }
  }

  reconnect() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Attempting to reconnect (${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => this.connect(this.electionId), this.reconnectDelay);
    }
  }

  registerCallback(type, callback) {
    this.callbacks[type] = callback;
  }

  unregisterCallback(type) {
    delete this.callbacks[type];
  }

  sendMessage(type, data) {
    const message = JSON.stringify({ type, data });

    if (this.getConnectionStatus()) {
      this.socket.send(message);
    } else {
      this.pendingMessages.push(message); // Queue message if not connected
      if (this.retryCount === 0) {
        this.connect(this.electionId); // Try to reconnect if not already trying
      }
    }
  }

  flushPendingMessages() {
    while (this.pendingMessages.length > 0 && this.getConnectionStatus()) {
      const message = this.pendingMessages.shift();
      this.socket.send(message);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.electionId = null;
      this.retryCount = 0;
      this.notifyConnectionStatus(false);
    }
  }

  getConnectionStatus() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  addConnectionStatusListener(callback) {
    this.connectionStatusListeners.push(callback);
  }

  removeConnectionStatusListener(callback) {
    this.connectionStatusListeners = this.connectionStatusListeners.filter(
      listener => listener !== callback
    );
  }

  notifyConnectionStatus(isConnected) {
    this.connectionStatusListeners.forEach(listener => listener(isConnected));
  }
}

export const webSocketService = new WebSocketService();
