import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/usecases/usecase.dart';
import '../../../../services/notification_service.dart';
import '../../domain/usecases/create_stock_item_usecase.dart';
import '../../domain/usecases/create_stock_movement_usecase.dart';
import '../../domain/usecases/create_supplier_usecase.dart';
import '../../domain/usecases/delete_stock_item_usecase.dart';
import '../../domain/usecases/get_low_stock_items_usecase.dart';
import '../../domain/usecases/get_stock_items_usecase.dart';
import '../../domain/usecases/get_stock_movements_usecase.dart';
import '../../domain/usecases/get_suppliers_usecase.dart';
import '../../domain/usecases/update_stock_item_usecase.dart';
import '../../domain/usecases/watch_stock_items_usecase.dart';
import 'stock_event.dart';
import 'stock_state.dart';

class StockBloc extends Bloc<StockEvent, StockState> {
  final GetStockItemsUseCase getStockItemsUseCase;
  final WatchStockItemsUseCase watchStockItemsUseCase;
  final CreateStockItemUseCase createStockItemUseCase;
  final UpdateStockItemUseCase updateStockItemUseCase;
  final DeleteStockItemUseCase deleteStockItemUseCase;
  final GetLowStockItemsUseCase getLowStockItemsUseCase;
  final CreateStockMovementUseCase createStockMovementUseCase;
  final GetStockMovementsUseCase getStockMovementsUseCase;
  final GetSuppliersUseCase getSuppliersUseCase;
  final CreateSupplierUseCase createSupplierUseCase;
  final NotificationService notificationService;

  StreamSubscription? _stockItemsSubscription;

  StockBloc({
    required this.getStockItemsUseCase,
    required this.watchStockItemsUseCase,
    required this.createStockItemUseCase,
    required this.updateStockItemUseCase,
    required this.deleteStockItemUseCase,
    required this.getLowStockItemsUseCase,
    required this.createStockMovementUseCase,
    required this.getStockMovementsUseCase,
    required this.getSuppliersUseCase,
    required this.createSupplierUseCase,
    required this.notificationService,
  }) : super(StockInitial()) {
    on<LoadStockItems>(_onLoadStockItems);
    on<WatchStockItems>(_onWatchStockItems);
    on<CreateStockItem>(_onCreateStockItem);
    on<UpdateStockItem>(_onUpdateStockItem);
    on<DeleteStockItem>(_onDeleteStockItem);
    on<LoadLowStockItems>(_onLoadLowStockItems);
    on<CreateStockMovement>(_onCreateStockMovement);
    on<LoadStockMovements>(_onLoadStockMovements);
    on<LoadSuppliers>(_onLoadSuppliers);
    on<CreateSupplier>(_onCreateSupplier);
  }

  Future<void> _onLoadStockItems(LoadStockItems event, Emitter<StockState> emit) async {
    emit(StockLoading());

    final result = await getStockItemsUseCase(const NoParams());

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (items) => emit(StockLoaded(items: items)),
    );
  }

  Future<void> _onWatchStockItems(WatchStockItems event, Emitter<StockState> emit) async {
    await _stockItemsSubscription?.cancel();

    _stockItemsSubscription = watchStockItemsUseCase().listen(
      (result) {
        result.fold(
          (failure) => emit(StockError(failure.message)),
          (items) {
            // Check for low stock and notify
            final lowStock = items.where((item) => item.isLowStock).toList();
            for (var item in lowStock) {
              if (item.isCriticalStock) {
                notificationService.notifyLowStock(
                  itemName: item.name,
                  currentStock: item.currentStock,
                  minStock: item.minStock,
                );
              }
            }

            if (state is StockLoaded) {
              emit((state as StockLoaded).copyWith(items: items, lowStockItems: lowStock));
            } else {
              emit(StockLoaded(items: items, lowStockItems: lowStock));
            }
          },
        );
      },
    );
  }

  Future<void> _onCreateStockItem(CreateStockItem event, Emitter<StockState> emit) async {
    final result = await createStockItemUseCase(event.item);

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (item) => emit(const StockOperationSuccess('Item stok berhasil ditambahkan')),
    );
  }

  Future<void> _onUpdateStockItem(UpdateStockItem event, Emitter<StockState> emit) async {
    final result = await updateStockItemUseCase(event.item);

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (item) => emit(const StockOperationSuccess('Item stok berhasil diperbarui')),
    );
  }

  Future<void> _onDeleteStockItem(DeleteStockItem event, Emitter<StockState> emit) async {
    final result = await deleteStockItemUseCase(event.itemId);

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (_) => emit(const StockOperationSuccess('Item stok berhasil dihapus')),
    );
  }

  Future<void> _onLoadLowStockItems(LoadLowStockItems event, Emitter<StockState> emit) async {
    final result = await getLowStockItemsUseCase(const NoParams());

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (items) {
        if (state is StockLoaded) {
          emit((state as StockLoaded).copyWith(lowStockItems: items));
        } else {
          emit(StockLoaded(lowStockItems: items));
        }
      },
    );
  }

  Future<void> _onCreateStockMovement(CreateStockMovement event, Emitter<StockState> emit) async {
    final result = await createStockMovementUseCase(event.movement);

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (movement) => emit(const StockOperationSuccess('Pergerakan stok berhasil dicatat')),
    );
  }

  Future<void> _onLoadStockMovements(LoadStockMovements event, Emitter<StockState> emit) async {
    final result = await getStockMovementsUseCase(event.stockItemId);

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (movements) {
        if (state is StockLoaded) {
          emit((state as StockLoaded).copyWith(movements: movements));
        } else {
          emit(StockLoaded(movements: movements));
        }
      },
    );
  }

  Future<void> _onLoadSuppliers(LoadSuppliers event, Emitter<StockState> emit) async {
    final result = await getSuppliersUseCase(const NoParams());

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (suppliers) {
        if (state is StockLoaded) {
          emit((state as StockLoaded).copyWith(suppliers: suppliers));
        } else {
          emit(StockLoaded(suppliers: suppliers));
        }
      },
    );
  }

  Future<void> _onCreateSupplier(CreateSupplier event, Emitter<StockState> emit) async {
    final result = await createSupplierUseCase(event.supplier);

    result.fold(
      (failure) => emit(StockError(failure.message)),
      (supplier) => emit(const StockOperationSuccess('Supplier berhasil ditambahkan')),
    );
  }

  @override
  Future<void> close() {
    _stockItemsSubscription?.cancel();
    return super.close();
  }
}
