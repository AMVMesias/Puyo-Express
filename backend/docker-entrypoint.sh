#!/bin/sh
set -eu

read_secret() {
  tr -d '\r\n' < "$1"
}

export POSTGRES_PASSWORD="$(read_secret /run/secrets/postgres_password)"
export JWT_SECRET="$(read_secret /run/secrets/jwt_secret)"
export DATA_ENCRYPTION_KEY="$(read_secret /run/secrets/data_encryption_key)"
if [ -f /run/secrets/restaurant_owner_password ]; then
  export BOOTSTRAP_RESTAURANT_PASSWORD="$(read_secret /run/secrets/restaurant_owner_password)"
fi

exec java -XX:MaxRAMPercentage=75 -XX:+UseContainerSupport -Djava.security.egd=file:/dev/urandom -jar /app/application.jar
