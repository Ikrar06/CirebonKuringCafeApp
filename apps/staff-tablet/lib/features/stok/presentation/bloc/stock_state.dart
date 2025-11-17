import 'package:equatable/equatable.dart';

import '../../domain/entities/stock_item_entity.dart';
import '../../domain/entities/stock_movement_entity.dart';
import '../../domain/entities/supplier_entity.dart';

abstract class StockState extends Equatable {
  const StockState();

  @override
  List<Object?> get props => [];
}

class StockInitial extends StockState {}

class StockLoading extends StockState {}

class StockLoaded extends StockState {
  final List<StockItemEntity> items;
  final List<StockMovementEntity> movements;
  final List<SupplierEntity> suppliers;
  final List<StockItemEntity> lowStockItems;

  const StockLoaded({
    this.items = const [],
    this.movements = const [],
    this.suppliers = const [],
    this.lowStockItems = const [],
  });

  StockLoaded copyWith({
    List<StockItemEntity>? items,
    List<StockMovementEntity>? movements,
    List<SupplierEntity>? suppliers,
    List<StockItemEntity>? lowStockItems,
  }) {
    return StockLoaded(
      items: items ?? this.items,
      movements: movements ?? this.movements,
      suppliers: suppliers ?? this.suppliers,
      lowStockItems: lowStockItems ?? this.lowStockItems,
    );
  }

  @override
  List<Object?> get props => [items, movements, suppliers, lowStockItems];
}

class StockOperationSuccess extends StockState {
  final String message;

  const StockOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class StockError extends StockState {
  final String message;

  const StockError(this.message);

  @override
  List<Object?> get props => [message];
}
