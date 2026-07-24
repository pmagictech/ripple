<?php

namespace Tests;

use Ripple\Events\RegisteredEvent;
use Ripple\WebSocketServer;
use Socket;

class WebSocketServerTest extends TestCase
{
    private function dispatch(WebSocketServer $server, Socket $socket, array $payload): void
    {
        $this->call($server, 'processData', $socket, json_encode($payload));
    }

    /** @return array<string,mixed>[] decoded payloads of every message the server sent */
    private function sent(): array
    {
        return array_map(fn(string $json) => json_decode($json, true), $this->writtenMessages());
    }

    public function testAuthTypeRegistersUserAndRejoinsChats(): void
    {
        $db = $this->fakeDb();
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();

        $this->dispatch($server, $socket, ['type' => 'auth', 'id' => 5]);

        $userMap = $this->getProp($server, 'userMap');
        $this->assertSame(5, $userMap[$socket]);
        $this->assertNotEmpty($db->queries);
        $this->assertStringContainsString('FROM chats', $db->queries[0]['sql']);
    }

    public function testMessageSendTypeInsertsMessage(): void
    {
        $db = $this->fakeDb();
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 5);

        $this->dispatch($server, $socket, [
            'type' => 'message:send',
            'chatId' => 2,
            'userId' => 5,
            'username' => 'alice',
            'content' => 'hi',
        ]);

        $this->assertStringContainsString('INSERT INTO messages', $db->queries[0]['sql']);
    }

    public function testChatCreateTypeInsertsChat(): void
    {
        $db = $this->fakeDb();
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();

        $this->dispatch($server, $socket, [
            'type' => 'chat:create',
            'name' => 'General',
            'user_id' => 5,
            'username' => 'alice',
        ]);

        $this->assertStringContainsString('INSERT INTO chats', $db->queries[0]['sql']);
    }

    public function testInviteTypeLooksUpUser(): void
    {
        $db = $this->fakeDb();
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();

        $this->dispatch($server, $socket, [
            'type' => 'invite',
            'chat_id' => 3,
            'user_id' => 5,
            'name' => 'Room',
            'invited_user' => 'bob',
        ]);

        $this->assertStringContainsString('FROM users', $db->queries[0]['sql']);
    }

    public function testUnknownTypeIssuesNoQueriesOrWrites(): void
    {
        $db = $this->fakeDb();
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();

        $this->dispatch($server, $socket, ['type' => 'nonsense']);

        $this->assertSame([], $db->queries);
        $this->assertSame([], $this->written);
    }

    public function testMissingTypeIsIgnored(): void
    {
        $db = $this->fakeDb();
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();

        $this->dispatch($server, $socket, ['no_type_here' => true]);

        $this->assertSame([], $db->queries);
    }

    public function testRegisterAcksAndRejoins(): void
    {
        $db = $this->fakeDb([
            [['id' => 10, 'name' => 'General', 'type' => 'public']],
            [],
        ]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 7);

        $this->call($server, 'registerUser', $socket, 7);

        $userMap = $this->getProp($server, 'userMap');
        $this->assertSame(7, $userMap[$socket]);

        $sent = $this->sent();
        $this->assertSame('auth:success', $sent[0]['type']);
        $this->assertSame('chat:add', $sent[1]['type']);
        $this->assertSame(10, $sent[1]['payload']['id']);
        $this->assertSame('General', $sent[1]['payload']['name']);
    }

    public function testPrivateChatName(): void
    {
        $db = $this->fakeDb([
            [['id' => 11, 'name' => null, 'type' => 'private']],
            [['username' => 'bob']],
            [],
        ]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 7);

        $this->call($server, 'rejoinChats', 7);

        $this->assertSame('chat:add', $this->sent()[0]['type']);
        $this->assertSame('bob', $this->sent()[0]['payload']['name']);
    }

    public function testUnknownChatName(): void
    {
        $db = $this->fakeDb([
            [['id' => 12, 'name' => null, 'type' => 'private']],
            [],
            [],
        ]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 7);

        $this->call($server, 'rejoinChats', 7);

        $this->assertSame('Unknown', $this->sent()[0]['payload']['name']);
    }

    public function testChatsQueryFails(): void
    {
        $db = $this->fakeDb([false]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 7);

        $this->call($server, 'rejoinChats', 7);

        $error = $this->sent()[0];
        $this->assertSame('error', $error['type']);
        $this->assertStringContainsString('chats', $error['message']);
    }

    public function testMessagesInOrder(): void
    {
        $db = $this->fakeDb([
            [
                ['id' => 2, 'chat_id' => 5, 'user_id' => 9, 'username' => 'al', 'content' => 'second', 'status' => 'sent', 'created_at' => '2026-07-23 10:01:00'],
                ['id' => 1, 'chat_id' => 5, 'user_id' => 9, 'username' => 'al', 'content' => 'first', 'status' => 'sent', 'created_at' => '2026-07-23 10:00:00'],
            ],
        ]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 9);

        $this->call($server, 'sendLastMessages', 9, 5);

        $sent = $this->sent();
        $this->assertSame('first', $sent[0]['payload']['content']);
        $this->assertSame('second', $sent[1]['payload']['content']);
    }

    public function testMessagesQueryFails(): void
    {
        $db = $this->fakeDb([false]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 9);

        $this->call($server, 'sendLastMessages', 9, 5);

        $error = $this->sent()[0];
        $this->assertSame('error', $error['type']);
        $this->assertStringContainsString('messages', $error['message']);
    }

    public function testCreateChatNamed(): void
    {
        $db = $this->fakeDb([true], insertId: 99);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 5);

        $this->call($server, 'createChat', ['name' => 'Room', 'type' => 'public', 'user_id' => 5, 'username' => 'alice']);

        $chatAdd = $this->sent()[0];
        $this->assertSame('chat:add', $chatAdd['type']);
        $this->assertSame(99, $chatAdd['payload']['id']);
        $this->assertSame('Room', $chatAdd['payload']['name']);
    }

    public function testCreateChatFails(): void
    {
        $db = $this->fakeDb([false]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 5);

        $this->call($server, 'createChat', ['name' => 'Room', 'type' => 'public', 'user_id' => 5, 'username' => 'alice']);

        $this->assertSame('error', $this->sent()[0]['type']);
    }

    public function testInviteFound(): void
    {
        $db = $this->fakeDb([
            [['id' => 8, 'username' => 'bob']],
            true,
        ]);
        $server = $this->makeServer($db);
        $recipient = $this->makeSocket();
        $this->connectUser($server, $recipient, 8);

        $name = $this->call($server, 'inviteUserToChat', ['chat_id' => 3, 'user_id' => 5, 'name' => 'Room', 'invited_user' => 'bob']);

        $this->assertSame('bob', $name);
        $this->assertSame('chat:add', $this->sent()[0]['type']);
        $this->assertSame(3, $this->sent()[0]['payload']['id']);
    }

    public function testInviteNotFound(): void
    {
        $db = $this->fakeDb([[]]);
        $server = $this->makeServer($db);

        $name = $this->call($server, 'inviteUserToChat', ['chat_id' => 3, 'user_id' => 5, 'name' => 'Room', 'invited_user' => 'ghost']);

        $this->assertNull($name);
        $this->assertSame([], $this->written);
    }

    public function testInviteInsertFails(): void
    {
        $db = $this->fakeDb([
            [['id' => 8, 'username' => 'bob']],
            false,
        ]);
        $server = $this->makeServer($db);

        $name = $this->call($server, 'inviteUserToChat', ['chat_id' => 3, 'user_id' => 5, 'name' => 'Room', 'invited_user' => 'bob']);

        $this->assertNull($name);
    }

    public function testCreateChatInvitesUser(): void
    {
        $db = $this->fakeDb([
            true,
            [['id' => 8, 'username' => 'bob']],
            true,
        ], insertId: 50);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 5);

        $this->call($server, 'createChat', ['name' => '', 'type' => 'private', 'user_id' => 5, 'username' => 'alice', 'invited_user' => 'bob']);

        $this->assertSame(['bob', 'bob'], $db->queries[1]['params']);
        $ids = array_column(array_column($this->sent(), 'payload'), 'id');
        $this->assertContains(50, $ids);
    }

    public function testMessageNotRegistered(): void
    {
        $db = $this->fakeDb();
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();

        $this->call($server, 'processMessage', $socket, ['chatId' => 2, 'userId' => 5, 'username' => 'a', 'content' => 'hi']);

        $this->assertSame([], $db->queries);
        $this->assertSame([], $this->written);
    }

    public function testMessageInsertFails(): void
    {
        $db = $this->fakeDb([false]);
        $server = $this->makeServer($db);
        $socket = $this->makeSocket();
        $this->connectUser($server, $socket, 5);

        $this->call($server, 'processMessage', $socket, ['chatId' => 2, 'userId' => 5, 'username' => 'alice', 'content' => 'hi']);

        $msg = $this->sent()[0];
        $this->assertSame('message:add', $msg['type']);
        $this->assertSame('failed', $msg['payload']['status']);
    }

    public function testMessageBroadcastAndDelivered(): void
    {
        $db = $this->fakeDb([
            true,
            [['user_id' => 9]],
        ], insertId: 77);
        $server = $this->makeServer($db);
        $sender = $this->makeSocket();
        $other = $this->makeSocket();
        $this->connectUser($server, $sender, 5);
        $this->connectUser($server, $other, 9);

        $this->call($server, 'processMessage', $sender, ['chatId' => 2, 'userId' => 5, 'username' => 'alice', 'content' => 'hi']);

        $statuses = array_column(array_column($this->sent(), 'payload'), 'status');
        $this->assertContains('sent', $statuses);
        $this->assertContains('delivered', $statuses);
    }

    public function testMessageDeliveredWhenRecipientQueryFails(): void
    {
        $db = $this->fakeDb([
            true,
            false,
        ], insertId: 77);
        $server = $this->makeServer($db);
        $sender = $this->makeSocket();
        $this->connectUser($server, $sender, 5);

        $this->call($server, 'processMessage', $sender, ['chatId' => 2, 'userId' => 5, 'username' => 'alice', 'content' => 'hi']);

        $msg = $this->sent()[0];
        $this->assertSame('message:add', $msg['type']);
        $this->assertSame('sent', $msg['payload']['status']);
    }

    public function testSendMessageToUserNotConnected(): void
    {
        $server = $this->makeServer();

        $this->call($server, 'sendMessageToUser', 999, new RegisteredEvent());

        $this->assertSame([], $this->written);
    }
}
