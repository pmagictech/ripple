<?php

use Ripple\Auth;
use Ripple\Database;

require __DIR__ . '/bootstrap.php';

header("Access-Control-Allow-Origin: http://localhost:5173");

$data = json_decode(file_get_contents("php://input"), true);

$db = new Database(
    $_ENV['DB_HOST'] ?? 'localhost',
    $_ENV['DB_USER'] ?? '',
    $_ENV['DB_PASSWORD'] ?? '',
    $_ENV['DB_NAME'] ?? 'chat'
);

echo json_encode(Auth::login($db, $data));
