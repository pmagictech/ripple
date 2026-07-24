<?php

namespace Tests;

use mysqli_result;

/**
 * Offline stand-in for a mysqli_result.
 *
 * mysqli_result can't be constructed or mocked without a live server, and its
 * `num_rows` is a C-level internal that throws "object is already closed" on
 * read for ANY subclass — no userland declaration, default, or property hook
 * can satisfy it. So this seam overrides fetch_assoc() (which *can* be
 * overridden) and exposes the count through numRows(), which the Database
 * seam's numRows() reads back in place of the unreachable `num_rows`.
 */
class ResultSeam extends mysqli_result
{
    private int $count;

    /** @param list<array<string,mixed>> $rows */
    public function __construct(private array $rows)
    {
        $this->count = count($rows);
    }

    public function fetch_assoc(): array|null|false
    {
        return array_shift($this->rows) ?? null;
    }

    /** Stands in for the unreachable num_rows; read by FakeDatabase::numRows(). */
    public function numRows(): int
    {
        return $this->count;
    }
}
