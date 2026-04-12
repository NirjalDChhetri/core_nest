import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { CsrfTokenService } from '@common/middleware/csrf.middleware';

@Module({
  controllers: [SecurityController],
  providers: [CsrfTokenService],
  exports: [CsrfTokenService],
})
export class SecurityModule {}
