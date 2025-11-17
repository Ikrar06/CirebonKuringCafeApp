import '../../domain/entities/stock_item_entity.dart';

class StockItemModel extends StockItemEntity {
  const StockItemModel({
    required super.id,
    required super.code,
    required super.name,
    required super.category,
    required super.unit,
    required super.currentStock,
    required super.minStock,
    required super.maxStock,
    super.reorderPoint,
    super.costPerUnit,
    super.description,
    super.storageLocation,
    super.lastRestocked,
    required super.createdAt,
    required super.updatedAt,
  });

  factory StockItemModel.fromJson(Map<String, dynamic> json) {
    return StockItemModel(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      unit: json['unit'] as String,
      currentStock: (json['current_stock'] as num).toDouble(),
      minStock: (json['min_stock'] as num).toDouble(),
      maxStock: (json['max_stock'] as num).toDouble(),
      reorderPoint: json['reorder_point'] != null
          ? (json['reorder_point'] as num).toDouble()
          : null,
      costPerUnit: json['cost_per_unit'] != null
          ? (json['cost_per_unit'] as num).toDouble()
          : null,
      description: json['description'] as String?,
      storageLocation: json['storage_location'] as String?,
      lastRestocked: json['last_restocked'] != null
          ? DateTime.parse(json['last_restocked'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'category': category,
      'unit': unit,
      'current_stock': currentStock,
      'min_stock': minStock,
      'max_stock': maxStock,
      if (reorderPoint != null) 'reorder_point': reorderPoint,
      if (costPerUnit != null) 'cost_per_unit': costPerUnit,
      if (description != null) 'description': description,
      if (storageLocation != null) 'storage_location': storageLocation,
      if (lastRestocked != null) 'last_restocked': lastRestocked!.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory StockItemModel.fromEntity(StockItemEntity entity) {
    return StockItemModel(
      id: entity.id,
      code: entity.code,
      name: entity.name,
      category: entity.category,
      unit: entity.unit,
      currentStock: entity.currentStock,
      minStock: entity.minStock,
      maxStock: entity.maxStock,
      reorderPoint: entity.reorderPoint,
      costPerUnit: entity.costPerUnit,
      description: entity.description,
      storageLocation: entity.storageLocation,
      lastRestocked: entity.lastRestocked,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  StockItemEntity toEntity() {
    return StockItemEntity(
      id: id,
      code: code,
      name: name,
      category: category,
      unit: unit,
      currentStock: currentStock,
      minStock: minStock,
      maxStock: maxStock,
      reorderPoint: reorderPoint,
      costPerUnit: costPerUnit,
      description: description,
      storageLocation: storageLocation,
      lastRestocked: lastRestocked,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
