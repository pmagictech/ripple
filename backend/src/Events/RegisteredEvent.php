<?php

namespace Ripple\Events;

class RegisteredEvent implements Event
{
    public function __toString()
    {
        return json_encode(['type' => 'auth:success']);
    }
}
