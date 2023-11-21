import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MessageWsService } from './message-ws.service';
import { Socket } from 'socket.io';
import { Server } from 'http';
import { NewMessageDto } from './dtos/new-message-dtos';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces';

@WebSocketGateway({ cors: true })
export class MessageWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  constructor(
    private readonly messageWsService: MessageWsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket, ...args: any[]) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token);
      await this.messageWsService.registerClient(client, payload.id);
    } catch (error) {
      client.disconnect();
      return;
    }

    console.log(token);
    console.log('Cliente conectado 1 ', client.id);

    console.log({
      conectados: this.messageWsService.getAmountConnectedClients(),
    });
    this.wss.emit(
      'clients-updated',
      this.messageWsService.getConnectedClients(),
    );
    // throw new Error('Method not implemented.');
  }

  handleDisconnect(client: Socket) {
    console.log('Cliente desconectado: ', client.id);
    this.messageWsService.removeClient(client.id);
    console.log({ conectados: this.messageWsService.getConnectedClients() });
    this.wss.emit(
      'clients-updated',
      this.messageWsService.getConnectedClients(),
    );
    // throw new Error('Method not implemented.');
  }

  @SubscribeMessage('message-from-client')
  handleMessageFromClient(client: Socket, payload: NewMessageDto) {
    console.log(client.id, payload);

    // // Emite unicamente al cliente
    // client.emit('message-from-server', {
    //   fullName: 'Soy YO!',
    //   message: payload.message || 'no-message!!',
    // });

    // // Emite a todos MENOS, al cliente inicial
    // client.broadcast.emit('message-from-server', {
    //   fullName: 'Soy YO!',
    //   message: payload.message || 'no-message!!',
    // });

    // // Emite a todos
    this.wss.emit('message-from-server', {
      fullName: this.messageWsService.getUserFullName(client.id),
      message: payload.message || 'no-message!!',
    });
  }
}
