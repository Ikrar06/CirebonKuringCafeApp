import 'package:equatable/equatable.dart';

/// Stock movement entity for tracking inventory changes
class StockMovementEntity extends Equatable {
  final String id;
  final String stockItemId;
  final String stockItemName;
  final String movementType; // in, out, adjustment, return, waste
  final double quantity;
  final String unit;
  final double previousStock;
  final double newStock;
  final String? referenceNumber; // PO number, order number, etc
  final String? supplierId;
  final String? supplierName;
  final String? reason;
  final String? notes;
  final String employeeId;
  final String employeeName;
  final DateTime createdAt;

  const StockMovementEntity({
    required this.id,
    required this.stockItemId,
    required this.stockItemName,
    required this.movementType,
    required this.quantity,
    required this.unit,
    required this.previousStock,
    required this.newStock,
    this.referenceNumber,
    this.supplierId,
    this.supplierName,
    this.reason,
    this.notes,
    required this.employeeId,
    required this.employeeName,
    required this.createdAt,
  });

  /// Check if this is an incoming stock movement
  bool get isStockIn => movementType == 'in' || movementType == 'return';

  /// Check if this is an outgoing stock movement
  bool get isStockOut => movementType == 'out' || movementType == 'waste';

  /// Check if this is an adjustment
  bool get isAdjustment => movementType == 'adjustment';

  /// Get the stock change amount (positive or negative)
  double get stockChange => newStock - previousStock;

  /// Get movement type display label
  String get movementTypeLabel {
    switch (movementType) {
      case 'in':
        return 'Stok Masuk';
      case 'out':
        return 'Stok Keluar';
      case 'adjustment':
        return 'Penyesuaian';
      case 'return':
        return 'Retur';
      case 'waste':
        return 'Terbuang';
      default:
        return movementType;
    }
  }

  @override
  List<Object?> get props => [
        id,
        stockItemId,
        stockItemName,
        movementType,
        quantity,
        unit,
        previousStock,
        newStock,
        referenceNumber,
        supplierId,
        supplierName,
        reason,
        notes,
        employeeId,
        employeeName,
        createdAt,
      ];
}
