import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DomainEmployeeService } from '../../modules/domain/employee/employee.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly employeeService: DomainEmployeeService,
        configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('jwt.secret'),
        });
    }

    async validate(payload: any) {
        const employee = await this.employeeService.findOne({ where: { employeeNumber: payload.employeeNumber } });
        console.log(employee);
        if (!employee || employee.employeeNumber !== payload.employeeNumber) {
            throw new UnauthorizedException();
        }

        return employee;
    }
}
