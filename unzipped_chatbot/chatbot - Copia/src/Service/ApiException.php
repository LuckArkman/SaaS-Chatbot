<?php

declare(strict_types=1);

namespace App\Service;

class ApiException extends \RuntimeException
{
    private int $statusCode;
    private array $response;
    private string $requestUrl = '';
    private string $requestMethod = '';
    private ?array $requestBody = null;
    private string $responseRaw = '';
    /** true quando foi POST/PUT/PATCH sem corpo (ex.: bot/start como httpx sem json/data) */
    private bool $requestHadNoBody = false;

    public function __construct(
        string $message,
        int $statusCode = 0,
        array $response = [],
        string $requestUrl = '',
        string $requestMethod = '',
        ?array $requestBody = null,
        string $responseRaw = '',
        bool $requestHadNoBody = false
    ) {
        parent::__construct($message, $statusCode);
        $this->statusCode = $statusCode;
        $this->response = $response;
        $this->requestUrl = $requestUrl;
        $this->requestMethod = $requestMethod;
        $this->requestBody = $requestBody;
        $this->responseRaw = $responseRaw;
        $this->requestHadNoBody = $requestHadNoBody;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getResponse(): array
    {
        return $this->response;
    }

    public function getRequestUrl(): string
    {
        return $this->requestUrl;
    }

    public function getRequestMethod(): string
    {
        return $this->requestMethod;
    }

    public function getRequestBody(): ?array
    {
        return $this->requestBody;
    }

    public function getResponseRaw(): string
    {
        return $this->responseRaw;
    }

    public function getRequestHadNoBody(): bool
    {
        return $this->requestHadNoBody;
    }
}
