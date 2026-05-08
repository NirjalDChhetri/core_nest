import ms from 'ms';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RoleEnum } from '@common/enums';
import { Role } from '@entities/role.entity';
import { ConfigService } from '@nestjs/config';
import { OtpType } from '@entities/otp-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OtpService } from '@modules/otp/otp.service';
import { UserService } from '@modules/user/user.service';
import { AuthProvider, User } from '@entities/user.entity';
import { TokenService } from '@modules/token/token.service';
import type { Configs } from '@lib/config/config.interface';
import type { SessionInfo } from '@modules/token/token.service';
import { DeviceService } from '@modules/device/device.service';
import type { RequestDeviceMeta } from '@common/middleware/device-info.middleware';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
  /** Session identifier — idx of the RefreshToken record. Present in both access and refresh tokens. */
  sid?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Identifies this session — use for targeted logout (DELETE /auth/sessions/:sessionIdx) */
  sessionIdx: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly deviceService: DeviceService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Configs, true>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    meta?: RequestDeviceMeta,
  ): Promise<AuthTokens> {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException({
        message: 'User with this email already exists',
        errors: { email: ['User with this email already exists'] },
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const defaultRole = await this.roleRepository.findOne({
      where: { name: RoleEnum.USER },
    });
    if (!defaultRole) {
      throw new InternalServerErrorException(
        'Default user role not found. Please seed the database.',
      );
    }

    const user = await this.userService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      provider: AuthProvider.LOCAL,
      roles: [defaultRole],
    });

    return this.issueTokens(user, meta);
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

  async verifyLoginOtp(
    dto: VerifyOtpDto,
    meta?: RequestDeviceMeta,
  ): Promise<AuthTokens> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.otpService.verifyOtp(user.id, dto.otp, OtpType.TWO_FACTOR);

    return this.issueTokens(user, meta);
  }

  // ── Refresh tokens (rotation — old session revoked, new one created) ───────

  async refreshTokens(
    userId: number,
    sessionIdx: string,
    rawRefreshToken: string,
    meta?: RequestDeviceMeta,
  ): Promise<AuthTokens> {
    const storedToken = await this.tokenService.validateRefreshToken(
      sessionIdx,
      rawRefreshToken,
    );
    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old session before issuing new one (token rotation)
    await this.tokenService.revokeSession(userId, sessionIdx);

    const user = await this.userService.findById(userId);
    // Carry forward the same device from the previous session
    return this.issueTokens(user, meta, storedToken.deviceId ?? undefined);
  }

  // ── Logout current device ─────────────────────────────────────────────────

  async logout(
    userId: number,
    sessionIdx: string,
    accessToken: string,
  ): Promise<void> {
    await this.tokenService.revokeSession(userId, sessionIdx);
    if (accessToken) {
      await this.blacklistToken(accessToken);
    }
  }

  // ── Logout all devices ────────────────────────────────────────────────────

  async logoutAllDevices(userId: number, accessToken: string): Promise<void> {
    await this.tokenService.revokeAllSessions(userId);
    if (accessToken) {
      await this.blacklistToken(accessToken);
    }
  }

  // ── Get active sessions ───────────────────────────────────────────────────

  async getActiveSessions(userId: number): Promise<SessionInfo[]> {
    return this.tokenService.getActiveSessions(userId);
  }

  // ── Revoke a specific session (by another device) ─────────────────────────

  async revokeSession(
    userId: number,
    sessionIdx: string,
  ): Promise<{ message: string }> {
    const revoked = await this.tokenService.revokeSession(userId, sessionIdx);
    if (!revoked) {
      throw new NotFoundException('Session not found');
    }
    return { message: 'Session revoked successfully' };
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

    // Revoke all sessions — user must re-login with new password
    await this.tokenService.revokeAllSessions(userId);
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

    await this.tokenService.revokeAllSessions(user.id);

    return { message: 'Password reset successfully. Please login.' };
  }

  // ── Google OAuth: generate tokens for OAuth user ──────────────────────────

  async googleLogin(user: User, meta?: RequestDeviceMeta): Promise<AuthTokens> {
    return this.issueTokens(user, meta);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Generate a new session: sign both JWTs with a shared `sid`, persist hashed refresh token.
   * Calls DeviceService.findOrCreateDevice to resolve the device for this session.
   * If `existingDeviceId` is provided (e.g. during token rotation), it reuses that device.
   */
  private async issueTokens(
    user: User,
    meta?: RequestDeviceMeta,
    existingDeviceId?: number,
  ): Promise<AuthTokens> {
    const sessionIdx = randomUUID();

    // Resolve device — reuse existing or find/create from meta
    let deviceId: number | null = existingDeviceId ?? null;
    if (!deviceId && meta) {
      const device = await this.deviceService.findOrCreateDevice(user.id, meta);
      deviceId = device.id;
    }

    const tokens = await this.generateTokens(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles.map((r) => r.name),
        sid: sessionIdx,
      },
      sessionIdx,
    );

    await this.persistRefreshToken(
      user.id,
      tokens.refreshToken,
      sessionIdx,
      deviceId,
    );

    return tokens;
  }

  private async generateTokens(
    payload: JwtPayload,
    sessionIdx: string,
  ): Promise<AuthTokens> {
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

    return { accessToken, refreshToken, sessionIdx };
  }

  private async persistRefreshToken(
    userId: number,
    rawToken: string,
    sessionIdx: string,
    deviceId: number | null,
  ): Promise<void> {
    const jwtConfig = this.configService.getOrThrow('jwt', { infer: true });
    const ttlMs = ms(jwtConfig.refreshExpiresIn as ms.StringValue);
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.tokenService.storeRefreshToken(
      userId,
      rawToken,
      expiresAt,
      sessionIdx,
      deviceId,
    );
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
