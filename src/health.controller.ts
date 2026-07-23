import { Controller, Get } from '@nestjs/common';

// Public, unauthenticated liveness endpoint at GET /api/health.
// Useful for host health checks and for an uptime pinger to keep a free-tier
// instance from sleeping.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { ok: true, ts: new Date().toISOString() };
  }
}
