<?php

namespace Ripple;

use Closure;
use Error;
use Ripple\Events\ChatCreatedEvent;
use Ripple\Events\ErrorEvent;
use Ripple\Events\Event;
use Ripple\Events\MessageEvent;
use Ripple\Events\RegisteredEvent;
use Socket;
use SplObjectStorage;

class WebSocketServer
{
    private $clients = [];

    /**
     * WebSocketServer constructor.
     * @param SocketTransport $server The transport layer for handling socket connections
     * @param Database $db The database connection
     * @param SplObjectStorage $userMap A mapping of connected sockets to user IDs
     * @param bool $debug Whether to enable debug logging
     */
    public function __construct(
        private SocketTransport $server,
        private Database $db,
        private SplObjectStorage $userMap = new SplObjectStorage(),
        private bool $debug = true
    ) {
        if ($this->db->connect_error) {
            die("Database connection failed: " . $this->db->connect_error); // @codeCoverageIgnore
        }

        $this->log("WebSocket server started");
    }

    /**
     * Logs a message to the console if debug mode is enabled.
     *
     * @param string $message The message to log
     * @codeCoverageIgnore
     */
    private function log(string $message): void
    {
        if ($this->debug) {
            echo $message . "\n";
        }
    }

    /**
     * Runs the WebSocket server, handling new connections and incoming messages.
     * @codeCoverageIgnore
     */
    public function run(): void
    {
        $this->clients[] = $this->server->getSocket();

        while (true) {
            $changed = $this->clients;
            $write = null;
            $except = null;
            $this->server->select($changed, $write, $except);

            foreach ($changed as $socket) {
                if ($socket == $this->server->getSocket()) {
                    $this->handleNewConnection();
                } else {
                    try {
                        $data = $this->server->read($socket);

                        if ($data === false || strlen($data) === 0) {
                            unset($this->clients[array_search($socket, $this->clients)]);
                            unset($this->userMap[$socket]);
                            $this->server->close($socket);
                            $this->log("Client disconnected");
                            continue;
                        }

                        $this->processData($socket, $this->server->decode($data));
                    } catch (Error $e) {
                        $this->log("Error processing data: " . $e->getMessage());
                        $this->log($e->getTraceAsString());
                    }
                }
            }
        }
    }

    /**
     * Handles a new client connection, performing the WebSocket handshake.
     * @codeCoverageIgnore
     */
    private function handleNewConnection(): void
    {
        $client = $this->server->accept();
        $this->clients[] = $client;

        $headers = $this->server->read($client);
        $this->performHandshake($client, $headers);

        $this->log("Client connected");
    }

    /**
     * Performs the WebSocket handshake with a new client.
     *
     * @param Socket $client The socket of the new client
     * @param string $headers The HTTP headers sent by the client
     */
    private function performHandshake(Socket $client, string $headers): void
    {
        preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $headers, $matches);
        $key = trim($matches[1]);

        $acceptKey = base64_encode(sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true));

        $upgrade = "HTTP/1.1 101 Switching Protocols\r\n" .
            "Upgrade: websocket\r\n" .
            "Connection: Upgrade\r\n" .
            "Sec-WebSocket-Accept: $acceptKey\r\n\r\n";

        $this->server->write($client, $upgrade);
    }

    /**
     * Processes incoming data from a client, decoding the message and handling it based on its type.
     *
     * @param Socket $socket The socket of the client that sent the data
     * @param string $data The raw data received from the client
     */
    private function processData(Socket $socket, string $data): void
    {
        $this->log("Received: " . preg_replace('/[[:cntrl:]]/u', '', $data));

        $payload = json_decode($data, true);

        if (isset($payload['type'])) {
            switch ($payload['type']) {
                case 'auth':
                    $this->registerUser($socket, $payload['id']);
                    break;

                case 'message:send':
                    $this->processMessage($socket, $payload);
                    break;

                case 'chat:create':
                    $this->createChat($payload);
                    break;

                case 'invite':
                    $this->inviteUserToChat($payload);
                    break;

                default:
                    $this->log("Unknown message type: {$payload['type']}");
                    break;
            }
        }
    }

    /**
     * Registers a user with the WebSocket server and sends them their chat history.
     *
     * @param Socket $socket The socket of the user to register
     * @param int $userId The ID of the user to register
     */
    private function registerUser(Socket $socket, int $userId): void
    {
        $this->userMap[$socket] = $userId;
        $this->log("Registered user_id: {$userId} for socket");

        $this->sendMessageToUser($userId, new RegisteredEvent());

        $this->rejoinChats($userId);
    }

    private function rejoinChats(int $userId): void
    {
        $chats = $this->db->execute_query(
            "SELECT c.id, c.name, c.type FROM chats c
            JOIN chats_users cu ON c.id = cu.chat_id
            WHERE cu.user_id = ? OR c.type = 'public'
            GROUP BY c.id",
            [$userId]
        );

        if (!$chats) {
            $this->log("Failed to retrieve chats for user_id: {$userId}");
            $this->sendMessageToUser($userId, new ErrorEvent('Failed to retrieve chats.'));
            return;
        }

        while ($chat = $chats->fetch_assoc()) {
            if (!$chat['name'] && $chat['type'] === 'private') {
                $result = $this->db->execute_query(
                    "SELECT username FROM users JOIN chats_users cu ON users.id = cu.user_id WHERE cu.chat_id = ? AND users.id != ?",
                    [$chat['id'], $userId]
                )?->fetch_assoc();

                $name = $result['username'] ?? 'Unknown';
            } else {
                $name = $chat['name'] ?? 'Unnamed Chat';
            }

            $this->sendMessageToUser($userId, new ChatCreatedEvent($chat['id'], $name));

            $this->sendLastMessages($userId, $chat['id']);
        }
    }

    private function sendLastMessages(int $userId, int $chatId): void
    {
        $result = $this->db->execute_query(
            "SELECT m.*, u.username FROM messages m JOIN users u ON m.user_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at DESC LIMIT 10",
            [$chatId]
        );

        if (!$result) {
            $this->log("Failed to retrieve messages for chat_id: {$chatId}");
            $this->sendMessageToUser($userId, new ErrorEvent('Failed to retrieve messages.'));
            return;
        }

        $messages = [];
        while ($message = $result->fetch_assoc()) {
            $messages[] = new MessageEvent(
                $message['id'],
                $message['chat_id'],
                $message['user_id'],
                $message['username'],
                $message['content'],
                $message['status'],
                $message['created_at']
            );
        }

        foreach (array_reverse($messages) as $messageEvent) {
            $this->sendMessageToUser($userId, $messageEvent);
        }
    }

    /**
     * Creates a new chat and optionally invites a user to it.
     *
     * @param array{name: string, type: string, name?: string, username: string, user_id: int, invited_user?: string|int} $payload
     */
    private function createChat(array $payload)
    {
        $result = $this->db->execute_query("INSERT INTO chats (name, type) VALUES (?, ?)", [
            $payload['name'],
            $payload['type']
        ]);

        if (!$result) {
            $this->log("Failed to create chat");
            $this->sendMessageToUser($payload['user_id'], new ErrorEvent('Failed to create chat.'));
            return;
        }

        $chatId = $this->db->insertId();
        $name = $payload['name'] ?? null;

        if (!$name && $payload['invited_user'] ?? false) {
            $name = $this->inviteUserToChat([
                'chat_id'      => $chatId,
                'user_id'      => $payload['user_id'],
                'name'         => $payload['username'],
                'invited_user' => $payload['invited_user']
            ]);
        }

        $this->log("Created chat_id: {$chatId} with name: {$name}");
        $this->sendMessageToUser($payload['user_id'], new ChatCreatedEvent($chatId, $name));
    }

    /**
     * Invites a user to a chat by inserting a record into the chats_users table.
     *
     * @param array{chat_id: int, user_id: int, name: string, invited_user: string|int} $payload
     * @return string|null Returns the username of the invited user or null if the invitation failed
     */
    private function inviteUserToChat(array $payload)
    {
        $result = $this->db->execute_query("SELECT * FROM users WHERE id = ? OR username = ?", [
            $payload['invited_user'],
            $payload['invited_user']
        ]);

        if (!$result || $this->db->numRows($result) === 0) {
            $this->log("User not found for invitation: {$payload['invited_user']}");
            return null;
        }

        $user = $result->fetch_assoc();

        $result = $this->db->execute_query("INSERT INTO chats_users (chat_id, user_id) VALUES (?, ?)", [
            $payload['chat_id'],
            $user['id']
        ]);

        if (!$result) {
            $this->log("Failed to invite user_id: {$payload['user_id']} to chat_id: {$payload['chat_id']}");
            return null;
        }

        $this->log("Invited user_id: {$payload['user_id']} to chat_id: {$payload['chat_id']}");

        $this->sendMessageToUser($user['id'], new ChatCreatedEvent($payload['chat_id'], $payload['name']));

        return $user['username'];
    }

    /**
     * Processes a message sent by a user, inserting it into the database and notifying other users in the chat.
     *
     * @param Socket $socket The socket of the user who sent the message
     * @param array{chatId: int, userId: int, username: string, content: string} $payload
     */
    private function processMessage(Socket $socket, array $payload): void
    {
        if (!isset($this->userMap[$socket])) {
            $this->log("User not registered for socket");
            return;
        }

        $result = $this->db->execute_query("INSERT INTO messages (chat_id, user_id, content) VALUES (?, ?, ?)", [
            $payload['chatId'],
            $payload['userId'],
            $payload['content']
        ]);

        $messageEvent = new MessageEvent(
            time(),
            $payload['chatId'],
            $payload['userId'],
            $payload['username'],
            $payload['content'],
            'failed',
            date('Y-m-d H:i:s')
        );

        if (!$result) {
            $this->log("Failed to insert message for chat_id: {$payload['chatId']} and user_id: {$payload['userId']}");
            $this->sendMessageToUser($payload['userId'], $messageEvent);
            return;
        }

        $messageId = $this->db->insertId();

        $messageEvent->updateStatus($messageId, 'sent');

        $this->sendMessageToUser($payload['userId'], $this->sendChatMsg($messageEvent));

        $this->log("Processed message_id: {$messageId} for chat_id: {$payload['chatId']} and user_id: {$payload['userId']}");
    }

    private function sendChatMsg(MessageEvent $messageEvent)
    {
        $result = $this->db->execute_query(
            "SELECT user_id FROM chats_users WHERE chat_id = ? AND user_id != ?",
            [$messageEvent->getChatId(), $messageEvent->getUserId()]
        );

        if (!$result) {
            $this->log("Failed to retrieve users for chat_id: {$messageEvent->getChatId()}");
            return $messageEvent;
        }

        while ($user = $result->fetch_assoc()) {
            $this->sendMessageToUser(
                $user['user_id'],
                $messageEvent,
                fn() => $messageEvent->updateStatus($messageEvent->getUserId(), 'delivered')
            );
        }

        return $messageEvent;
    }

    private function sendMessageToUser(int $userId, Event $payload, Closure | null $callback = null)
    {
        foreach ($this->clients as $client) {
            if (isset($this->userMap[$client]) && $this->userMap[$client] === $userId) {
                $this->server->send($client, $payload);
                $this->log("Sent message to user_id: {$userId}, payload: {$payload}");

                if ($callback) {
                    $callback();
                }

                return;
            }
        }

        $this->log("User_id: {$userId} not connected, message not sent");
    }
}
