import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../services/notification_service.dart';
import '../../domain/usecases/deliver_order_usecase.dart';
import '../../domain/usecases/watch_ready_orders_usecase.dart';
import '../../domain/usecases/watch_tables_usecase.dart';
import 'pelayan_event.dart';
import 'pelayan_state.dart';

class PelayanBloc extends Bloc<PelayanEvent, PelayanState> {
  final WatchTablesUseCase watchTablesUseCase;
  final WatchReadyOrdersUseCase watchReadyOrdersUseCase;
  final DeliverOrderUseCase deliverOrderUseCase;
  final NotificationService notificationService;

  StreamSubscription? _tablesSubscription;
  StreamSubscription? _ordersSubscription;

  PelayanBloc({
    required this.watchTablesUseCase,
    required this.watchReadyOrdersUseCase,
    required this.deliverOrderUseCase,
    required this.notificationService,
  }) : super(PelayanInitial()) {
    on<WatchTables>(_onWatchTables);
    on<WatchReadyOrders>(_onWatchReadyOrders);
    on<DeliverOrder>(_onDeliverOrder);
  }

  Future<void> _onWatchTables(WatchTables event, Emitter<PelayanState> emit) async {
    await _tablesSubscription?.cancel();

    _tablesSubscription = watchTablesUseCase().listen(
      (result) {
        result.fold(
          (failure) => emit(PelayanError(failure.message)),
          (tables) {
            if (state is PelayanLoaded) {
              emit((state as PelayanLoaded).copyWith(tables: tables));
            } else {
              emit(PelayanLoaded(tables: tables));
            }
          },
        );
      },
    );
  }

  Future<void> _onWatchReadyOrders(WatchReadyOrders event, Emitter<PelayanState> emit) async {
    await _ordersSubscription?.cancel();

    _ordersSubscription = watchReadyOrdersUseCase().listen(
      (result) {
        result.fold(
          (failure) => emit(PelayanError(failure.message)),
          (orders) {
            // Notify for ready orders
            for (var orderWithTable in orders) {
              notificationService.notifyOrderReady(
                orderNumber: orderWithTable.order.orderNumber,
                tableName: orderWithTable.tableDisplay,
              );
            }

            if (state is PelayanLoaded) {
              emit((state as PelayanLoaded).copyWith(readyOrders: orders));
            } else {
              emit(PelayanLoaded(readyOrders: orders));
            }
          },
        );
      },
    );
  }

  Future<void> _onDeliverOrder(DeliverOrder event, Emitter<PelayanState> emit) async {
    final result = await deliverOrderUseCase(event.orderId);

    result.fold(
      (failure) => emit(PelayanError(failure.message)),
      (_) => emit(const PelayanOperationSuccess('Pesanan berhasil diantar')),
    );
  }

  @override
  Future<void> close() {
    _tablesSubscription?.cancel();
    _ordersSubscription?.cancel();
    return super.close();
  }
}
