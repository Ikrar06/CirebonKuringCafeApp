import 'package:equatable/equatable.dart';

import '../../domain/entities/stock_item_entity.dart';
import '../../domain/entities/stock_movement_entity.dart';
import '../../domain/entities/supplier_entity.dart';

abstract class StockEvent extends Equatable {
  const StockEvent();

  @override
  List<Object?> get props => [];
}

// Stock Items Events
class LoadStockItems extends StockEvent {}

class WatchStockItems extends StockEvent {}

class CreateStockItem extends StockEvent {
  final StockItemEntity item;

  const CreateStockItem(this.item);

  @override
  List<Object?> get props => [item];
}

class UpdateStockItem extends StockEvent {
  final StockItemEntity item;

  const UpdateStockItem(this.item);

  @override
  List<Object?> get props => [item];
}

class DeleteStockItem extends StockEvent {
  final String itemId;

  const DeleteStockItem(this.itemId);

  @override
  List<Object?> get props => [itemId];
}

class LoadLowStockItems extends StockEvent {}

// Stock Movement Events
class CreateStockMovement extends StockEvent {
  final StockMovementEntity movement;

  const CreateStockMovement(this.movement);

  @override
  List<Object?> get props => [movement];
}

class LoadStockMovements extends StockEvent {
  final String stockItemId;

  const LoadStockMovements(this.stockItemId);

  @override
  List<Object?> get props => [stockItemId];
}

// Supplier Events
class LoadSuppliers extends StockEvent {}

class CreateSupplier extends StockEvent {
  final SupplierEntity supplier;

  const CreateSupplier(this.supplier);

  @override
  List<Object?> get props => [supplier];
}

class UpdateSupplier extends StockEvent {
  final SupplierEntity supplier;

  const UpdateSupplier(this.supplier);

  @override
  List<Object?> get props => [supplier];
}
