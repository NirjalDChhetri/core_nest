import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  VerifyOtpDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { BearerToken } from '@common/decorators/bearer-token.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { JwtRefreshGuard } from '@common/guards/jwt-refresh.guard';
import { GoogleAuthGuard } from '@common/guards/google-auth.guard';
import { CustomThrottle } from '@common/decorators/throttle.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Register ───────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @CustomThrottle(5, 60)
  @ResponseMessage('User registered successfully')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() dto: RegisterDto): Promise<AuthTokens> {
    return this.authService.register(dto);
  }

  // ── Login Step 1: Credentials → OTP email ─────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @CustomThrottle(10, 60)
  @ResponseMessage('OTP sent to your email for verification')
  @ApiOperation({
    summary: 'Login — validates credentials and sends OTP to email',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent to email for verification',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ message: string; requiresOtp: boolean }> {
    return this.authService.login(dto);
  }

  // ── Login Step 2: Verify OTP → Tokens ─────────────────────────────────────

  @Public()
  @Post('verify-login-otp')
  @HttpCode(HttpStatus.OK)
  @CustomThrottle(3, 60)
  @ResponseMessage('Login successful')
  @ApiOperation({
    summary: 'Verify login OTP and receive access + refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, tokens returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyLoginOtp(@Body() dto: VerifyOtpDto): Promise<AuthTokens> {
    return this.authService.verifyLoginOtp(dto);
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ResponseMessage('Tokens refreshed successfully')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @CurrentUser('id') userId: number,
    @CurrentUser('refreshToken') refreshToken: string,
  ): Promise<AuthTokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ResponseMessage('Logged out successfully')
  @ApiOperation({
    summary: 'Logout — revokes refresh tokens and blacklists access token',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser('id') userId: number,
    @BearerToken() accessToken: string,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, accessToken);
    return { message: 'Logged out successfully' };
  }

  // ── Change Password ───────────────────────────────────────────────────────

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ResponseMessage('Password changed successfully')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot change password for OAuth accounts',
  })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
    @BearerToken() accessToken: string,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(userId, dto, accessToken);
  }

  // ── Forgot Password ──────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @CustomThrottle(3, 60)
  @ResponseMessage('Password reset code sent to your email')
  @ApiOperation({ summary: 'Request password reset OTP via email' })
  @ApiResponse({
    status: 200,
    description: 'Reset code sent if account exists',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  // ── Reset Password ────────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @CustomThrottle(3, 60)
  @ResponseMessage('Password reset successfully')
  @ApiOperation({ summary: 'Reset password with OTP code' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or email' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google login' })
  googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ResponseMessage('Google login successful')
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiResponse({
    status: 200,
    description: 'Google login successful, tokens returned',
  })
  async googleCallback(@Req() req: Request): Promise<AuthTokens> {
    return this.authService.googleLogin(req.user as any);
  }
}
