<?php

namespace Tests;

/**
 * performHandshake() must answer the opening HTTP Upgrade with a 101 response
 * whose Sec-WebSocket-Accept is SHA1(key + magic GUID), base64-encoded.
 */
class HandshakeTest extends TestCase
{
    public function testHandshakeComputesRfcAcceptKey(): void
    {
        $server = $this->makeServer();
        $client = $this->makeSocket();

        // Canonical example pair from RFC 6455 section 1.3.
        $headers = "GET /chat HTTP/1.1\r\n"
            . "Host: localhost:8080\r\n"
            . "Upgrade: websocket\r\n"
            . "Connection: Upgrade\r\n"
            . "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
            . "Sec-WebSocket-Version: 13\r\n\r\n";

        $this->call($server, 'performHandshake', $client, $headers);

        $this->assertCount(1, $this->written);
        $response = $this->written[0][1];

        $this->assertStringStartsWith('HTTP/1.1 101 Switching Protocols', $response);
        $this->assertStringContainsString('Upgrade: websocket', $response);
        $this->assertStringContainsString(
            'Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=',
            $response
        );
    }
}
