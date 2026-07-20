# Arquitectura del Proyecto (Clean Architecture / Ports & Adapters)

Este repositorio está construido siguiendo los principios de **Clean Architecture** y **SOLID**, utilizando intensamente la Inyección de Dependencias (DI) de NestJS mediante *Custom Providers*. 

El objetivo principal de esta arquitectura es **desacoplar la lógica de negocio (Casos de Uso) de los detalles de infraestructura (HTTP, Base de Datos, Frameworks)**.

---

## 🏗️ Flujo End-to-End (De la Petición a la Base de Datos)

Cuando una petición HTTP ingresa al sistema, sigue este ciclo de vida unidireccional:

1. **Controller**: Recibe la petición HTTP, valida el payload usando **DTOs** y delega la ejecución al Caso de Uso correspondiente.
2. **Mapper (Input)**: Transforma el DTO (Capa HTTP) en un `Command` (Objeto plano de la capa de dominio).
3. **Use Case (Lógica de Negocio)**: Ejecuta las reglas de negocio (ej. validaciones de saldo, cálculos de mercado). Para interactuar con los datos, llama a la interfaz del Repositorio.
4. **Repository (Implementación)**: Ejecuta la consulta SQL/TypeORM en la base de datos, mapea la `Entity` de TypeORM a un modelo de dominio y lo devuelve.
5. **Mapper (Output)**: El controller recibe el resultado del Caso de Uso y lo transforma en un `ResponseDto` para enviarlo al cliente.

---

## 📂 Estructura de un Módulo (Ej. `Orders`)

Cada módulo o "Feature" se agrupa en su propia carpeta y se divide en subcapas estrictas:

```text
src/orders/
├── dto/                             # Data Transfer Objects (Validación HTTP con class-validator)
├── interfaces/                      # (PORTS) Interfaces de UseCases y Repositorios + Tokens de inyección
├── impl/                            # (ADAPTERS) Implementaciones de los Ports
│   ├── usecases/                    # Lógica de negocio core (Ej. create-order.usecase.ts)
│   ├── orders-repository.impl.ts    # Capa de datos (TypeORM QueryBuilders)
│   └── orders-entity.mapper.ts      # Mapeo de Entities DB a Modelos de Dominio
├── orders.controller.ts             # REST API Controller
├── orders.mapper.ts                 # Transforma DTOs <-> Commands/Results
└── orders.module.ts                 # Ensamblaje de dependencias (IoC)
```

---

## 🛠️ Guía Paso a Paso: Cómo implementar una nueva Feature

Si necesitás agregar un nuevo endpoint (por ejemplo, *Cancelar una Orden*), debes hacerlo de adentro hacia afuera siguiendo estos 5 pasos:

### 1. Definir los DTOs y Commands
Creá el DTO de entrada en `dto/` si recibís un body. Luego definí el Command de dominio y el tipo de retorno en `interfaces/`.
```typescript
// interfaces/cancel-order.command.ts
export interface CancelOrderCommand {
  orderId: number;
}
```

### 2. Definir la Interfaz del UseCase (Port)
Creá la interfaz y su **Injection Token** (un `Symbol` que NestJS usará para inyectarlo).
```typescript
// interfaces/cancel-order-usecase.interface.ts
export const ICancelOrderUseCaseToken = Symbol('ICancelOrderUseCase');

export interface ICancelOrderUseCase {
  execute(command: CancelOrderCommand): Promise<OrderResult>;
}
```

### 3. Implementar el UseCase (Business Logic)
Creá la clase que implemente la interfaz en `impl/usecases/`. Inyectá los repositorios u otros servicios que necesites mediante sus interfaces, **nunca directamente a TypeORM**.
```typescript
// impl/usecases/cancel-order.usecase.ts
@Injectable()
export class CancelOrderUseCaseImpl implements ICancelOrderUseCase {
  constructor(
    @Inject(IOrdersRepositoryToken) private readonly repo: IOrdersRepository
  ) {}

  async execute(command: CancelOrderCommand): Promise<OrderResult> {
    const order = await this.repo.findById(command.orderId);
    if (!order) throw new EntityNotFoundException('Order not found');
    
    // Reglas de negocio...
    order.status = OrderStatus.CANCELLED;
    
    return this.repo.save(order);
  }
}
```

### 4. Conectar en el Module (IoC)
Registrá el UseCase en tu `orders.module.ts` vinculando el Token con la Implementación.
```typescript
providers: [
  {
    provide: ICancelOrderUseCaseToken,
    useClass: CancelOrderUseCaseImpl, // Inversión de dependencias
  }
]
```

### 5. Exponer en el Controller
Finalmente, inyectá el Token en el Controller y llamá al caso de uso.
```typescript
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(ICancelOrderUseCaseToken) 
    private readonly cancelOrderUseCase: ICancelOrderUseCase,
  ) {}

  @Post(':id/cancel')
  async cancel(@Param('id') id: number): Promise<OrderResponseDto> {
    const result = await this.cancelOrderUseCase.execute({ orderId: id });
    return toOrderResponseDto(result); // Mapear a DTO
  }
}
```

---

## 🎯 ¿Por qué lo hacemos así? (Beneficios)

1. **Testabilidad**: Como el Controller y los Use Cases dependen de interfaces, podés crear unit tests haciendo *mocks* rapidísimo sin levantar una base de datos real.
2. **Independencia del Framework**: El código de negocio (`impl/usecases`) no sabe que existe HTTP, Express ni la estructura de las tablas SQL. Solo sabe de reglas de negocio.
3. **Escalabilidad**: Si el día de mañana queremos procesar órdenes a través de colas de mensajes (Kafka/RabbitMQ) en lugar de HTTP, solo hay que crear un *Message Controller* nuevo que llame al mismo UseCase. No se toca ni una línea de lógica core.
