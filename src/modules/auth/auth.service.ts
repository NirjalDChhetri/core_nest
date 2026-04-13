import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '@modules/user/user.service';
import { TokenService } from '@modules/token/token.service';
import { OtpService } from '@modules/otp/otp.service';
import { AuthProvider, User } from '@entities/user.entity';
import { OtpType } from '@entities/otp-log.entity';
import { RoleEnum } from '@common/enums';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import type { Configs } from '@lib/config/config.interface';
import ms from 'ms';

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
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Configs, true>,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException({
        message: 'User with this email already exists',
        errors: { email: ['User with this email already exists'] },
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.userService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: RoleEnum.USER,
      provider: AuthProvider.LOCAL,
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Login Step 1: Validate credentials → Send OTP ─────────────────────────

  async login(
    dto: LoginDto,
  ): Promise<{ message: string; requiresOtp: boolean }> {
    const user = await this.userService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid: boolean = await bcrypt.compare(
      dto.password,
      user.password ?? '',
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Send OTP to the user's email for login verification
    await this.otpService.generateAndSendOtp(
      user.id,
      user.email,
      OtpType.TWO_FACTOR,
    );

    return {
      message: 'OTP sent to your email. Please verify to complete login.',
      requiresOtp: true,
    };
  }

  // ── Login Step 2: Verify OTP → Issue tokens ───────────────────────────────

  async verifyLoginOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.otpService.verifyOtp(user.id, dto.otp, OtpType.TWO_FACTOR);

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Refresh tokens ────────────────────────────────────────────────────────

  async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const storedToken = await this.tokenService.validateRefreshToken(
      userId,
      refreshToken,
    );
    if (!storedToken) {
      throw new UnauthorizedException('Access denied');
    }

    const user = await this.userService.findById(userId);

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Logout: revoke refresh tokens + blacklist access token ────────────────

  async logout(userId: number, accessToken: string): Promise<void> {
    // Revoke all refresh tokens so the user cannot get new access tokens
    await this.tokenService.revokeAllForUser(userId);

    // Blacklist the current access token in Redis until it expires naturally
    if (accessToken) {
      await this.blacklistToken(accessToken);
    }
  }

  // ── Change Password ───────────────────────────────────────────────────────

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
    accessToken: string,
  ): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    const userWithPassword = await this.userService.findByEmailWithPassword(
      user.email,
    );

    if (!userWithPassword?.password) {
      throw new BadRequestException({
        message: 'Cannot change password for OAuth accounts',
        errors: {
          currentPassword: [
            'Password change is not available for accounts linked via Google or other OAuth providers',
          ],
        },
      });
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      userWithPassword.password,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException({
        message: 'Current password is incorrect',
        errors: { currentPassword: ['Current password is incorrect'] },
      });
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.userService.updatePassword(userId, hashedPassword);

    // Revoke all sessions so the user must re-login with new password
    await this.tokenService.revokeAllForUser(userId);
    if (accessToken) {
      await this.blacklistToken(accessToken);
    }

    return { message: 'Password changed successfully. Please login again.' };
  }

  // ── Forgot Password: Send OTP ────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(dto.email);

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message:
          'If an account exists with this email, a reset code has been sent.',
      };
    }

    await this.otpService.generateAndSendOtp(
      user.id,
      user.email,
      OtpType.PASSWORD_RESET,
    );

    return {
      message:
        'If an account exists with this email, a reset code has been sent.',
    };
  }

  // ── Reset Password: Verify OTP + set new password ────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException({
        message: 'Invalid or expired OTP',
        errors: { otp: ['Invalid or expired OTP'] },
      });
    }

    await this.otpService.verifyOtp(user.id, dto.otp, OtpType.PASSWORD_RESET);

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.userService.updatePassword(user.id, hashedPassword);

    // Revoke all sessions after password reset
    await this.tokenService.revokeAllForUser(user.id);

    return { message: 'Password reset successfully. Please login.' };
  }

  // ── Google OAuth: generate tokens for OAuth user ──────────────────────────

  async googleLogin(user: User): Promise<AuthTokens> {
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

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

  private async storeRefreshToken(
    userId: number,
    rawToken: string,
  ): Promise<void> {
    const jwtConfig = this.configService.getOrThrow('jwt', { infer: true });
    const ttlMs = ms(jwtConfig.refreshExpiresIn as ms.StringValue);
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.tokenService.storeRefreshToken(userId, rawToken, expiresAt);
  }

  private async blacklistToken(accessToken: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(accessToken) as {
        exp?: number;
      } | null;
      if (decoded?.exp) {
        const remainingMs = decoded.exp * 1000 - Date.now();
        if (remainingMs > 0) {
          await this.tokenService.blacklistAccessToken(
            accessToken,
            remainingMs,
          );
        }
      }
    } catch {
      // Token decode failed — already invalid, no need to blacklist
    }
  }
}
