<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use App\Bootstrap;
use App\Router;
use App\Controller\HomeController;
use App\Controller\ContatosController;
use App\Controller\BoardController;
use App\Controller\ConfigController;
use App\Controller\AgentesController;
use App\Controller\ChatbotsController;
use App\Controller\MarketingController;
use App\Controller\RelatoriosController;
use App\Controller\NotificacoesController;
use App\Controller\SuporteController;
use App\Controller\UserController;
use App\Controller\AuthController;
use App\Controller\ApiController;
use App\Controller\ApiOmniController;
use App\Controller\DevController;
use App\Controller\GatewayWebhookController;
use App\Controller\AdminController;
use App\Controller\BillingController;
use App\Support\ProgramadorAccess;
use App\Support\PublicBasePath;

Bootstrap::loadEnv();

$getBasePath = static fn (): string => PublicBasePath::fromRequest();
$requireAuth = function (callable $handler) use ($getBasePath): callable {
    return function () use ($handler, $getBasePath) {
        if (empty($_SESSION['omni_token'])) {
            $base = $getBasePath();
            header('Location: ' . ($base ? $base . '/' : '') . 'login');
            exit;
        }
        $handler();
    };
};

/** Utilizador normal do painel (bloqueia programador → envia para consola API). */
$requireAppUser = function (callable $handler) use ($getBasePath): callable {
    return function () use ($handler, $getBasePath) {
        if (empty($_SESSION['omni_token'])) {
            $base = $getBasePath();
            header('Location: ' . ($base ? $base . '/' : '') . 'login');
            exit;
        }
        if (ProgramadorAccess::shouldRedirectProgramadorFromOperationalApp()) {
            $base = $getBasePath();
            header('Location: ' . ($base ? $base . '/' : '') . 'programador/api');
            exit;
        }
        $handler();
    };
};

/** Só e-mail programador (ex.: programador@teste.com ou PROGRAMADOR_EMAILS). */
$requireProgramador = function (callable $handler) use ($getBasePath): callable {
    return function () use ($handler, $getBasePath) {
        if (empty($_SESSION['omni_token'])) {
            $base = $getBasePath();
            header('Location: ' . ($base ? $base . '/' : '') . 'login');
            exit;
        }
        if (!ProgramadorAccess::isProgramador()) {
            $base = $getBasePath();
            header('Location: ' . ($base ? $base . '/' : '') . 'home');
            exit;
        }
        $handler();
    };
};

$router = new Router();

$router->get('/', fn() => (new AuthController())->showLogin());
$router->get('/login', fn() => (new AuthController())->showLogin());
$router->post('/login', fn() => (new AuthController())->login());
$router->get('/register', fn() => (new AuthController())->showRegister());
$router->post('/register', fn() => (new AuthController())->register());
$router->get('/logout', fn() => (new AuthController())->logout());

$router->get('/dev/create-programador', fn() => (new DevController())->createProgramadorUser());
$router->get('/testes-api', $requireProgramador(fn() => (new DevController())->testesApi()));
$router->get('/testes-media', $requireAuth(fn() => (new DevController())->testesMedia()));
$router->get('/programador/api', $requireProgramador(fn() => (new DevController())->programadorApi()));
$router->get('/programador/ws-test', $requireProgramador(fn() => (new DevController())->programadorWsTest()));
$router->get('/programador/debug', $requireProgramador(fn() => (new DevController())->programadorDebug()));
/** Mesmo painel que /home — URL alternativa (ex.: bookmark …/programador/home). */
$router->get('/programador/home', $requireAppUser(fn() => (new HomeController())->index()));

$router->get('/home', $requireAppUser(fn() => (new HomeController())->index()));
$router->get('/contatos', $requireAppUser(fn() => (new ContatosController())->index()));
$router->get('/board', $requireAppUser(fn() => (new BoardController())->index()));
$router->get('/configuracoes', $requireAppUser(fn() => (new ConfigController())->index()));
$router->get('/registro-api', $requireAuth(fn() => (new ConfigController())->registroApi()));
$router->get('/gateway-webhook', $requireAuth(fn() => (new GatewayWebhookController())->index()));
$router->get('/admin', $requireAuth(fn() => (new AdminController())->index()));
$router->get('/agentes-ia', $requireAppUser(fn() => (new AgentesController())->index()));
$router->get('/chatbots', $requireAppUser(fn() => (new ChatbotsController())->index()));
$router->get('/marketing', $requireAppUser(fn() => (new MarketingController())->index()));
$router->get('/relatorios', $requireAppUser(fn() => (new RelatoriosController())->index()));
$router->get('/notificacoes', $requireAppUser(fn() => (new NotificacoesController())->index()));
$router->get('/suporte', $requireAppUser(fn() => (new SuporteController())->index()));
$router->get('/users', $requireAppUser(fn() => (new UserController())->index()));
$router->get('/users/show', $requireAppUser(fn() => (new UserController())->show()));
$router->post('/users/store', $requireAppUser(fn() => (new UserController())->store()));
$router->get('/api/posts', $requireAppUser(fn() => (new ApiController())->posts()));

// API Omni (JSON) – contatos, chat, auth, bot
$router->get('/api/omni/contacts', $requireAuth(fn() => (new ApiOmniController())->contacts()));
$router->get('/api/omni/contacts/tags', $requireAuth(fn() => (new ApiOmniController())->contactsTags()));
$router->post('/api/omni/contacts/import', $requireAuth(fn() => (new ApiOmniController())->contactsImport()));
$router->post('/api/omni/contacts/opt-out', $requireAuth(fn() => (new ApiOmniController())->contactsOptOut()));
$router->get('/api/omni/contacts/whatsapp', $requireAuth(fn() => (new ApiOmniController())->contactsWhatsappList()));
$router->post('/api/omni/contacts/whatsapp', $requireAuth(fn() => (new ApiOmniController())->contactsWhatsappAdd()));
$router->put('/api/omni/contacts/whatsapp', $requireAuth(fn() => (new ApiOmniController())->contactsWhatsappUpdate()));
$router->delete('/api/omni/contacts/whatsapp', $requireAuth(fn() => (new ApiOmniController())->contactsWhatsappDelete()));
$router->post('/api/omni/gateway/webhook', $requireAuth(fn() => (new ApiOmniController())->gatewayWebhook()));
$router->get('/api/omni/chat/history', $requireAuth(fn() => (new ApiOmniController())->chatHistory()));
$router->post('/api/omni/chat/send', $requireAuth(fn() => (new ApiOmniController())->chatSend()));
$router->post('/api/omni/storage/upload', $requireAuth(fn() => (new ApiOmniController())->storageUpload()));
$router->post('/api/omni/chat/typing', $requireAuth(fn() => (new ApiOmniController())->chatTyping()));
$router->post('/api/omni/chat/transfer', $requireAuth(fn() => (new ApiOmniController())->chatTransfer()));
$router->get('/api/omni/chat/presence', $requireAuth(fn() => (new ApiOmniController())->chatPresence()));
$router->get('/api/omni/auth/me', $requireAuth(fn() => (new ApiOmniController())->authMe()));
$router->get('/api/omni/auth/ws-config', $requireAuth(fn() => (new ApiOmniController())->authWsConfig()));
$router->get('/api/omni/campaigns', $requireAuth(fn() => (new ApiOmniController())->campaignsList()));
$router->post('/api/omni/campaigns', $requireAuth(fn() => (new ApiOmniController())->campaignsCreate()));
$router->post('/api/omni/campaigns/schedule', $requireAuth(fn() => (new ApiOmniController())->campaignsSchedule()));
$router->post('/api/omni/campaigns/pause', $requireAuth(fn() => (new ApiOmniController())->campaignsPause()));
$router->get('/api/omni/campaign', $requireAuth(fn() => (new ApiOmniController())->campaignsGetOne()));
$router->get('/api/omni/admin/tenants/summary', $requireAuth(fn() => (new ApiOmniController())->adminTenantsSummary()));
$router->get('/api/omni/admin/transactions', $requireAuth(fn() => (new ApiOmniController())->adminTransactions()));
$router->post('/api/omni/admin/system/maintenance', $requireAuth(fn() => (new ApiOmniController())->adminSystemMaintenance()));
$router->get('/api/omni/billing/plans', $requireAuth(fn() => (new ApiOmniController())->billingPlans()));
$router->get('/api/omni/billing/my-subscription', $requireAuth(fn() => (new ApiOmniController())->billingMySubscription()));
$router->get('/api/omni/billing/dashboard', $requireAuth(fn() => (new ApiOmniController())->billingDashboard()));
$router->post('/api/omni/billing/subscribe', $requireAuth(fn() => (new ApiOmniController())->billingSubscribe()));
$router->post('/api/omni/billing/checkout', $requireAuth(fn() => (new ApiOmniController())->billingCheckout()));
$router->post('/api/omni/billing/webhook', $requireAuth(fn() => (new ApiOmniController())->billingWebhookTest()));
$router->get('/api/omni/bot/status', $requireAuth(fn() => (new ApiOmniController())->botStatus()));
$router->get('/api/omni/bot/qr', $requireAuth(fn() => (new ApiOmniController())->botQr()));
$router->post('/api/omni/bot/start', $requireAuth(fn() => (new ApiOmniController())->botStart()));
$router->post('/api/omni/bot/stop', $requireAuth(fn() => (new ApiOmniController())->botStop()));
$router->post('/api/omni/bot/restart', $requireAuth(fn() => (new ApiOmniController())->botRestart()));
$router->delete('/api/omni/bot/logout', $requireAuth(fn() => (new ApiOmniController())->botLogout()));
$router->get('/api/omni/flows', $requireAuth(fn() => (new ApiOmniController())->flowsList()));
$router->post('/api/omni/flows', $requireAuth(fn() => (new ApiOmniController())->flowsCreate()));
$router->get('/api/omni/flow', $requireAuth(fn() => (new ApiOmniController())->flowsGetOne()));
$router->patch('/api/omni/flow', $requireAuth(fn() => (new ApiOmniController())->flowsPatch()));
$router->delete('/api/omni/flow', $requireAuth(fn() => (new ApiOmniController())->flowsDelete()));
$router->get('/api/omni/openapi-spec', $requireAuth(fn() => (new ApiOmniController())->openapiSpec()));
$router->post('/api/omni/dev/call', $requireAuth(fn() => (new ApiOmniController())->devCall()));

$router->dispatch();
