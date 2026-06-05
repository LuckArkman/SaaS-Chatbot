FROM php:8.2-apache

# Instalar extensões do PHP necessárias (como pdo_mysql)
RUN docker-php-ext-install pdo_mysql

# Habilitar o mod_rewrite do Apache para funcionamento das regras de rotas
RUN a2enmod rewrite

# Configurar o Apache para escutar na porta 8081 (como esperado pelo proxy Nginx)
RUN sed -i 's/Listen 80/Listen 8081/' /etc/apache2/ports.conf
RUN sed -i 's/<VirtualHost \*:80>/<VirtualHost \*:8081>/' /etc/apache2/sites-available/000-default.conf

# Ajustar o DocumentRoot do Apache para apontar para a pasta public do chatbot
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Definir o diretório de trabalho
WORKDIR /var/www/html

# Copiar os arquivos do frontend para o container
COPY . .

# Ajustar permissões para o servidor Apache
RUN chown -R www-data:www-data /var/www/html

EXPOSE 8081
