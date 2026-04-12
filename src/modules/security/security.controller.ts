import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CsrfTokenService } from '@common/middleware/csrf.middleware';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(private readonly csrfTokenService: CsrfTokenService) {}

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Get CSRF token for state-changing requests' })
  getCsrfToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): { token: string } {
    const token = this.csrfTokenService.generateToken(req, res);
    return { token };
  }
}
