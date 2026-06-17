import Redis, { RedisOptions } from "ioredis";

/**
 * Monta o cliente Redis aceitando múltiplas formas de configuração:
 * 1) URI completa: IO_REDIS_URI | REDIS_URI | REDIS_URL
 * 2) Parâmetros soltos: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
 *
 * Default atual: host 127.0.0.1 e PORTA 5001.
 */
function createRedis(): Redis {
  const uri =
    process.env.IO_REDIS_URI ||
    process.env.REDIS_URI ||
    process.env.REDIS_URL ||
    "";

  // Opções comuns seguras para ioredis
  const common: RedisOptions = {
    // maxRetriesPerRequest: null, // Descomente para retentativas infinitas
    // enableReadyCheck: true,
  };

  if (uri) {
    return new Redis(uri, common);
  }

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(
    process.env.IO_REDIS_PORT ||
      process.env.REDIS_PORT ||
      5001 // Default
  );
  const password = process.env.REDIS_PASSWORD || undefined;
  const db =
    process.env.REDIS_DB !== undefined ? Number(process.env.REDIS_DB) : undefined;

  return new Redis({
    host,
    port,
    password,
    db,
    ...common
  });
}

const redis = createRedis();

// Helper para criar a chave do lock de forma padronizada
const k = (id: number | string) => `flow:lock:welcome:${id}`;

/**
 * Tenta adquirir um lock para um ticket por alguns segundos (TTL).
 * Se conseguir, retorna true; se já houver lock ativo, retorna false.
 */
export async function acquireTicketWelcomeLock(
  ticketId: number,
  ttlSec = Number(process.env.FLOW_MENU_COOLDOWN_SEC || 8)
): Promise<boolean> {
  try {
    // Comando atômico: define a chave com expiração apenas se ela não existir.
    const res = await redis.set(k(ticketId), "1", "EX", ttlSec, "NX");
    return res === "OK";
  } catch (err) {
    console.error("Redis lock error:", err);
    // Em caso de erro no Redis, não travar o fluxo por completo.
    // Retorne 'true' para deixar o atendimento seguir.
    return true;
  }
}

/**
 * Libera o "lock" de um ticket, removendo a chave do Redis.
 * Isso permite que o fluxo seja acionado novamente para o mesmo ticket.
 */
export async function releaseTicketWelcomeLock(ticketId: number): Promise<void> {
  try {
    // Deleta a chave de lock
    await redis.del(k(ticketId));
  } catch (err) {
    console.error("Redis unlock error:", err);
    // Um erro aqui não é crítico, apenas logamos.
  }
}