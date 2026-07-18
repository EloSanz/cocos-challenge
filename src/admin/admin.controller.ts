import {
  Controller,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('Admin')
@ApiHeader({
  name: 'x-api-key',
  description: 'Admin secret key',
  required: true,
})
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Delete('orders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete order by ID' })
  async deleteOrderById(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.adminService.deleteOrderById(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID' })
  async deleteUserById(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.adminService.deleteUserById(id);
  }

  @Delete('instruments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete instrument by ID' })
  async deleteInstrumentById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.adminService.deleteInstrumentById(id);
  }

  @Delete('marketdata/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete market data by ID' })
  async deleteMarketDataById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.adminService.deleteMarketDataById(id);
  }
}
