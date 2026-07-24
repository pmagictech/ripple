<?php

namespace Ripple;

/**
 * Username/password authentication against the database.
 *
 * Both methods take a Database seam (a real connection or a test double) and a
 * decoded request body, and return a JSON-serializable response array. They
 * contain no HTTP/transport concerns — the login.php / signup.php entry points
 * handle request/response wiring.
 */
class Auth
{
    /**
     * Authenticates a user against the database.
     *
     * @param Database $db   The database seam (real connection or a test double).
     * @param array $data    Decoded request body with "username" and "password".
     * @return array         JSON-serializable response.
     */
    public static function login(Database $db, array $data): array
    {
        $result = $db->execute_query(
            "SELECT * FROM users WHERE username = ?",
            [$data["username"]]
        );

        if (!$result || $db->numRows($result) === 0) {
            return ["success" => false, "error" => "Invalid username or password"];
        }

        $user = $result->fetch_assoc();

        if (!password_verify($data["password"], $user["password"])) {
            return ["success" => false, "error" => "Invalid username or password"];
        }

        return ["success" => true, "id" => $user["id"], "username" => $user["username"]];
    }

    /**
     * Registers a new user and auto-joins them to the seeded public chat (id 1).
     *
     * @param Database $db   The database seam (real connection or a test double).
     * @param array $data    Decoded request body with "username" and "password".
     * @return array         JSON-serializable response.
     */
    public static function signup(Database $db, array $data): array
    {
        $result = $db->execute_query(
            "SELECT * FROM users WHERE username = ?",
            [$data["username"]]
        );

        if ($result && $db->numRows($result) > 0) {
            return ["success" => false, "error" => "Username already exists"];
        }

        $password = password_hash($data["password"], PASSWORD_DEFAULT);

        $result = $db->execute_query(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            [$data["username"], $password]
        );

        if (!$result) {
            return ["success" => false, "error" => "Failed to create user, please try again"];
        }

        $userId = $db->insertId();

        $db->execute_query(
            "INSERT INTO chats_users (chat_id, user_id) VALUES (?, ?)",
            [1, $userId]
        );

        return ["success" => true, "id" => $userId, "username" => $data["username"]];
    }
}
