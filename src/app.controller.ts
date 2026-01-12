import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
    constructor() {}

    /**
     * Health Check 엔드포인트
     */

    @ApiOperation({
        summary: 'Health Check',
        description: 'Server health check',
    })
    @ApiResponse({
        status: 200,
        description: 'Server is alive',
    })
    @Get('health')
    healthCheck(): { status: string; timestamp: string; message: string } {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'Server is alive',
        };
    }
}
