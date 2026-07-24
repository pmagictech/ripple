<?php

namespace Tests;

use Ripple\Database;
use mysqli_result;

/**
 * Offline Database seam passed into WebSocketServer / login() / signup() by the
 * tests. Extends the production Database (so it satisfies the `Database` type
 * hints and reads `connect_error` as null) but skips the real mysqli
 * connection and answers queries from an ordered queue of canned results.
 *
 * Each queued value is:
 *   - an array of rows -> wrapped in a ResultSeam (a SELECT result),
 *   - true / false     -> returned as-is (a write's success flag).
 * When the queue is empty, execute_query() returns an empty result set.
 */
class FakeDatabase extends Database
{
    /** @var list<array{sql:string,params:array}> Every query this received, in order. */
    public array $queries = [];

    /** Value returned by insertId(). */
    public int $nextInsertId = 0;

    /** @param list<array<int,array<string,mixed>>|bool> $queue Ordered per-call return values. */
    public function __construct(private array $queue = [])
    {
        // Intentionally does NOT call parent::__construct — no live connection.
    }

    public function execute_query(string $query, ?array $params = null): mysqli_result|bool
    {
        $this->queries[] = ['sql' => $query, 'params' => $params ?? []];

        $value = array_shift($this->queue) ?? [];

        if (is_bool($value)) {
            return $value;
        }

        return new ResultSeam($value);
    }

    public function insertId(): int
    {
        return $this->nextInsertId;
    }

    public function numRows(mysqli_result $result): int
    {
        return $result instanceof ResultSeam ? $result->numRows() : (int) $result->num_rows;
    }
}
