<?php

namespace Tests;

use Ripple\Events\ChatCreatedEvent;
use Ripple\Events\ErrorEvent;
use Ripple\Events\MessageEvent;
use Ripple\Events\MessageSentEvent;
use Ripple\Events\RegisteredEvent;

/**
 * The Event value objects are pure: their __toString() must emit exactly the
 * JSON shape the frontend protocol expects.
 */
class EventsTest extends TestCase
{
    public function testRegisteredEvent(): void
    {
        $this->assertSame(
            '{"type":"auth:success"}',
            (string) new RegisteredEvent()
        );
    }

    public function testErrorEvent(): void
    {
        $this->assertSame(
            '{"type":"error","message":"boom"}',
            (string) new ErrorEvent('boom')
        );
    }

    public function testChatCreatedEvent(): void
    {
        $this->assertSame(
            '{"type":"chat:add","payload":{"id":7,"name":"General"}}',
            (string) new ChatCreatedEvent(7, 'General')
        );
    }

    public function testMessageSentEvent(): void
    {
        $this->assertSame(
            '{"type":"message:sent","id":99}',
            (string) new MessageSentEvent(99)
        );
    }

    public function testMessageEventSerialization(): void
    {
        $event = new MessageEvent(1, 2, 3, 'alice', 'hi', 'sent', '2026-07-23 10:00:00');

        $this->assertSame(
            '{"type":"message:add","payload":{"id":1,"chatId":2,"userId":3,'
            . '"username":"alice","content":"hi","status":"sent","createdAt":"2026-07-23 10:00:00"}}',
            (string) $event
        );
        $this->assertSame(3, $event->getUserId());
        $this->assertSame(2, $event->getChatId());
    }

    public function testMessageEventUpdateStatusMutatesIdAndStatus(): void
    {
        $event = new MessageEvent(0, 2, 3, 'alice', 'hi', 'failed', '2026-07-23 10:00:00');

        $event->updateStatus(555, 'delivered');
        $decoded = json_decode((string) $event, true);

        $this->assertSame(555, $decoded['payload']['id']);
        $this->assertSame('delivered', $decoded['payload']['status']);
        $this->assertSame(3, $decoded['payload']['userId']);
    }
}
