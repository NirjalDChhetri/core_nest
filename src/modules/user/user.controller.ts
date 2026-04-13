import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto, UserProfileResponse } from './dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RoleEnum } from '@common/enums';
import { PaginationQueryDto, PaginatedResponse } from '@common/dtos';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ResponseMessage('User profile retrieved successfully')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserProfileResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @CurrentUser('id') userId: number,
  ): Promise<UserProfileResponse> {
    const user = await this.userService.findById(userId);
    return UserProfileResponse.fromEntity(user);
  }

  @Patch('me')
  @ResponseMessage('Profile updated successfully')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserProfileResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfileResponse> {
    const user = await this.userService.updateProfile(userId, dto);
    return UserProfileResponse.fromEntity(user);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Account deleted successfully')
  @ApiOperation({ summary: 'Delete current user account (soft delete)' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@CurrentUser('id') userId: number): Promise<void> {
    await this.userService.deleteAccount(userId);
  }

  @Get()
  @Roles(RoleEnum.ADMIN)
  @ResponseMessage('Users retrieved successfully')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<UserProfileResponse>> {
    const [users, total] = await this.userService.findAllPaginated(
      query.skip,
      query.limit,
    );
    return PaginatedResponse.create(
      users.map(UserProfileResponse.fromEntity),
      total,
      query.page,
      query.limit,
    );
  }
}
