<?php

namespace Tests;

use Ripple\Auth;

class AuthTest extends TestCase
{
    public function testLoginUnknownUser(): void
    {
        $db = $this->fakeDb([[]]);
        $result = Auth::login($db, ['username' => 'ghost', 'password' => 'x']);

        $this->assertFalse($result['success']);
        $this->assertSame('Invalid username or password', $result['error']);
    }

    public function testLoginWrongPassword(): void
    {
        $db = $this->fakeDb([[
            ['id' => 1, 'username' => 'alice', 'password' => password_hash('correct', PASSWORD_DEFAULT)],
        ]]);
        $result = Auth::login($db, ['username' => 'alice', 'password' => 'wrong']);

        $this->assertFalse($result['success']);
    }

    public function testLoginSuccess(): void
    {
        $db = $this->fakeDb([[
            ['id' => 1, 'username' => 'alice', 'password' => password_hash('secret', PASSWORD_DEFAULT)],
        ]]);
        $result = Auth::login($db, ['username' => 'alice', 'password' => 'secret']);

        $this->assertTrue($result['success']);
        $this->assertSame(1, $result['id']);
        $this->assertSame('alice', $result['username']);
    }

    public function testSignupDuplicate(): void
    {
        $db = $this->fakeDb([[['id' => 1, 'username' => 'alice']]]);
        $result = Auth::signup($db, ['username' => 'alice', 'password' => 'x']);

        $this->assertFalse($result['success']);
        $this->assertSame('Username already exists', $result['error']);
    }

    public function testSignupInsertFails(): void
    {
        $db = $this->fakeDb([
            [],
            false,
        ]);
        $result = Auth::signup($db, ['username' => 'bob', 'password' => 'x']);

        $this->assertFalse($result['success']);
        $this->assertSame('Failed to create user, please try again', $result['error']);
    }

    public function testSignupSuccessAutoJoinsPublicChat(): void
    {
        $db = $this->fakeDb([
            [],
            true,
            true,
        ], insertId: 42);
        $result = Auth::signup($db, ['username' => 'bob', 'password' => 'x']);

        $this->assertTrue($result['success']);
        $this->assertSame(42, $result['id']);
        $this->assertSame('bob', $result['username']);
        $this->assertStringContainsString('INSERT INTO chats_users', $db->queries[2]['sql']);
        $this->assertSame([1, 42], $db->queries[2]['params']);
    }
}
