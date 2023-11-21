import { Test, TestingModule } from '@nestjs/testing';
import { MessageWsService } from './message-ws.service';

describe('MessageWsService', () => {
  let service: MessageWsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageWsService],
    }).compile();

    service = module.get<MessageWsService>(MessageWsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
