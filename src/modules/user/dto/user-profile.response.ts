import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from '@common/enums';
import { AuthProvider, User } from '@entities/user.entity';

export class UserProfileResponse {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  idx!: string;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ enum: RoleEnum, example: RoleEnum.USER })
  role!: RoleEnum;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: Date;

  static fromEntity(user: User): UserProfileResponse {
    const response = new UserProfileResponse();
    response.id = user.id;
    response.idx = user.idx!;
    response.firstName = user.firstName;
    response.lastName = user.lastName;
    response.email = user.email;
    response.role = user.role;
    response.provider = user.provider;
    response.isActive = user.isActive!;
    response.createdAt = user.createdAt!;
    return response;
  }
}
