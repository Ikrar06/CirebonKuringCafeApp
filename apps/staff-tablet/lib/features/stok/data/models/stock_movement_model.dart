import '../../domain/entities/stock_movement_entity.dart';

class StockMovementModel extends StockMovementEntity {
  const StockMovementModel({
    required super.id,
    required super.stockItemId,
    required super.stockItemName,
    required super.movementType,
    required super.quantity,
    required super.unit,
    required super.previousStock,
    required super.newStock,
    super.referenceNumber,
    super.supplierId,
    super.supplierName,
    super.reason,
    super.notes,
    required super.employeeId,
    required super.employeeName,
    required super.createdAt,
  });

  factory StockMovementModel.fromJson(Map<String, dynamic> json) {
    // Handle joined stock_item data
    String itemName = 'Unknown';
    String unit = '';
    if (json['stock_item'] != null && json['stock_item'] is Map) {
      itemName = json['stock_item']['name'] as String? ?? 'Unknown';
      unit = json['stock_item']['unit'] as String? ?? '';
    } else if (json['stock_item_name'] != null) {
      itemName = json['stock_item_name'] as String;
      unit = json['unit'] as String? ?? '';
    }

    // Handle joined supplier data
    String? supplierName;
    if (json['supplier'] != null && json['supplier'] is Map) {
      supplierName = json['supplier']['name'] as String?;
    } else if (json['supplier_name'] != null) {
      supplierName = json['supplier_name'] as String?;
    }

    // Handle joined employee data
    String employeeName = 'System';
    if (json['employee'] != null && json['employee'] is Map) {
      employeeName = json['employee']['name'] as String? ?? 'System';
    } else if (json['employee_name'] != null) {
      employeeName = json['employee_name'] as String;
    }

    return StockMovementModel(
      id: json['id'] as String,
      stockItemId: json['stock_item_id'] as String,
      stockItemName: itemName,
      movementType: json['movement_type'] as String,
      quantity: (json['quantity'] as num).toDouble(),
      unit: unit,
      previousStock: (json['previous_stock'] as num).toDouble(),
      newStock: (json['new_stock'] as num).toDouble(),
      referenceNumber: json['reference_number'] as String?,
      supplierId: json['supplier_id'] as String?,
      supplierName: supplierName,
      reason: json['reason'] as String?,
      notes: json['notes'] as String?,
      employeeId: json['employee_id'] as String,
      employeeName: employeeName,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'stock_item_id': stockItemId,
      'movement_type': movementType,
      'quantity': quantity,
      'previous_stock': previousStock,
      'new_stock': newStock,
      if (referenceNumber != null) 'reference_number': referenceNumber,
      if (supplierId != null) 'supplier_id': supplierId,
      if (reason != null) 'reason': reason,
      if (notes != null) 'notes': notes,
      'employee_id': employeeId,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory StockMovementModel.fromEntity(StockMovementEntity entity) {
    return StockMovementModel(
      id: entity.id,
      stockItemId: entity.stockItemId,
      stockItemName: entity.stockItemName,
      movementType: entity.movementType,
      quantity: entity.quantity,
      unit: entity.unit,
      previousStock: entity.previousStock,
      newStock: entity.newStock,
      referenceNumber: entity.referenceNumber,
      supplierId: entity.supplierId,
      supplierName: entity.supplierName,
      reason: entity.reason,
      notes: entity.notes,
      employeeId: entity.employeeId,
      employeeName: entity.employeeName,
      createdAt: entity.createdAt,
    );
  }

  StockMovementEntity toEntity() {
    return StockMovementEntity(
      id: id,
      stockItemId: stockItemId,
      stockItemName: stockItemName,
      movementType: movementType,
      quantity: quantity,
      unit: unit,
      previousStock: previousStock,
      newStock: newStock,
      referenceNumber: referenceNumber,
      supplierId: supplierId,
      supplierName: supplierName,
      reason: reason,
      notes: notes,
      employeeId: employeeId,
      employeeName: employeeName,
      createdAt: createdAt,
    );
  }
}
