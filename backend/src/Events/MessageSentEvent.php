<?php

namespace Ripple\Events;

class MessageSentEvent implements Event
{
    public function __construct(private int $messageId) {}

    public function __toString()
    {
        return json_encode([
            'type' => 'message:sent',
            'id'   => $this->messageId
        ]);
    }
}
