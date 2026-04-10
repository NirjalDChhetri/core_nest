import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '@modules/user/user.service';
import { RegisterDto, LoginDto } from './dto';
import type { Configs } from '@lib/config/config.interface';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Configs, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.userService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.userService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.userService.findByIdWithRefreshToken(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const jwtConfig = this.configService.getOrThrow('jwt', { infer: true });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        payload as any,
        {
          secret: jwtConfig.secret,
          expiresIn: jwtConfig.accessExpiresIn,
        } as any,
      ),
      this.jwtService.signAsync(
        payload as any,
        {
          secret: jwtConfig.refreshSecret,
          expiresIn: jwtConfig.refreshExpiresIn,
        } as any,
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    if (refreshToken) {
      const hashed = await bcrypt.hash(refreshToken, 12);
      await this.userService.updateRefreshToken(userId, hashed);
    } else {
      await this.userService.updateRefreshToken(userId, null);
    }
  }
}
