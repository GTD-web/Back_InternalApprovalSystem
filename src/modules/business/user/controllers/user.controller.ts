import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { User } from '../../../../common/decorators/user.decorator';
import { Employee } from '../../../domain/employee/employee.entity';
import { UserService } from '../services/user.service';
import { QueryMyPendingByMonthDto } from '../dtos/query-my-pending-by-month.dto';
import { PaginatedPendingApprovalsResponseDto } from '../../approval-process/dtos/approval-process-response.dto';

@ApiTags('사용자')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    /**
     * 연월별 내 결재 차례 문서 목록 조회
     */
    @Get('my-pending-by-month')
    @ApiOperation({
        summary: '연월별 내 결재 차례 문서 목록',
        description:
            '지정한 연·월에 상신된 문서 중, 현재 내가 결재해야 하는 차례가 돌아온 문서 목록을 조회합니다.\n\n' +
            '**쿼리:** year(연도 4자리), month(1~12)\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 해당 월에 내 결재 차례 문서 목록 조회\n' +
            '- ✅ 정상: 해당 월에 없으면 빈 목록',
    })
    @ApiQuery({ name: 'year', description: '연도 (4자리)', example: 2025 })
    @ApiQuery({ name: 'month', description: '월 (1~12)', example: 1 })
    @ApiResponse({
        status: 200,
        description: '조회 성공',
        type: PaginatedPendingApprovalsResponseDto,
    })
    async getMyPendingByYearMonth(@User() user: Employee, @Query() query: QueryMyPendingByMonthDto) {
        return await this.userService.getMyPendingByYearMonth(user.id, query.year, query.month);
    }
}
