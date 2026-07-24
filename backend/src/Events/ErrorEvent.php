<?php

namespace Ripple\Events;

class ErrorEvent implements Event
{
    public function __construct(private string $message) {}

    public function __toString()
    {
        return json_encode([
            'type'    => 'error',
            'message' => $this->message
        ]);
    }
}
