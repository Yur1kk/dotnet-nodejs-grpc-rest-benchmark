#!/bin/sh
# Ignore migration errors if baselined
npx prisma migrate deploy || echo "Migration deploy failed (likely already initialized), proceeding..."
exec pm2-runtime start dist/src/main.js -i 2