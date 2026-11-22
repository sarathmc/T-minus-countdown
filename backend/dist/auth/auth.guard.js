"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
let AuthGuard = class AuthGuard {
    config;
    jwks;
    constructor(config) {
        this.config = config;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token)
            throw new common_1.UnauthorizedException('Bearer access token required.');
        const url = this.config.get('SUPABASE_URL');
        if (!url)
            throw new common_1.ServiceUnavailableException('Authentication is not configured.');
        try {
            this.jwks ??= (0, jose_1.createRemoteJWKSet)(new URL(`${url.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`));
            const { payload } = await (0, jose_1.jwtVerify)(token, this.jwks, { issuer: `${url.replace(/\/$/, '')}/auth/v1`, audience: 'authenticated' });
            if (typeof payload['sub'] !== 'string' || !payload['sub'])
                throw new common_1.UnauthorizedException('Invalid token subject.');
            request.userId = payload['sub'];
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException || error instanceof common_1.ServiceUnavailableException)
                throw error;
            throw new common_1.UnauthorizedException('Access token is invalid or expired.');
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map