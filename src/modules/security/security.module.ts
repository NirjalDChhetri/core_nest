import { Global, Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import {
  CsrfTokenService,
  CsrfProtectionProvider,
} from '@common/middleware/csrf.middleware';

@Global()
@Module({
  controllers: [SecurityController],
  providers: [CsrfProtectionProvider, CsrfTokenService],
  exports: [CsrfProtectionProvider, CsrfTokenService],
})
export class SecurityModule {}
