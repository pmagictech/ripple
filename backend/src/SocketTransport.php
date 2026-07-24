<?php

namespace Ripple;

use Exception;
use Socket;

class SocketTransport
{
    private Socket $socket;

    public function __construct(string $host, int $port)
    {
        $this->socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        socket_set_option($this->socket, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_bind($this->socket, $host, $port);
    }

    private function listen()
    {
        return socket_listen($this->socket);
    }

    public static function create(string $host, int $port): SocketTransport
    {
        $transport = new SocketTransport($host, $port);

        if (!$transport->listen()) {
            throw new Exception("Failed to listen on $host:$port");
        }

        return $transport;
    }

    public function getSocket(): Socket
    {
        return $this->socket;
    }

    public function select(array &$read, ?array &$write, ?array &$except)
    {
        return socket_select($read, $write, $except, null);
    }

    public function accept()
    {
        return socket_accept($this->socket);
    }

    public function read(Socket $client)
    {
        return socket_read($client, 2048);
    }

    public function write(Socket $client, string $message)
    {
        return socket_write($client, $message);
    }

    /** Frames the message as a WebSocket payload, then writes it. */
    public function send(Socket $client, string $message)
    {
        return $this->write($client, $this->encode($message));
    }

    public function close(Socket $client)
    {
        return socket_close($client);
    }

    /**
     * Decodes an inbound (masked) WebSocket frame into its string message.
     *
     * @param string $data The raw WebSocket frame
     * @return string The decoded message
     */
    public function decode(string $data): string
    {
        $length = ord($data[1]) & 127;
        if ($length == 126) {
            $masks = substr($data, 4, 4);
            $payload = substr($data, 8);
        } elseif ($length == 127) {
            $masks = substr($data, 10, 4);
            $payload = substr($data, 14);
        } else {
            $masks = substr($data, 2, 4);
            $payload = substr($data, 6);
        }

        $decoded = '';
        for ($i = 0; $i < strlen($payload); ++$i) {
            $decoded .= $payload[$i] ^ $masks[$i % 4];
        }

        return $decoded;
    }

    /**
     * Encodes a payload into an outbound (unmasked) WebSocket frame.
     *
     * @param string $payload The payload to encode
     * @return string The encoded WebSocket frame
     */
    public function encode(string $payload): string
    {
        $b1 = 0x80 | (0x1 & 0x0f);
        $length = strlen($payload);

        if ($length <= 125) {
            $header = pack('CC', $b1, $length);
        } elseif ($length <= 65535) {
            $header = pack('CCn', $b1, 126, $length);
        } else {
            $header = pack('CCNN', $b1, 127, 0, $length);
        }

        return $header . $payload;
    }
}
