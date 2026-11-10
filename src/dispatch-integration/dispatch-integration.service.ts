import { BadRequestException,ConflictException,Injectable,Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model,Types } from 'mongoose';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { User } from '../users/schema/users.schema';
import { UserSettings } from '../users/schema/user-settings.schema';
import { DispatchConnectorState,DispatchFeedback,DispatchMemberSync } from './dispatch.schema';
import { DispatchFeedbackDto } from './dispatch.dto';
import { headers,hashBody } from './dispatch-protocol';
import { snapshot } from './dispatch-snapshot';
const memberRoles=['Student','Doctor','GlobalNetwork'];
@Injectable()
export class DispatchIntegrationService {
 private readonly log=new Logger(DispatchIntegrationService.name);
 private readonly holder=randomUUID();private busy=false;
 constructor(private readonly config:ConfigService,@InjectModel(User.name) private readonly members:Model<User>,@InjectModel(UserSettings.name) private readonly settings:Model<UserSettings>,@InjectModel(DispatchMemberSync.name) private readonly syncs:Model<DispatchMemberSync>,@InjectModel(DispatchConnectorState.name) private readonly states:Model<DispatchConnectorState>,@InjectModel(DispatchFeedback.name) private readonly feedback:Model<DispatchFeedback>){}
 private enabled(){return this.config.get('DISPATCH_INTEGRATION_ENABLED')==='true';}
 private endpoint(){const value=this.config.get<string>('DISPATCH_API_URL')??'';if(!value)throw new Error('DISPATCH_API_URL is missing');const url=new URL(value);if(url.username||url.password||!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||(this.config.get('NODE_ENV')==='production'&&url.protocol!=='https:'))throw new Error('Set DISPATCH_API_URL to an HTTPS origin in production');return url.origin+'/api/integrations/cmda/members';}
 private secret(){const secret=this.config.get<string>('DISPATCH_SYNC_SECRET')??'';if(secret.length<32||secret===this.config.get('DISPATCH_FEEDBACK_SECRET'))throw new Error('Use distinct 32+ character Dispatch sync and feedback secrets');return secret;}
 @Cron('*/10 * * * * *')
 async tick(){if(!this.enabled()||process.env.PROCESS_ROLE!=='worker'||this.busy)return;this.busy=true;try{this.endpoint();this.secret();await this.collect();await this.deliver();}catch(error){const message=error instanceof Error?error.message:'Dispatch integration failed';this.log.warn(message);await this.states.updateOne({_id:'collector'},{$set:{lastError:message}},{upsert:true}).catch(()=>{});}finally{this.busy=false;}}
 private async stateUpdate(update:Record<string,unknown>){await this.states.updateOne({_id:'collector',holder:this.holder},{$set:update});}
 private async collect(){
  const now=new Date();let state:any;
  try{state=await this.states.findOneAndUpdate({_id:'collector',$or:[{leaseUntil:{$lt:now}},{leaseUntil:{$exists:false}},{holder:this.holder}]},{$set:{holder:this.holder,leaseUntil:new Date(Date.now()+60000)},$setOnInsert:{cursorAt:new Date(0),cursorId:'',fullRunning:false,fullCursor:''}},{upsert:true,new:true}).lean();}catch(error){if((error as any).code===11000)return;throw error;}if(!state)return;
  try{
   const cutoff=new Date(Date.now()-2000),cursorAt=state.cursorAt??new Date(0);
   const changed:any[]=await this.members.find({role:{$in:memberRoles},updatedAt:{$lte:cutoff},$or:[{updatedAt:{$gt:cursorAt}},...(state.cursorId?[{updatedAt:cursorAt,_id:{$gt:new Types.ObjectId(state.cursorId)}}]:[])]}).sort({updatedAt:1,_id:1}).limit(100).select(this.projection()).lean();
   await this.collectRows(changed);
   if(changed.length){const last=changed[changed.length-1];await this.stateUpdate({cursorAt:last.updatedAt,cursorId:String(last._id)});}
   else await this.stateUpdate({cursorAt:cutoff,cursorId:''});
   const requested=state.rescanToken&&state.rescanToken!==state.activeRescanToken;
   if(requested||(!state.fullRunning&&!state.pruneRunning&&(!state.lastFullAt||new Date(state.lastFullAt).getTime()<Date.now()-6*3600000))){state.fullRunning=true;state.pruneRunning=false;state.fullCursor='';state.activeRescanToken=state.rescanToken??'';await this.stateUpdate({fullRunning:true,pruneRunning:false,fullCursor:'',activeRescanToken:state.activeRescanToken});}
   if(state.fullRunning){
    const page:any[]=await this.members.find({role:{$in:memberRoles},...(state.fullCursor?{_id:{$gt:new Types.ObjectId(state.fullCursor)}}:{})}).sort({_id:1}).limit(100).select(this.projection()).lean();await this.collectRows(page);
    if(page.length===100)await this.stateUpdate({fullCursor:String(page[page.length-1]._id)});
    else await this.stateUpdate({fullRunning:false,fullCursor:'',pruneRunning:true,pruneCursor:''});
   }else if(state.pruneRunning){
    const page:any[]=await this.syncs.find(state.pruneCursor?{_id:{$gt:state.pruneCursor}}:{}).sort({_id:1}).limit(100).lean();
    const found:any[]=await this.members.find({_id:{$in:page.map(r=>new Types.ObjectId(r._id))},role:{$in:memberRoles}}).select('_id').lean();const present=new Set(found.map(r=>String(r._id)));
    for(const row of page)if(!present.has(row._id)&&row.snapshot&&!row.snapshot.deleted)await this.queueSnapshot(row._id,{...row.snapshot,deleted:true,active:false,marketingConsent:false,sourceUpdatedAt:new Date().toISOString()});
    if(page.length===100)await this.stateUpdate({pruneCursor:page[page.length-1]._id});else await this.stateUpdate({pruneRunning:false,pruneCursor:'',lastFullAt:new Date()});
   }
   await this.stateUpdate({lastCollectionAt:new Date(),lastError:null});
  }finally{await this.states.updateOne({_id:'collector',holder:this.holder},{$set:{leaseUntil:new Date(0)}});}
 }
 private projection(){return '_id email firstName middleName lastName fullName membershipId role region memberCategory isGlobal subscribed subscriptionExpiry hasLifetimeMembership lifetimeMembershipExpiry emailVerified isActive isBanned notificationPreferences dispatchConsentChangedAt dispatchConsentFeedbackSequence updatedAt createdAt';}
 private async collectRows(rows:any[]){if(!rows.length)return;const settings:any[]=await this.settings.find({user:{$in:rows.map(r=>r._id)}}).lean();const byId=new Map(settings.map(s=>[String(s.user),s]));for(const row of rows){await this.queueSnapshot(String(row._id),snapshot(row,byId.get(String(row._id))));}await this.stateUpdate({leaseUntil:new Date(Date.now()+60000)});}
 private async queueSnapshot(id:string,body:Record<string,any>){
  const old:any=await this.syncs.findById(id).lean();
  // A collector whose lease expired must not replace a newer source snapshot.
  if(old?.snapshot?.sourceUpdatedAt&&!old.snapshot.deleted&&new Date(body.sourceUpdatedAt).getTime()<new Date(old.snapshot.sourceUpdatedAt).getTime())return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email??'')){
   if(old?.snapshot?.email)body={...old.snapshot,active:false,marketingConsent:false,sourceUpdatedAt:body.sourceUpdatedAt};
   else{await this.syncs.updateOne({_id:id},{$set:{status:'failed',lastError:'Member email is missing or invalid'},$setOnInsert:{revision:0,fingerprint:''}},{upsert:true});return;}
  }
  const fingerprint=hashBody(body);const heartbeat=old?.status==='delivered'&&old.deliveredAt&&new Date(old.deliveredAt).getTime()<Date.now()-6*3600000;
  if(old?.fingerprint===fingerprint&&!heartbeat)return;
  const update={$set:{snapshot:body,fingerprint,eventId:randomUUID(),status:'pending',attempts:0,nextAttemptAt:new Date()},$unset:{claimToken:1,claimedAt:1,lastError:1},$inc:{revision:1}};
  try{await this.syncs.updateOne(old?{_id:id,revision:old.revision}:{_id:id},update,{upsert:!old,setDefaultsOnInsert:false});}catch(error){if((error as any).code!==11000)throw error;}
 }
 private async deliver(){
  for(let batch=0;batch<4;batch++){
   const claims:any[]=[];
   for(let i=0;i<5;i++){const row:any=await this.syncs.findOneAndUpdate({$or:[{status:'pending',nextAttemptAt:{$lte:new Date()}},{status:'processing',claimedAt:{$lt:new Date(Date.now()-120000)}}]},{$set:{status:'processing',claimedAt:new Date(),claimToken:randomUUID()}},{new:true,sort:{nextAttemptAt:1}}).lean();if(row)claims.push(row);}
   if(!claims.length)return;
   await Promise.all(claims.map(row=>this.send(row)));
  }
 }
 private async send(row:any){
  const body={...row.snapshot,eventId:row.eventId,revision:row.revision};
  try{const response=await axios.post(this.endpoint(),JSON.stringify(body),{headers:headers(this.secret(),body),timeout:15000,maxRedirects:0,validateStatus:()=>true});if(response.status<200||response.status>=300||response.data?.accepted!==true)throw new Error(`Dispatch member sync HTTP ${response.status}${typeof response.data?.message==='string'?': '+response.data.message.replace(/[\r\n]/g,' ').slice(0,300):''}`);
   await this.syncs.updateOne({_id:row._id,revision:row.revision,claimToken:row.claimToken},{$set:{status:'delivered',deliveredAt:new Date(),dispatchContactId:response.data.contactId??row.dispatchContactId??''},$unset:{lastError:1,claimedAt:1,claimToken:1}});
   await this.states.updateOne({_id:'collector'},{$set:{lastDeliveryAt:new Date()}},{upsert:true});
  }catch(error){const attempts=row.attempts+1;const message=axios.isAxiosError(error)?`Dispatch request failed (${error.code??'network'})`:error instanceof Error?error.message:'Dispatch member sync failed';await this.syncs.updateOne({_id:row._id,revision:row.revision,claimToken:row.claimToken},{$set:{status:attempts>=10?'failed':'pending',attempts,nextAttemptAt:new Date(Date.now()+Math.min(3600000,2**attempts*5000)),lastError:message},$unset:{claimedAt:1,claimToken:1}});}
 }
 async receiveFeedback(input:DispatchFeedbackDto){
  const hash=hashBody(input);let record:any;
  try{record=await this.feedback.findOneAndUpdate({_id:input.eventId},{$setOnInsert:{memberId:input.memberId,sequence:input.sequence,email:input.email,type:input.type,occurredAt:new Date(input.occurredAt),sourceRevision:input.sourceRevision,messageId:input.messageId,providerMessageId:input.providerMessageId,payloadHash:hash,status:'received'}},{upsert:true,new:true}).lean();}catch(error){if((error as any).code!==11000)throw error;record=await this.feedback.findById(input.eventId).lean();}
  if(record.payloadHash!==hash)throw new ConflictException('Feedback ID was reused with different content');
  if(record.status!=='received')return {accepted:true,eventId:input.eventId,duplicate:true};
  let member:any=await this.members.findById(input.memberId).select('_id email notificationPreferences dispatchLastFeedbackSequence dispatchConsentFeedbackSequence').lean();
  if(!member){await this.feedback.updateOne({_id:input.eventId},{$set:{status:'missing_member',appliedAt:new Date()}});return {accepted:true,eventId:input.eventId};}
  const consent=input.type==='marketing.unsubscribed'||input.type==='marketing.resubscribed';
  if(consent){
   const allowed=input.type==='marketing.resubscribed';
   if(allowed&&String(member.email).toLowerCase()!==input.email.toLowerCase()){await this.feedback.updateOne({_id:input.eventId},{$set:{status:'email_changed',appliedAt:new Date()}});return {accepted:true,eventId:input.eventId};}
   await this.members.updateOne({_id:input.memberId,$or:[{dispatchLastFeedbackSequence:{$lt:input.sequence}},{dispatchLastFeedbackSequence:{$exists:false}}]},{$set:{'notificationPreferences.marketing':allowed,dispatchLastFeedbackSequence:input.sequence,...(allowed?{dispatchConsentChangedAt:new Date(input.occurredAt),dispatchConsentFeedbackSequence:input.sequence}:{})}});
   member=await this.members.findById(input.memberId).select('notificationPreferences dispatchLastFeedbackSequence').lean();
   // Do not replay a stale preference over a later CMDA choice or newer feedback.
   if(member&&Number(member.dispatchLastFeedbackSequence)===input.sequence&&member.notificationPreferences?.marketing===allowed)await this.settings.findOneAndUpdate({user:input.memberId},{$set:{marketing:allowed},$setOnInsert:{user:input.memberId}},{upsert:true,new:true});
  }
  await this.feedback.updateOne({_id:input.eventId},{$set:{status:'applied',appliedAt:new Date()}});
  await this.states.updateOne({_id:'collector'},{$set:{lastFeedbackAt:new Date()}},{upsert:true});
  return {accepted:true,eventId:input.eventId};
 }
 async requestRescan(){await this.states.updateOne({_id:'collector'},{$set:{rescanToken:randomUUID()}},{upsert:true});return {accepted:true,message:'A full reconciliation is queued for the Dispatch integration worker'};}
 async retry(id:string){if(!Types.ObjectId.isValid(id))throw new BadRequestException('Invalid member ID');const row=await this.syncs.findOneAndUpdate({_id:id,status:'failed',snapshot:{$exists:true,$ne:null},eventId:{$exists:true}},{$set:{status:'pending',attempts:0,nextAttemptAt:new Date()},$unset:{lastError:1}},{new:true});if(!row?.snapshot)throw new BadRequestException('Member has no retryable snapshot. Correct its email and request a rescan.');return {success:true,message:'Sync retry queued'};}
 async status(){const [state,counts,failed]=await Promise.all([this.states.findById('collector').lean(),this.syncs.aggregate([{$group:{_id:'$status',total:{$sum:1}}}]),this.syncs.find({status:'failed'}).select('_id revision attempts lastError updatedAt').sort({updatedAt:-1}).limit(30).lean()]);return {success:true,data:{enabled:this.enabled(),configured:!!this.config.get('DISPATCH_API_URL')&&(this.config.get<string>('DISPATCH_SYNC_SECRET')??'').length>=32&&(this.config.get<string>('DISPATCH_FEEDBACK_SECRET')??'').length>=32,workerRequired:true,state,counts,failed}};}
 async feedbackList(memberId?:string,pageValue?:string){if(memberId&&!Types.ObjectId.isValid(memberId))throw new BadRequestException('Invalid member ID');const page=Number(pageValue??1);if(!Number.isInteger(page)||page<1||page>100000)throw new BadRequestException('Invalid page');const filter=memberId?{memberId}:{};const [items,total]=await Promise.all([this.feedback.find(filter).select('-payloadHash').sort({occurredAt:-1}).skip((page-1)*50).limit(50).lean(),this.feedback.countDocuments(filter)]);return {success:true,data:{items,total,page,pageSize:50}};}
}
