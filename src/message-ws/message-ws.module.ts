import { Module } from '@nestjs/common';
import { MessageWsService } from './message-ws.service';
import { MessageWsGateway } from './message-ws.gateway';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [MessageWsGateway, MessageWsService],
})
export class MessageWsModule {}
