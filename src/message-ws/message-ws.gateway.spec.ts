import { Test, TestingModule } from '@nestjs/testing';
import { MessageWsGateway } from './message-ws.gateway';
import { MessageWsService } from './message-ws.service';

describe('MessageWsGateway', () => {
  let gateway: MessageWsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageWsGateway, MessageWsService],
    }).compile();

    gateway = module.get<MessageWsGateway>(MessageWsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
