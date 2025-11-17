import 'package:equatable/equatable.dart';

/// Stock item entity representing inventory items
class StockItemEntity extends Equatable {
  final String id;
  final String code;
  final String name;
  final String category; // ingredients, beverages, packaging, supplies
  final String unit; // kg, liter, pcs, etc
  final double currentStock;
  final double minStock;
  final double maxStock;
  final double? reorderPoint;
  final double? costPerUnit;
  final String? description;
  final String? storageLocation;
  final DateTime? lastRestocked;
  final DateTime createdAt;
  final DateTime updatedAt;

  const StockItemEntity({
    required this.id,
    required this.code,
    required this.name,
    required this.category,
    required this.unit,
    required this.currentStock,
    required this.minStock,
    required this.maxStock,
    this.reorderPoint,
    this.costPerUnit,
    this.description,
    this.storageLocation,
    this.lastRestocked,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Check if stock is low (below minimum)
  bool get isLowStock => currentStock <= minStock;

  /// Check if stock is critical (below reorder point or 50% of min stock)
  bool get isCriticalStock {
    if (reorderPoint != null) {
      return currentStock <= reorderPoint!;
    }
    return currentStock <= (minStock * 0.5);
  }

  /// Check if stock is overstocked (above maximum)
  bool get isOverstocked => currentStock >= maxStock;

  /// Get stock status
  String get stockStatus {
    if (isCriticalStock) return 'critical';
    if (isLowStock) return 'low';
    if (isOverstocked) return 'overstocked';
    return 'normal';
  }

  /// Calculate stock percentage relative to max stock
  double get stockPercentage {
    if (maxStock == 0) return 0;
    return (currentStock / maxStock * 100).clamp(0, 100);
  }

  /// Calculate total value of current stock
  double get totalValue {
    if (costPerUnit == null) return 0;
    return currentStock * costPerUnit!;
  }

  @override
  List<Object?> get props => [
        id,
        code,
        name,
        category,
        unit,
        currentStock,
        minStock,
        maxStock,
        reorderPoint,
        costPerUnit,
        description,
        storageLocation,
        lastRestocked,
        createdAt,
        updatedAt,
      ];
}
