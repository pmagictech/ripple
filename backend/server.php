<?php

use Ripple\Database;
use Ripple\SocketTransport;
use Ripple\WebSocketServer;

require __DIR__ . '/bootstrap.php';

$server = new WebSocketServer(
    SocketTransport::create('localhost', 8080),
    new Database(
        $_ENV['DB_HOST'] ?? 'localhost',
        $_ENV['DB_USER'] ?? '',
        $_ENV['DB_PASSWORD'] ?? '',
        $_ENV['DB_NAME'] ?? 'chat'
    )
);

$server->run();
