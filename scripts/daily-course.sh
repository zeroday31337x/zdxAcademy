#!/bin/bash
set -euo pipefail

set -a
source /etc/zerodrivex/academy/worker.env
set +a

curl -fsS   --retry 3   --retry-delay 2   --connect-timeout 15   --max-time 60   -H "Authorization: Bearer ${ACADEMY_WORKER_TOKEN}"   https://academy.zerodrivex.com/api/cron/daily-course   >> /var/log/zdx-academy-daily.log 2>&1
