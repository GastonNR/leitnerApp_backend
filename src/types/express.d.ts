import { JwtPayload } from 'jsonwebtoken'

declare global {
    namespace Express {
        interface Request{
            usuario?: JwtPayload
        }
    }
}

export {}