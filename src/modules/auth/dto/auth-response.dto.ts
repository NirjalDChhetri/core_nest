import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthTokensResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Session UUID — use for targeted logout',
  })
  sessionIdx!: string;
}

export class LoginOtpResponse {
  @ApiProperty({ example: 'OTP sent to your email for verification' })
  message!: string;

  @ApiProperty({ example: true })
  requiresOtp!: boolean;
}

export class MessageResponse {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}

export class SessionInfoResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sessionIdx!: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'FK to user_devices.id — resolve device name/type via /auth/devices',
  })
  deviceId!: number | null;

  @ApiPropertyOptional({ example: '2026-05-07T10:30:00.000Z' })
  lastUsedAt!: Date | null;

  @ApiProperty({ example: '2026-05-01T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({
    example: true,
    description: 'Whether this is the current session',
  })
  isCurrent!: boolean;
}
