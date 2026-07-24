<?php

namespace Ripple\Events;

class ChatCreatedEvent implements Event
{
    public function __construct(private int $chatId, private string $name) {}

    public function __toString()
    {
        return json_encode([
            'type'    => 'chat:add',
            'payload' => [
                'id'   => $this->chatId,
                'name' => $this->name
            ]
        ]);
    }
}
