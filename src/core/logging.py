import sys
from loguru import logger
from src.core.config import settings

def setup_logging():
    # Remove o handler padrão do loguru
    logger.remove()

    # Log no Console (Colorido e legível para Dev)
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO",
        colorize=True
    )

    # Log em Arquivo (JSON estruturado para análise em Produção)
    # Roda a cada 500MB ou diariamente, mantém 10 dias de histórico
    logger.add(
        "logs/app.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
        level="DEBUG",
        rotation="500 MB",
        retention="10 days",
        compression="zip",
        serialize=True # Gera formato JSON
    )

    logger.info("📡 Sistema de Logging estruturado inicializado.")
