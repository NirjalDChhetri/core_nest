import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('test')
  @ApiOperation({
    summary: 'Test endpoint — used by Docker and load balancers',
  })
  @ApiResponse({ status: 200, description: 'Test endpoint' })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
