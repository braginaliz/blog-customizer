# Проектная работа: Вёрстка проекта

## Шаг первый. Изучаем имеющиеся компоненты

[Макет проекта](https://www.figma.com/file/FEeiiGLOsE7ktXbPpBxYoD/Custom-dropdown?type=design&node-id=0%3A1&mode=design&t=eXRJnWC6Xsuw0qR4-1)

Для запуска Storybook выполните:

```
npm run storybook
```

Для запуска линтера для стилей выполните:

```
npm run stylelint
```

Для запуска линтера выполните:

```
npm run lint
```

Для запуска форматтера выполните:

```
npm run format
```

### Функциональные требования

- При нажатии на «стрелку» открывается сайдбар с настройками, при повторном нажатии или клике вне сайдбар закрывается.
- При изменении настроек в сайдбаре они не применяются сразу.
- После нажатия на «применить» стили применяются к статье.
- При нажатии «сбросить» настройки в форме сбрасываются на начальные, которые были при открытии страницы, и стили применяются к статье.
- Настройки устанавливаются через CSS-переменные, которые уже есть в стилях и установлены в коде в дефолтные значения.

## Шаг второй. Реализация формы

Продумайте следующие моменты, прежде чем приступать к коду: 

- как будет организована композиция,
- где вы будете хранить состояние,
- как передавать данные между формой и страницей.

Затем реализуйте механику открытия-закрытия панели с формой, после этого можно будет временно зафиксировать ее пропсом для удобства реализации.

После этого реализуйте форму из имеющихся компонент согласно макету.


## Шаг третий. Обеспечьте передачу данных между формой и страницей

Реализуйте по отдельности сохранение состояния страницы и состояние формы. Обеспечьте применение нового состояния после нажатия на «применить».



films.dto.ts

import { IsString, IsNumber, IsArray, IsOptional, IsDateString } from 'class-validator';

export class SessionDto {
    @IsString()
    id: string;
    @IsDateString()
    daytime: string;
    @IsNumber()
    hall: number;
    @IsNumber()
    rows: number;
    @IsNumber()
    seats: number;

    @IsNumber()
    price: number;
  
    @IsArray() 
    @IsString({ each: true })
    taken: string[]; 
  }
  
  export class ScheduleResponseDto {
    @IsNumber()
    total: number;
  
    @IsArray()
    items: SessionDto[];
  }

export class CreateFilmDto {
  @IsString()
  id: string;

  @IsNumber()
  rating: number;

  @IsString()
  director: string;

  @IsArray() 
  @IsString({ each: true })
  tags: string[];

  @IsString()
  title: string;

  @IsString()
  about: string;

  @IsString()
  @IsOptional() 
  image: string;

  @IsString()
  @IsOptional() 
  cover: string;

  @IsString()
  @IsOptional() 
  description: string;

}

export class FilmsResponseDto {
  @IsNumber()
  total: number;

  @IsArray()
  items: CreateFilmDto[];
}

films.controller.ts

import { Controller, Get, Param } from '@nestjs/common';
import { FilmsService } from './films.service';
import { FilmsResponseDto, ScheduleResponseDto } from './dto/films.dto';

@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  @Get()
  async fetchFilms(): Promise<FilmsResponseDto> {
    return this.filmsService.fetchFilms();
  }

  @Get(':id/schedule')
  async fetchFilmSchedule(
    @Param('id') id: string,
  ): Promise<ScheduleResponseDto> {
    return this.filmsService.fetchFilmSchedule(id);
  }
}


films.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { FilmsResponseDto, ScheduleResponseDto } from './dto/films.dto';
import { InterfaceFilmsRepository } from '../repository/films.repository';

@Injectable()
export class FilmsService {
  constructor(
    @Inject('InterfaceFilmsRepository')
    private readonly filmsRepository: InterfaceFilmsRepository,
  ) {}

  async fetchFilms(): Promise<FilmsResponseDto> {
    return this.filmsRepository.getAllFilms();
  }

  async fetchFilmSchedule(id: string): Promise<ScheduleResponseDto> {
    return this.filmsRepository.getSessionsByFilmId(id);
  }
}


order.dto.ts

import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class TicketOrderDto {
  @IsString()
  film: string;

  @IsString()
  session: string;

  @IsNumber()
  row: number;

  @IsNumber()
  seat: number;

  @IsOptional()
  @IsString()
  daytime?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class TicketItemDto {
  @IsString()
  film: string;

  @IsString()
  session: string;

  @IsString()
  daytime: string;

  @IsNumber()
  row: number;

  @IsNumber()
  seat: number;

  @IsNumber()
  price: number;

  @IsString()
  id: string;
}

export class TicketOrderResponseDto {
  @IsNumber()
  total: number;

  @IsArray()
  items: TicketItemDto[];

  @IsOptional()
  @IsString()
  error?: string;
}

export class ErrorDto {
  @IsNumber()
  total: number;

  @IsArray()
  items: never[];

  @IsString()
  error: string;
}


order.service.ts

import { Injectable } from '@nestjs/common';
import {
  TicketOrderDto,
  TicketOrderResponseDto,
  TicketItemDto,
  ErrorDto,
} from './dto/order.dto';
import { InterfaceFilmsRepository } from '../repository/films.repository';

@Injectable()
export class OrderService {
  constructor(private readonly filmsRepository: InterfaceFilmsRepository) {}

  async createOrder(
    orders: TicketOrderDto[],
  ): Promise<TicketOrderResponseDto | ErrorDto> {
    if (!this.isValidOrderList(orders)) {
      return this.createErrorResponse('Список заказов не может быть пустым');
    }

    const items: TicketItemDto[] = [];
    const processedSeats = new Set<string>();

    for (const order of orders) {
      const sanitizedOrder = this.sanitizeOrderDto(order);
      const result = await this.handleOrderItem(sanitizedOrder, processedSeats);

      if ('error' in result) {
        return this.createErrorResponse(result.error);
      }

      items.push(result);
      processedSeats.add(
        `${sanitizedOrder.session}:${result.row}:${result.seat}`,
      );
    }

    return this.createSuccessResponse(items);
  }

  private isValidOrderList(orders: TicketOrderDto[]): boolean {
    return Array.isArray(orders) && orders.length > 0;
  }

  private createErrorResponse(message: string): ErrorDto {
    return {
      total: 0,
      items: [],
      error: message,
    };
  }

  private createSuccessResponse(
    items: TicketItemDto[],
  ): TicketOrderResponseDto {
    return {
      total: items.length,
      items: items,
    };
  }

  private sanitizeOrderDto(orderDto: unknown): TicketOrderDto {
    if (!orderDto || typeof orderDto !== 'object') {
      return this.getDefaultOrderDto();
    }

    const dto = orderDto as Record<string, unknown>;
    return {
      film: typeof dto.film === 'string' ? dto.film : '',
      session: typeof dto.session === 'string' ? dto.session : '',
      row: typeof dto.row === 'number' ? dto.row : 0,
      seat: typeof dto.seat === 'number' ? dto.seat : 0,
    };
  }

  private getDefaultOrderDto(): TicketOrderDto {
    return {
      film: '',
      session: '',
      row: 0,
      seat: 0,
    };
  }

  private async handleOrderItem(
    orderDto: TicketOrderDto,
    processedSeats: Set<string>,
  ): Promise<TicketItemDto | { error: string }> {
    if (!this.isOrderDataValid(orderDto)) {
      return { error: 'Недостаточно данных для создания заказа' };
    }

    const row = Number(orderDto.row);
    const seat = Number(orderDto.seat);

    if (!this.isRowAndSeatValid(row, seat)) {
      return {
        error: 'Номер ряда и места должны быть положительными целыми числами',
      };
    }

    const requestSeatKey = `${orderDto.session}:${row}:${seat}`;
    if (processedSeats.has(requestSeatKey)) {
      return {
        error: `Место ${row}:${seat} уже обрабатывается в этом запросе`,
      };
    }

    const session = await this.filmsRepository.getSessionById(orderDto.session);
    if (!session) {
      return { error: 'Сеанс не найден' };
    }

    if (row > session.rows || seat > session.seats) {
      return {
        error: `Место ${row}:${seat} не существует. Зал имеет ${session.rows} рядов и ${session.seats} мест в ряду`,
      };
    }

    if (session.taken.includes(`${row}:${seat}`)) {
      return { error: `Место ${row}:${seat} уже занято` };
    }

    const updatedTaken = [...session.taken, `${row}:${seat}`];
    const success = await this.filmsRepository.markSessionAsTaken(
      orderDto.session,
      updatedTaken,
    );
    if (!success) {
      return { error: 'Ошибка при бронировании места' };
    }

    return this.createOrderItem(orderDto, session, row, seat);
  }

  private isOrderDataValid(orderDto: TicketOrderDto): boolean {
    return Boolean(
      orderDto.film && orderDto.session && orderDto.row && orderDto.seat,
    );
  }

  private isRowAndSeatValid(row: number, seat: number): boolean {
    return (
      Number.isInteger(row) && Number.isInteger(seat) && row > 0 && seat > 0
    );
  }

  private createOrderItem(
    orderDto: TicketOrderDto,
    session: any,
    row: number,
    seat: number,
  ): TicketItemDto {
    return {
      film: orderDto.film,
      session: orderDto.session,
      daytime: session.daytime,
      row: row,
      seat: seat,
      price: session.price,
      id: this.generateUniqueOrderId(),
    };
  }

  private generateUniqueOrderId(): string {
    return `order-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}


orders.controller.ts



import { Controller, Post, Body } from '@nestjs/common';
import { OrderService } from './order.service';
import {
  TicketOrderDto,
  TicketOrderResponseDto,
  ErrorDto,
} from './dto/order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @Body() orders: TicketOrderDto[],
  ): Promise<TicketOrderResponseDto | ErrorDto> {
    if (!orders || !Array.isArray(orders)) {
      return this.handleValidationError(
        !orders
          ? 'Тело запроса не может быть пустым'
          : 'Ожидается массив заказов',
      );
    }

    return this.orderService.createOrder(orders);
  }

  private handleValidationError(message: string): ErrorDto {
    return {
      total: 0,
      items: [],
      error: message,
    };
  }
}


films.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Film } from './films.schema';
import { CreateFilmDto, SessionDto } from '../films/dto/films.dto';

export interface InterfaceFilmsRepository {
  getAllFilms(): Promise<{ total: number; items: CreateFilmDto[] }>;
  getSessionsByFilmId(
    filmId: string,
  ): Promise<{ total: number; items: SessionDto[] }>;
  getSessionById(sessionId: string): Promise<SessionDto | null>;
  markSessionAsTaken(sessionId: string, taken: string[]): Promise<boolean>;
}

@Injectable()
export class FilmsRepository implements InterfaceFilmsRepository {
  constructor(
    @InjectModel(Film.name) private readonly filmModel: Model<Film>,
  ) {}

  async getAllFilms(): Promise<{ total: number; items: CreateFilmDto[] }> {
    const films = await this.filmModel.find().exec();
    const filmsDto = films.map(this.mapFilmToDto);

    return {
      total: films.length,
      items: filmsDto,
    };
  }

  async getSessionsByFilmId(
    filmId: string,
  ): Promise<{ total: number; items: SessionDto[] }> {
    const film = await this.filmModel.findOne({ id: filmId }).exec();

    if (!film) {
      return { total: 0, items: [] };
    }

    const sessionsDto = film.schedule.map(this.mapSessionToDto);
    return {
      total: sessionsDto.length,
      items: sessionsDto,
    };
  }

  async getSessionById(sessionId: string): Promise<SessionDto | null> {
    const film = await this.filmModel
      .findOne({ 'schedule.id': sessionId })
      .exec();

    if (!film) {
      return null;
    }

    const session = film.schedule.find((s) => s.id === sessionId);
    return session ? this.mapSessionToDto(session) : null;
  }

  async markSessionAsTaken(
    sessionId: string,
    takenSeats: string[],
  ): Promise<boolean> {
    const result = await this.filmModel
      .updateOne(
        { 'schedule.id': sessionId },
        { $set: { 'schedule.$.taken': takenSeats } },
      )
      .exec();

    return result.modifiedCount > 0;
  }

  private mapFilmToDto(film: Film): CreateFilmDto {
    const {
      id,
      rating,
      director,
      tags,
      title,
      about,
      description,
      image,
      cover,
    } = film;

    return {
      id,
      rating,
      director,
      tags,
      title,
      about,
      description,
      image,
      cover,
    };
  }

  private mapSessionToDto(session: {
    id: string;
    daytime: string;
    hall: number;
    rows: number;
    seats: number;
    price: number;
    taken: string[];
  }): SessionDto {
    return {
      id: session.id,
      daytime: session.daytime,
      hall: Number(session.hall),
      rows: session.rows,
      seats: session.seats,
      price: session.price,
      taken: session.taken,
    };
  }
}

films.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Schedule {
  @Prop({ required: true })
  id: string;
  @Prop({ required: true })
  daytime: string;

  @Prop({ required: true })
  hall: number;

  @Prop({ required: true })
  rows: number;

  @Prop({ required: true })
  seats: number;

  @Prop({ required: true })
  price: number;

  @Prop({ type: [String], default: [] })
  taken: string[];
}

@Schema()
export class Film {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  rating: number;

  @Prop()
  director: string;

  @Prop({ type: [String] })
  tags: string[];

  @Prop()
  image: string;

  @Prop()
  cover: string;

  @Prop()
  about: string;

  @Prop()
  description: string;

  @Prop({ type: [Schedule], default: [] })
  schedule: Schedule[];
}

export const FilmSchema = SchemaFactory.createForClass(Film);
export const ScheduleSchema = SchemaFactory.createForClass(Schedule);


app.config.provider.ts

import { ConfigModule, ConfigService } from '@nestjs/config';

export const configProvider = {
  imports: [ConfigModule.forRoot()],
  provide: 'CONFIG',
  useFactory: (configService: ConfigService): AppConfig => ({
    database: {
      driver: configService.get<string>('DATABASE_DRIVER', 'mongodb'),
      url: configService.get<string>(
        'DATABASE_URL',
        'mongodb://localhost:27017/prac',
      ),
    },
  }),
  inject: [ConfigService],
};

export interface AppConfig {
  database: AppConfigDatabase;
}

export interface AppConfigDatabase {
  driver: string;
  url: string;
}


app.module.ts


import { Module, DynamicModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

import { configProvider } from './app.config.provider';
import { FilmsController } from './films/films.controller';
import { OrderController } from './order/orders.controller';
import { FilmsService } from './films/films.service';
import { OrderService } from './order/order.service';
import { FilmsRepository } from './repository/films.repository';

dotenv.config();

@Module({})
export class AppModule {
  static forRoot(): DynamicModule {

    const baseImports = [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
      }),
      ServeStaticModule.forRoot({
        rootPath: path.join(__dirname, '..', 'public', 'content'),
        serveRoot: '/content',
      }),
    ];

    return {
      module: AppModule,
      imports: baseImports,
      controllers: [FilmsController, OrderController],
      providers: [
        configProvider,
        FilmsService,
        OrderService,
        {
          provide: 'InterfaceFilmsRepository',
          useClass: FilmsRepository,
        },
      ],
    };
  }
}


main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/afisha');
  app.enableCors();
  await app.listen(3000);
}
bootstrap();

