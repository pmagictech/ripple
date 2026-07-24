<?php

namespace Tests;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase as BaseTestCase;
use ReflectionClass;
use Ripple\SocketTransport;
use Ripple\WebSocketServer;
use Socket;
use SplObjectStorage;

/**
 * Shared harness for the backend suite.
 *
 * Centralizes the things every WebSocketServer test needs:
 *   - a mocked SocketTransport whose write()s are captured for assertions,
 *   - a FakeDatabase seam whose queued results drive the DB paths,
 *   - reflection helpers to invoke private methods and seed private state
 *     (the server exposes almost everything as private).
 */
abstract class TestCase extends BaseTestCase
{
    /**
     * Messages written by the server, in order.
     *
     * @var list<array{0: Socket, 1: string}>
     */
    protected array $written = [];

    /**
     * Build a WebSocketServer wired to a mocked transport + a FakeDatabase.
     */
    protected function makeServer(?FakeDatabase $db = null, bool $debug = false): WebSocketServer
    {
        $transport = $this->mockTransport();
        $db ??= new FakeDatabase();

        return new WebSocketServer($transport, $db, new SplObjectStorage(), $debug);
    }

    /** A SocketTransport mock that records every send()/write() into $this->written. */
    protected function mockTransport(): SocketTransport&MockObject
    {
        $transport = $this->getMockBuilder(SocketTransport::class)
            ->disableOriginalConstructor()
            ->getMock();

        $capture = function (Socket $client, string $message): int {
            $this->written[] = [$client, $message];
            return strlen($message);
        };
        $transport->method('send')->willReturnCallback($capture);
        $transport->method('write')->willReturnCallback($capture);

        return $transport;
    }

    /**
     * A FakeDatabase seeded with an ordered queue of per-query results.
     *
     * @param list<array<int,array<string,mixed>>|bool> $queue Each entry: rows array (SELECT) or bool (write).
     */
    protected function fakeDb(array $queue = [], int $insertId = 0): FakeDatabase
    {
        $db = new FakeDatabase($queue);
        $db->nextInsertId = $insertId;

        return $db;
    }

    /** A real but unconnected Socket, usable only as an opaque map key / argument. */
    protected function makeSocket(): Socket
    {
        return socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
    }

    /** Invoke a private/protected method via reflection. */
    protected function call(object $object, string $method, mixed ...$args): mixed
    {
        $ref = new ReflectionClass($object);
        $m = $ref->getMethod($method);

        return $m->invokeArgs($object, $args);
    }

    /** Read a private/protected property via reflection. */
    protected function getProp(object $object, string $property): mixed
    {
        $ref = new ReflectionClass($object);
        $p = $ref->getProperty($property);

        return $p->getValue($object);
    }

    /** Write a private/protected property via reflection. */
    protected function setProp(object $object, string $property, mixed $value): void
    {
        $ref = new ReflectionClass($object);
        $p = $ref->getProperty($property);
        $p->setValue($object, $value);
    }

    /**
     * Register a connected user on the server: adds $socket to `clients` and
     * maps it to $userId in `userMap`, so sendMessageToUser() can reach it.
     */
    protected function connectUser(WebSocketServer $server, Socket $socket, int $userId): void
    {
        $clients = $this->getProp($server, 'clients');
        $clients[] = $socket;
        $this->setProp($server, 'clients', $clients);

        $userMap = $this->getProp($server, 'userMap');
        $userMap[$socket] = $userId;
    }

    /**
     * The JSON payloads the server sent, in order. Framing lives in
     * SocketTransport (mocked here), so writes are captured as the raw payload.
     */
    protected function writtenMessages(): array
    {
        return array_map(fn(array $entry) => $entry[1], $this->written);
    }
}
