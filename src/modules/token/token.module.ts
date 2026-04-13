import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '@entities/refresh-token.entity';
import { TokenService } from './token.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { REFRESH_TOKEN_REPOSITORY } from './interfaces/refresh-token-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  providers: [
    TokenService,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: RefreshTokenRepository,
    },
  ],
  exports: [TokenService],
})
export class TokenModule {}
