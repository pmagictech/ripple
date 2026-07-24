<?php

/**
 * Entry-point bootstrap: Composer autoloading + environment.
 *
 * Required by every runnable entry point (server.php, login.php, signup.php)
 * before anything else. It pulls in the Composer autoloader (which resolves the
 * PSR-4 `Ripple\` classes) and loads the gitignored .env file into $_ENV, so DB
 * credentials never live in a tracked source file. Real shell/server
 * environment variables take precedence — safeLoad() never overwrites them and
 * never throws if .env is absent.
 */

require __DIR__ . '/vendor/autoload.php';

Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
