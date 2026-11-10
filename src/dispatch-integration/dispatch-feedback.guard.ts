import { CanActivate,ConflictException,ExecutionContext,Injectable,ServiceUnavailableException,UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DispatchNonce } from './dispatch.schema';
import { verify } from './dispatch-protocol';
@Injectable()
export class DispatchFeedbackGuard implements CanActivate {
 constructor(private readonly config:ConfigService,@InjectModel(DispatchNonce.name) private readonly nonces:Model<DispatchNonce>){}
 async canActivate(context:ExecutionContext){if(this.config.get('DISPATCH_INTEGRATION_ENABLED')!=='true')throw new ServiceUnavailableException('Dispatch integration is disabled');const secret=this.config.get<string>('DISPATCH_FEEDBACK_SECRET')??'';if(secret.length<32)throw new ServiceUnavailableException('Dispatch feedback secret is not configured');const req=context.switchToHttp().getRequest();const nonce=req.headers['x-cmda-nonce'];if(!verify(secret,req.headers['x-cmda-timestamp'],nonce,req.headers['x-cmda-signature'],req.body))throw new UnauthorizedException('Invalid Dispatch integration signature');try{await this.nonces.create({_id:nonce,expiresAt:new Date(Date.now()+600000)});}catch(error){if((error as any).code===11000)throw new ConflictException('Integration request already received');throw error;}return true;}
}
