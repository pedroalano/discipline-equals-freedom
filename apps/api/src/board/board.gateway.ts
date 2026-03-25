import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { CardResponse } from '@zenfocus/types';

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env['FRONTEND_URL'], credentials: true },
})
export class BoardGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket): void {
    const cookieHeader = client.handshake.headers.cookie ?? '';
    const cookies = parseCookies(cookieHeader);
    const token = cookies['access_token'];

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      this.jwt.verify(token);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('board:join')
  handleJoin(client: Socket, boardId: string): void {
    void client.join(`board:${boardId}`);
  }

  @SubscribeMessage('board:leave')
  handleLeave(client: Socket, boardId: string): void {
    void client.leave(`board:${boardId}`);
  }

  emitCardMoved(boardId: string, card: CardResponse): void {
    this.server.to(`board:${boardId}`).emit('card:moved', { card });
  }

  emitCardUpdated(boardId: string, card: CardResponse): void {
    this.server.to(`board:${boardId}`).emit('card:updated', { card });
  }

  emitCardCreated(boardId: string, card: CardResponse): void {
    this.server.to(`board:${boardId}`).emit('card:created', { card });
  }

  emitCardDeleted(boardId: string, cardId: string): void {
    this.server.to(`board:${boardId}`).emit('card:deleted', { cardId });
  }
}
