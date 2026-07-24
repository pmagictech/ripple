<?php

namespace Ripple\Events;

class MessageEvent implements Event
{
    public function __construct(
        private int $id,
        private int $chatId,
        private int $userId,
        private string $userName,
        private string $content,
        private string $status,
        private string $createdAt
    ) {}

    public function updateStatus(int $id, string $status)
    {
        $this->id = $id;
        $this->status = $status;
    }

    public function getUserId(): int
    {
        return $this->userId;
    }

    public function getChatId(): int
    {
        return $this->chatId;
    }

    public function __toString()
    {
        return json_encode([
            'type'      => 'message:add',
            'payload'   => [
                'id'        => $this->id,
                'chatId'    => $this->chatId,
                'userId'    => $this->userId,
                'username'  => $this->userName,
                'content'   => $this->content,
                'status'    => $this->status,
                'createdAt' => $this->createdAt
            ]
        ]);
    }
}
