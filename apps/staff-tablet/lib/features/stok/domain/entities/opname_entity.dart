import 'package:equatable/equatable.dart';

/// Stock opname (physical count) entity
class OpnameEntity extends Equatable {
  final String id;
  final String opnameNumber;
  final DateTime opnameDate;
  final String status; // draft, in_progress, completed, cancelled
  final List<OpnameItemEntity> items;
  final String? notes;
  final String employeeId;
  final String employeeName;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const OpnameEntity({
    required this.id,
    required this.opnameNumber,
    required this.opnameDate,
    required this.status,
    required this.items,
    this.notes,
    required this.employeeId,
    required this.employeeName,
    this.startedAt,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Check if opname is completed
  bool get isCompleted => status == 'completed';

  /// Check if opname is in progress
  bool get isInProgress => status == 'in_progress';

  /// Check if opname is draft
  bool get isDraft => status == 'draft';

  /// Get total items count
  int get totalItems => items.length;

  /// Get counted items count
  int get countedItems => items.where((item) => item.physicalCount != null).length;

  /// Get completion percentage
  double get completionPercentage {
    if (totalItems == 0) return 0;
    return (countedItems / totalItems * 100).clamp(0, 100);
  }

  /// Get items with discrepancies
  List<OpnameItemEntity> get discrepancyItems {
    return items.where((item) => item.hasDiscrepancy).toList();
  }

  @override
  List<Object?> get props => [
        id,
        opnameNumber,
        opnameDate,
        status,
        items,
        notes,
        employeeId,
        employeeName,
        startedAt,
        completedAt,
        createdAt,
        updatedAt,
      ];
}

/// Individual item in stock opname
class OpnameItemEntity extends Equatable {
  final String id;
  final String opnameId;
  final String stockItemId;
  final String stockItemName;
  final String unit;
  final double systemStock;
  final double? physicalCount;
  final double? difference;
  final String? notes;

  const OpnameItemEntity({
    required this.id,
    required this.opnameId,
    required this.stockItemId,
    required this.stockItemName,
    required this.unit,
    required this.systemStock,
    this.physicalCount,
    this.difference,
    this.notes,
  });

  /// Check if physical count has been entered
  bool get isCounted => physicalCount != null;

  /// Check if there is a discrepancy
  bool get hasDiscrepancy {
    if (physicalCount == null) return false;
    return (physicalCount! - systemStock).abs() > 0.01;
  }

  /// Get calculated difference
  double get calculatedDifference {
    if (physicalCount == null) return 0;
    return physicalCount! - systemStock;
  }

  @override
  List<Object?> get props => [
        id,
        opnameId,
        stockItemId,
        stockItemName,
        unit,
        systemStock,
        physicalCount,
        difference,
        notes,
      ];
}
