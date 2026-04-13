import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MailDto {
    @ApiPropertyOptional({
        description: '발신자 이메일 주소',
        example: 'no-reply@example.com',
    })
    @IsOptional()
    @IsEmail()
    from?: string;

    @ApiProperty({
        description: '수신자 이메일 주소',
        example: 'recipient@example.com',
    })
    @IsNotEmpty()
    @IsEmail()
    to: string;

    @ApiProperty({
        description: '메일 제목',
        example: '지원서 접수 확인',
    })
    @IsNotEmpty()
    @IsString()
    subject: string;

    @ApiProperty({
        description: '메일 본문 (HTML)',
        example: '<p>안녕하세요. 지원서가 성공적으로 접수되었습니다.</p>',
    })
    @IsNotEmpty()
    @IsString()
    html: string;
}

export class MultipleRecipientsMailDto {
    @ApiPropertyOptional({
        description: '발신자 이메일 주소',
        example: 'no-reply@example.com',
    })
    @IsOptional()
    @IsEmail()
    from?: string;

    @ApiProperty({
        description: '수신자 이메일 주소 목록',
        example: ['recipient1@example.com', 'recipient2@example.com'],
        type: [String],
    })
    @IsArray()
    @IsEmail({}, { each: true })
    recipients: string[];

    @ApiProperty({
        description: '메일 제목',
        example: '지원서 접수 확인',
    })
    @IsNotEmpty()
    @IsString()
    subject: string;

    @ApiProperty({
        description: '메일 본문 (HTML)',
        example: '<p>안녕하세요. 지원서가 성공적으로 접수되었습니다.</p>',
    })
    @IsNotEmpty()
    @IsString()
    html: string;
}

export class MailResponseDto {
    @ApiProperty({
        description: '메일 전송 성공 여부',
        example: true,
    })
    success: boolean;

    @ApiPropertyOptional({
        description: '메일 ID',
        example: '123456789',
    })
    messageId?: string;

    @ApiProperty({
        description: '결과 메시지',
        example: '이메일 전송 성공',
    })
    message: string;

    @ApiPropertyOptional({
        description: '에러 메시지',
        example: '이메일 주소가 올바르지 않습니다',
    })
    error?: string;
}

export class MultipleMailResponseDto extends MailResponseDto {
    @ApiPropertyOptional({
        description: '수신자 수',
        example: 3,
    })
    recipientCount?: number;

    @ApiPropertyOptional({
        description: '개별 전송 결과',
        type: [Object],
    })
    results?: unknown[];
}
