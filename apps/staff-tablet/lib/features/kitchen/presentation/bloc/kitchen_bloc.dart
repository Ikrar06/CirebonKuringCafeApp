import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/order_entity.dart';
import '../../domain/usecases/bump_order_usecase.dart';
import '../../domain/usecases/get_active_orders_usecase.dart';
import '../../domain/usecases/update_order_status_usecase.dart';
import '../../domain/usecases/watch_orders_usecase.dart';
import 'kitchen_event.dart';
import 'kitchen_state.dart';

class KitchenBloc extends Bloc<KitchenEvent, KitchenState> {
  final GetActiveOrdersUseCase getActiveOrdersUseCase;
  final UpdateOrderStatusUseCase updateOrderStatusUseCase;
  final BumpOrderUseCase bumpOrderUseCase;
  final WatchOrdersUseCase watchOrdersUseCase;

  StreamSubscription<List<OrderEntity>>? _ordersSubscription;

  KitchenBloc({
    required this.getActiveOrdersUseCase,
    required this.updateOrderStatusUseCase,
    required this.bumpOrderUseCase,
    required this.watchOrdersUseCase,
  }) : super(const KitchenInitial()) {
    on<LoadActiveOrdersEvent>(_onLoadActiveOrders);
    on<WatchOrdersEvent>(_onWatchOrders);
    on<OrdersUpdatedEvent>(_onOrdersUpdated);
    on<StartOrderEvent>(_onStartOrder);
    on<MarkOrderReadyEvent>(_onMarkOrderReady);
    on<BumpOrderEvent>(_onBumpOrder);
    on<UpdateOrderStatusEvent>(_onUpdateOrderStatus);
  }

  Future<void> _onLoadActiveOrders(
    LoadActiveOrdersEvent event,
    Emitter<KitchenState> emit,
  ) async {
    emit(const KitchenLoading());

    final result = await getActiveOrdersUseCase(const NoParams());

    result.fold(
      (failure) => emit(KitchenError(message: failure.message)),
      (orders) => emit(KitchenLoaded(
        orders: orders,
        lastUpdated: DateTime.now(),
      )),
    );
  }

  Future<void> _onWatchOrders(
    WatchOrdersEvent event,
    Emitter<KitchenState> emit,
  ) async {
    // Cancel previous subscription if exists
    await _ordersSubscription?.cancel();

    // Start watching orders
    _ordersSubscription = watchOrdersUseCase().listen(
      (orders) {
        add(OrdersUpdatedEvent(orders));
      },
      onError: (error) {
        add(OrdersUpdatedEvent(const []));
      },
    );
  }

  void _onOrdersUpdated(
    OrdersUpdatedEvent event,
    Emitter<KitchenState> emit,
  ) {
    final orders = event.orders.cast<OrderEntity>();
    emit(KitchenLoaded(
      orders: orders,
      lastUpdated: DateTime.now(),
    ));
  }

  Future<void> _onStartOrder(
    StartOrderEvent event,
    Emitter<KitchenState> emit,
  ) async {
    final currentState = state;
    if (currentState is! KitchenLoaded) return;

    emit(KitchenUpdating(
      orders: currentState.orders,
      updatingOrderId: event.orderId,
    ));

    final result = await updateOrderStatusUseCase(
      UpdateOrderStatusParams(
        orderId: event.orderId,
        status: 'preparing',
      ),
    );

    result.fold(
      (failure) => emit(KitchenError(
        message: failure.message,
        orders: currentState.orders,
      )),
      (updatedOrder) {
        final updatedOrders = currentState.orders.map((order) {
          return order.id == updatedOrder.id ? updatedOrder : order;
        }).toList();

        emit(KitchenLoaded(
          orders: updatedOrders,
          lastUpdated: DateTime.now(),
        ));
      },
    );
  }

  Future<void> _onMarkOrderReady(
    MarkOrderReadyEvent event,
    Emitter<KitchenState> emit,
  ) async {
    final currentState = state;
    if (currentState is! KitchenLoaded) return;

    emit(KitchenUpdating(
      orders: currentState.orders,
      updatingOrderId: event.orderId,
    ));

    final result = await updateOrderStatusUseCase(
      UpdateOrderStatusParams(
        orderId: event.orderId,
        status: 'ready',
      ),
    );

    result.fold(
      (failure) => emit(KitchenError(
        message: failure.message,
        orders: currentState.orders,
      )),
      (updatedOrder) {
        final updatedOrders = currentState.orders.map((order) {
          return order.id == updatedOrder.id ? updatedOrder : order;
        }).toList();

        emit(KitchenLoaded(
          orders: updatedOrders,
          lastUpdated: DateTime.now(),
        ));
      },
    );
  }

  Future<void> _onBumpOrder(
    BumpOrderEvent event,
    Emitter<KitchenState> emit,
  ) async {
    final currentState = state;
    if (currentState is! KitchenLoaded) return;

    emit(KitchenUpdating(
      orders: currentState.orders,
      updatingOrderId: event.orderId,
    ));

    final result = await bumpOrderUseCase(
      BumpOrderParams(orderId: event.orderId),
    );

    result.fold(
      (failure) => emit(KitchenError(
        message: failure.message,
        orders: currentState.orders,
      )),
      (_) {
        // Remove the bumped order from the list
        final updatedOrders = currentState.orders
            .where((order) => order.id != event.orderId)
            .toList();

        emit(KitchenLoaded(
          orders: updatedOrders,
          lastUpdated: DateTime.now(),
        ));
      },
    );
  }

  Future<void> _onUpdateOrderStatus(
    UpdateOrderStatusEvent event,
    Emitter<KitchenState> emit,
  ) async {
    final currentState = state;
    if (currentState is! KitchenLoaded) return;

    emit(KitchenUpdating(
      orders: currentState.orders,
      updatingOrderId: event.orderId,
    ));

    final result = await updateOrderStatusUseCase(
      UpdateOrderStatusParams(
        orderId: event.orderId,
        status: event.status,
      ),
    );

    result.fold(
      (failure) => emit(KitchenError(
        message: failure.message,
        orders: currentState.orders,
      )),
      (updatedOrder) {
        final updatedOrders = currentState.orders.map((order) {
          return order.id == updatedOrder.id ? updatedOrder : order;
        }).toList();

        emit(KitchenLoaded(
          orders: updatedOrders,
          lastUpdated: DateTime.now(),
        ));
      },
    );
  }

  @override
  Future<void> close() {
    _ordersSubscription?.cancel();
    return super.close();
  }
}
