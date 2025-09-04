/**
 * WebSocket Server for Real-Time Communication
 * 
 * This server handles WebSocket connections, manages client connections,
 * and broadcasts typed real-time events to connected clients.
 * 
 * Features:
 * - WebSocket connection management
 * - Client authentication and user mapping
 * - Typed event broadcasting
 * - Connection health monitoring
 * - Automatic reconnection handling
 * - Event queuing for offline clients
 */

import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { URL } from 'url'
import { 
  RealTimeMessage, 
  RealTimeEventType, 
  createBaseMessage, 
  generateMessageId,
  validateMessage,
  isEventType,
  affectsCurrentUser
} from './realtimeEvents'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ConnectedClient {
  /** WebSocket connection */
  ws: WebSocket
  /** User ID if authenticated */
  userId?: string
  /** Connection timestamp */
  connectedAt: Date
  /** Last heartbeat timestamp */
  lastHeartbeat: Date
  /** Client metadata */
  metadata: {
    userAgent?: string
    platform?: string
    version?: string
    ip?: string
  }
  /** Whether client is authenticated */
  isAuthenticated: boolean
  /** Client's current status */
  status: 'online' | 'away' | 'busy'
  /** Subscribed channels/topics */
  subscriptions: Set<string>
}

export interface BroadcastOptions {
  /** Specific user IDs to send to (if not specified, sends to all) */
  targetUserIds?: string[]
  /** Exclude specific user IDs */
  excludeUserIds?: string[]
  /** Whether to include the sender */
  includeSender?: boolean
  /** Channel/topic to broadcast to */
  channel?: string
  /** Message priority */
  priority?: 'low' | 'normal' | 'high' | 'critical'
  /** Whether to queue for offline users */
  queueForOffline?: boolean
  /** Message expiration time */
  expiresAt?: Date
}

export interface ConnectionStats {
  totalConnections: number
  authenticatedConnections: number
  anonymousConnections: number
  totalMessagesSent: number
  totalMessagesReceived: number
  uptime: number
  lastActivity: Date
}

export type MessageHandler = (message: RealTimeMessage, client: ConnectedClient) => Promise<void> | void

// ============================================================================
// WEB SOCKET SERVER CLASS
// ============================================================================

export class WebSocketServerManager {
  private wss: WebSocketServer | null = null
  private clients: Map<string, ConnectedClient> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()
  private messageHandlers: Map<RealTimeEventType, MessageHandler[]> = new Map()
  private offlineMessageQueue: Map<string, Array<{ message: RealTimeMessage, expiresAt: Date }>> = new Map()
  
  private serverStartTime: Date = new Date()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  
  // Configuration
  private config = {
    port: process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3001,
    heartbeatInterval: 30000, // 30 seconds
    cleanupInterval: 60000, // 1 minute
    maxConnections: 10000,
    maxMessageSize: 1024 * 1024, // 1MB
    enableHeartbeat: true,
    enableCleanup: true,
    enableLogging: process.env.NODE_ENV !== 'production'
  }

  // ============================================================================
  // SERVER INITIALIZATION
  // ============================================================================

  /**
   * Initialize the WebSocket server
   */
  async initialize(server?: any): Promise<void> {
    try {
      if (server) {
        // Attach to existing HTTP server
        this.wss = new WebSocketServer({ server })
        this.log('🔌 WebSocket server attached to existing HTTP server')
      } else {
        // Create standalone WebSocket server
        this.wss = new WebSocketServer({ 
          port: this.config.port,
          maxPayload: this.config.maxMessageSize
        })
        this.log(`🔌 WebSocket server started on port ${this.config.port}`)
      }

      this.setupEventHandlers()
      this.startIntervals()
      
      this.log('✅ WebSocket server initialized successfully')
    } catch (error) {
      this.log('❌ Failed to initialize WebSocket server:', error)
      throw error
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.wss) return

    this.wss.on('connection', this.handleConnection.bind(this))
    this.wss.on('error', this.handleServerError.bind(this))
    this.wss.on('close', this.handleServerClose.bind(this))
  }

  /**
   * Start background intervals
   */
  private startIntervals(): void {
    if (this.config.enableHeartbeat) {
      this.heartbeatInterval = setInterval(
        this.performHeartbeat.bind(this),
        this.config.heartbeatInterval
      )
    }

    if (this.config.enableCleanup) {
      this.cleanupInterval = setInterval(
        this.performCleanup.bind(this),
        this.config.cleanupInterval
      )
    }
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Handle new WebSocket connections
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    try {
      const clientId = generateMessageId()
      const url = new URL(request.url || '', `http://${request.headers.host}`)
      const token = url.searchParams.get('token')
      const userId = url.searchParams.get('userId')
      
      this.log(`🔗 New connection: ${clientId}${userId ? ` (User: ${userId})` : ''}`)

      // Check connection limits
      if (this.clients.size >= this.config.maxConnections) {
        this.log(`⚠️ Connection limit reached (${this.config.maxConnections}), rejecting ${clientId}`)
        ws.close(1013, 'Connection limit exceeded')
        return
      }

      // Create client object
      const client: ConnectedClient = {
        ws,
        userId: userId || undefined,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
        metadata: {
          userAgent: request.headers['user-agent'],
          platform: url.searchParams.get('platform') || 'unknown',
          version: url.searchParams.get('version') || '1.0.0',
          ip: this.getClientIP(request)
        },
        isAuthenticated: !!token && !!userId,
        status: 'online',
        subscriptions: new Set()
      }

      // Store client
      this.clients.set(clientId, client)
      
      // Map user to connection
      if (userId) {
        if (!this.userConnections.has(userId)) {
          this.userConnections.set(userId, new Set())
        }
        this.userConnections.get(userId)!.add(clientId)
      }

      // Setup client event handlers
      this.setupClientEventHandlers(clientId, client)

      // Send connection confirmation
      this.sendToClient(client, {
        messageId: generateMessageId(),
        timestamp: new Date().toISOString(),
        eventType: RealTimeEventType.CONNECT,
        actorId: userId || undefined,
        data: {
          userId: userId || 'anonymous',
          connectedAt: client.connectedAt.toISOString(),
          status: client.status
        }
      } as any)

      // Broadcast user online status
      if (userId) {
        this.broadcast({
          messageId: generateMessageId(),
          timestamp: new Date().toISOString(),
          eventType: RealTimeEventType.USER_ONLINE,
          actorId: userId,
          data: {
            user: {
              id: userId,
              name: 'User', // Will be updated with actual user data
              avatar: undefined
            },
            status: 'online',
            lastSeen: undefined
          }
        } as any, { excludeUserIds: [userId] })
      }

      this.log(`✅ Connection established: ${clientId} (Total: ${this.clients.size})`)
    } catch (error) {
      this.log('❌ Error handling connection:', error)
      ws.close(1011, 'Internal server error')
    }
  }

  /**
   * Setup event handlers for a specific client
   */
  private setupClientEventHandlers(clientId: string, client: ConnectedClient): void {
    client.ws.on('message', (data: Buffer) => {
      this.handleClientMessage(clientId, client, data)
    })

    client.ws.on('close', (code: number, reason: Buffer) => {
      this.handleClientDisconnection(clientId, client, code, reason.toString())
    })

    client.ws.on('error', (error: Error) => {
      this.handleClientError(clientId, client, error)
    })

    client.ws.on('pong', () => {
      this.handleClientPong(clientId, client)
    })
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(clientId: string, client: ConnectedClient, code: number, reason: string): void {
    this.log(`🔌 Client disconnected: ${clientId} (Code: ${code}, Reason: ${reason})`)

    // Remove from clients map
    this.clients.delete(clientId)

    // Remove from user connections
    if (client.userId) {
      const userConnections = this.userConnections.get(client.userId)
      if (userConnections) {
        userConnections.delete(clientId)
        if (userConnections.size === 0) {
          this.userConnections.delete(client.userId)
          
          // Broadcast user offline status
          this.broadcast({
            messageId: generateMessageId(),
            timestamp: new Date().toISOString(),
            eventType: RealTimeEventType.USER_OFFLINE,
            actorId: client.userId,
            data: {
              user: {
                id: client.userId,
                name: 'User',
                avatar: undefined
              },
              status: 'offline',
              lastSeen: new Date().toISOString()
            }
          } as any, { excludeUserIds: [client.userId] })
        }
      }
    }

    this.log(`📊 Connections remaining: ${this.clients.size}`)
  }

  /**
   * Handle client errors
   */
  private handleClientError(clientId: string, client: ConnectedClient, error: Error): void {
    this.log(`❌ Client error: ${clientId}:`, error.message)
    
    // Close connection on error
    try {
      client.ws.close(1011, 'Client error')
    } catch (closeError) {
      this.log(`⚠️ Error closing client connection: ${clientId}:`, closeError)
    }
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  /**
   * Handle incoming messages from clients
   */
  private handleClientMessage(clientId: string, client: ConnectedClient, data: Buffer): void {
    try {
      const messageString = data.toString('utf-8')
      const message = JSON.parse(messageString) as RealTimeMessage

      // Validate message
      if (!validateMessage(message)) {
        this.log(`⚠️ Invalid message from ${clientId}:`, messageString)
        this.sendErrorToClient(client, 'Invalid message format')
        return
      }

      this.log(`📨 Message from ${clientId}: ${message.eventType}`)

      // Update last heartbeat
      if (message.eventType === RealTimeEventType.HEARTBEAT) {
        client.lastHeartbeat = new Date()
        return
      }

      // Handle message with registered handlers
      this.handleMessageWithHandlers(message, client)

      // Broadcast to other clients if needed
      this.handleMessageBroadcast(message, client)

    } catch (error) {
      this.log(`❌ Error handling message from ${clientId}:`, error)
      this.sendErrorToClient(client, 'Message processing error')
    }
  }

  /**
   * Handle message with registered handlers
   */
  private handleMessageWithHandlers(message: RealTimeMessage, client: ConnectedClient): void {
    const handlers = this.messageHandlers.get(message.eventType) || []
    
    handlers.forEach(handler => {
      try {
        handler(message, client)
      } catch (error) {
        this.log(`❌ Error in message handler for ${message.eventType}:`, error)
      }
    })
  }

  /**
   * Handle message broadcasting
   */
  private handleMessageBroadcast(message: RealTimeMessage, client: ConnectedClient): void {
    // Don't broadcast system messages
    if ([
      RealTimeEventType.CONNECT,
      RealTimeEventType.DISCONNECT,
      RealTimeEventType.HEARTBEAT,
      RealTimeEventType.ERROR
    ].includes(message.eventType)) {
      return
    }

    // Broadcast to other clients
    this.broadcast(message, {
      excludeUserIds: client.userId ? [client.userId] : [],
      includeSender: false
    })
  }

  // ============================================================================
  // BROADCASTING
  // ============================================================================

  /**
   * Broadcast a message to connected clients
   */
  broadcast(message: RealTimeMessage, options: BroadcastOptions = {}): void {
    const {
      targetUserIds,
      excludeUserIds = [],
      includeSender = true,
      channel,
      priority = 'normal',
      queueForOffline = true
    } = options

    try {
      let targetClients: ConnectedClient[] = []

      if (targetUserIds && targetUserIds.length > 0) {
        // Send to specific users
        targetUserIds.forEach(userId => {
          const userConnections = this.userConnections.get(userId)
          if (userConnections) {
            userConnections.forEach(clientId => {
              const client = this.clients.get(clientId)
              if (client && (!excludeUserIds.includes(userId) || includeSender)) {
                targetClients.push(client)
              }
            })
          }
        })
      } else {
        // Send to all clients
        this.clients.forEach((client, clientId) => {
          if (client.userId && !excludeUserIds.includes(client.userId)) {
            targetClients.push(client)
          }
        })
      }

      // Filter by channel if specified
      if (channel) {
        targetClients = targetClients.filter(client => 
          client.subscriptions.has(channel)
        )
      }

      // Send to online clients
      targetClients.forEach(client => {
        this.sendToClient(client, message)
      })

      // Queue for offline users if requested
      if (queueForOffline && targetUserIds) {
        targetUserIds.forEach(userId => {
          if (!this.userConnections.has(userId)) {
            this.queueMessageForOfflineUser(userId, message)
          }
        })
      }

      this.log(`📢 Broadcasted ${message.eventType} to ${targetClients.length} clients`)
    } catch (error) {
      this.log('❌ Error broadcasting message:', error)
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(client: ConnectedClient, message: RealTimeMessage): boolean {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        const messageString = JSON.stringify(message)
        client.ws.send(messageString)
        return true
      } else {
        this.log(`⚠️ Client not ready (state: ${client.ws.readyState})`)
        return false
      }
    } catch (error) {
      this.log('❌ Error sending message to client:', error)
      return false
    }
  }

  /**
   * Send message to a specific user (all their connections)
   */
  sendToUser(userId: string, message: RealTimeMessage): number {
    const userConnections = this.userConnections.get(userId)
    if (!userConnections) {
      return 0
    }

    let sentCount = 0
    userConnections.forEach(clientId => {
      const client = this.clients.get(clientId)
      if (client && this.sendToClient(client, message)) {
        sentCount++
      }
    })

    return sentCount
  }

  /**
   * Send error message to client
   */
  private sendErrorToClient(client: ConnectedClient, errorMessage: string): void {
    const errorMsg: any = {
      messageId: generateMessageId(),
      timestamp: new Date().toISOString(),
      eventType: RealTimeEventType.ERROR,
      data: {
        errorCode: 'CLIENT_ERROR',
        errorMessage,
        showToUser: true,
        logError: true
      }
    }
    
    this.sendToClient(client, errorMsg)
  }

  // ============================================================================
  // OFFLINE MESSAGE QUEUING
  // ============================================================================

  /**
   * Queue message for offline user
   */
  private queueMessageForOfflineUser(userId: string, message: RealTimeMessage): void {
    if (!this.offlineMessageQueue.has(userId)) {
      this.offlineMessageQueue.set(userId, [])
    }

    const queue = this.offlineMessageQueue.get(userId)!
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    queue.push({ message, expiresAt })
    
    // Keep only last 100 messages per user
    if (queue.length > 100) {
      queue.splice(0, queue.length - 100)
    }

    this.log(`📬 Queued message for offline user ${userId} (Queue size: ${queue.length})`)
  }

  /**
   * Deliver queued messages to user
   */
  deliverQueuedMessages(userId: string): number {
    const queue = this.offlineMessageQueue.get(userId)
    if (!queue || queue.length === 0) {
      return 0
    }

    const now = new Date()
    const validMessages = queue.filter(item => item.expiresAt > now)
    const expiredMessages = queue.filter(item => item.expiresAt <= now)

    // Remove expired messages
    expiredMessages.forEach(item => {
      const index = queue.indexOf(item)
      if (index > -1) {
        queue.splice(index, 1)
      }
    })

    // Send valid messages
    let deliveredCount = 0
    validMessages.forEach(item => {
      if (this.sendToUser(userId, item.message) > 0) {
        deliveredCount++
      }
    })

    // Remove delivered messages
    if (deliveredCount > 0) {
      queue.splice(0, deliveredCount)
    }

    this.log(`📮 Delivered ${deliveredCount} queued messages to user ${userId}`)
    return deliveredCount
  }

  // ============================================================================
  // MESSAGE HANDLER REGISTRATION
  // ============================================================================

  /**
   * Register a message handler for a specific event type
   */
  on(eventType: RealTimeEventType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, [])
    }
    
    this.messageHandlers.get(eventType)!.push(handler)
    this.log(`📝 Registered handler for ${eventType}`)
  }

  /**
   * Remove a message handler
   */
  off(eventType: RealTimeEventType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
        this.log(`🗑️ Removed handler for ${eventType}`)
      }
    }
  }

  // ============================================================================
  // HEARTBEAT AND CLEANUP
  // ============================================================================

  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    const now = new Date()
    const heartbeatTimeout = this.config.heartbeatInterval * 2

    this.clients.forEach((client, clientId) => {
      const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime()
      
      if (timeSinceHeartbeat > heartbeatTimeout) {
        this.log(`💓 Client ${clientId} missed heartbeat, closing connection`)
        try {
          client.ws.close(1000, 'Heartbeat timeout')
        } catch (error) {
          this.log(`⚠️ Error closing client ${clientId}:`, error)
        }
      } else {
        // Send ping
        try {
          client.ws.ping()
        } catch (error) {
          this.log(`⚠️ Error pinging client ${clientId}:`, error)
        }
      }
    })
  }

  /**
   * Handle client pong response
   */
  private handleClientPong(clientId: string, client: ConnectedClient): void {
    client.lastHeartbeat = new Date()
  }

  /**
   * Perform cleanup tasks
   */
  private performCleanup(): void {
    // Clean up expired offline messages
    const now = new Date()
    this.offlineMessageQueue.forEach((queue, userId) => {
      const validMessages = queue.filter(item => item.expiresAt > now)
      if (validMessages.length !== queue.length) {
        this.offlineMessageQueue.set(userId, validMessages)
        this.log(`🧹 Cleaned up expired messages for user ${userId}`)
      }
    })

    // Clean up empty user connection sets
    this.userConnections.forEach((connections, userId) => {
      if (connections.size === 0) {
        this.userConnections.delete(userId)
      }
    })
  }

  // ============================================================================
  // STATISTICS AND MONITORING
  // ============================================================================

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    const now = new Date()
    const uptime = now.getTime() - this.serverStartTime.getTime()
    
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      anonymousConnections: Array.from(this.clients.values()).filter(c => !c.isAuthenticated).length,
      totalMessagesSent: 0, // TODO: Implement message counting
      totalMessagesReceived: 0, // TODO: Implement message counting
      uptime,
      lastActivity: now
    }
  }

  /**
   * Get connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.userConnections.keys())
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId)
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get client IP address
   */
  private getClientIP(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for']
    const realIP = request.headers['x-real-ip']
    
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] || 'unknown' : (forwarded.split(',')[0] || 'unknown')
    }
    
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] || 'unknown' : realIP
    }
    
    return request.socket.remoteAddress || 'unknown'
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[WebSocket Server] ${message}`, ...args)
    }
  }

  // ============================================================================
  // SERVER LIFECYCLE
  // ============================================================================

  /**
   * Handle server errors
   */
  private handleServerError(error: Error): void {
    this.log('❌ WebSocket server error:', error)
  }

  /**
   * Handle server close
   */
  private handleServerClose(): void {
    this.log('🔌 WebSocket server closed')
    this.cleanup()
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Close all client connections
    this.clients.forEach((client, clientId) => {
      try {
        client.ws.close(1000, 'Server shutdown')
      } catch (error) {
        this.log(`⚠️ Error closing client ${clientId}:`, error)
      }
    })

    this.clients.clear()
    this.userConnections.clear()
    this.offlineMessageQueue.clear()
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown(): Promise<void> {
    this.log('🔄 Shutting down WebSocket server...')
    
    this.cleanup()
    
    if (this.wss) {
      return new Promise((resolve) => {
        this.wss!.close(() => {
          this.log('✅ WebSocket server shutdown complete')
          resolve()
        })
      })
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const wsServer = new WebSocketServerManager()

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize WebSocket server
 */
export async function initializeWebSocketServer(server?: any): Promise<void> {
  return wsServer.initialize(server)
}

/**
 * Broadcast message to all clients
 */
export function broadcastMessage(message: RealTimeMessage, options?: BroadcastOptions): void {
  wsServer.broadcast(message, options)
}

/**
 * Send message to specific user
 */
export function sendMessageToUser(userId: string, message: RealTimeMessage): number {
  return wsServer.sendToUser(userId, message)
}

/**
 * Get server statistics
 */
export function getWebSocketStats(): ConnectionStats {
  return wsServer.getStats()
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return wsServer.isUserOnline(userId)
}

/**
 * Shutdown WebSocket server
 */
export async function shutdownWebSocketServer(): Promise<void> {
  return wsServer.shutdown()
}
