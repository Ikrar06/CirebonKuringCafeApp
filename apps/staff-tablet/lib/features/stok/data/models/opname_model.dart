import '../../domain/entities/opname_entity.dart';

class OpnameModel extends OpnameEntity {
  const OpnameModel({
    required super.id,
    required super.opnameNumber,
    required super.opnameDate,
    required super.status,
    required super.items,
    super.notes,
    required super.employeeId,
    required super.employeeName,
    super.startedAt,
    super.completedAt,
    required super.createdAt,
    required super.updatedAt,
  });

  factory OpnameModel.fromJson(Map<String, dynamic> json) {
    // Handle joined employee data
    String employeeName = 'System';
    if (json['employee'] != null && json['employee'] is Map) {
      employeeName = json['employee']['name'] as String? ?? 'System';
    } else if (json['employee_name'] != null) {
      employeeName = json['employee_name'] as String;
    }

    return OpnameModel(
      id: json['id'] as String,
      opnameNumber: json['opname_number'] as String,
      opnameDate: DateTime.parse(json['opname_date'] as String),
      status: json['status'] as String,
      items: (json['items'] as List? ?? [])
          .map((item) => OpnameItemModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      notes: json['notes'] as String?,
      employeeId: json['employee_id'] as String,
      employeeName: employeeName,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'opname_number': opnameNumber,
      'opname_date': opnameDate.toIso8601String(),
      'status': status,
      'items': items.map((item) => (item as OpnameItemModel).toJson()).toList(),
      if (notes != null) 'notes': notes,
      'employee_id': employeeId,
      if (startedAt != null) 'started_at': startedAt!.toIso8601String(),
      if (completedAt != null) 'completed_at': completedAt!.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory OpnameModel.fromEntity(OpnameEntity entity) {
    return OpnameModel(
      id: entity.id,
      opnameNumber: entity.opnameNumber,
      opnameDate: entity.opnameDate,
      status: entity.status,
      items: entity.items
          .map((item) => OpnameItemModel.fromEntity(item))
          .toList(),
      notes: entity.notes,
      employeeId: entity.employeeId,
      employeeName: entity.employeeName,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  OpnameEntity toEntity() {
    return OpnameEntity(
      id: id,
      opnameNumber: opnameNumber,
      opnameDate: opnameDate,
      status: status,
      items: items,
      notes: notes,
      employeeId: employeeId,
      employeeName: employeeName,
      startedAt: startedAt,
      completedAt: completedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class OpnameItemModel extends OpnameItemEntity {
  const OpnameItemModel({
    required super.id,
    required super.opnameId,
    required super.stockItemId,
    required super.stockItemName,
    required super.unit,
    required super.systemStock,
    super.physicalCount,
    super.difference,
    super.notes,
  });

  factory OpnameItemModel.fromJson(Map<String, dynamic> json) {
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

    return OpnameItemModel(
      id: json['id'] as String,
      opnameId: json['opname_id'] as String,
      stockItemId: json['stock_item_id'] as String,
      stockItemName: itemName,
      unit: unit,
      systemStock: (json['system_stock'] as num).toDouble(),
      physicalCount: json['physical_count'] != null
          ? (json['physical_count'] as num).toDouble()
          : null,
      difference: json['difference'] != null
          ? (json['difference'] as num).toDouble()
          : null,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'opname_id': opnameId,
      'stock_item_id': stockItemId,
      'system_stock': systemStock,
      if (physicalCount != null) 'physical_count': physicalCount,
      if (difference != null) 'difference': difference,
      if (notes != null) 'notes': notes,
    };
  }

  factory OpnameItemModel.fromEntity(OpnameItemEntity entity) {
    return OpnameItemModel(
      id: entity.id,
      opnameId: entity.opnameId,
      stockItemId: entity.stockItemId,
      stockItemName: entity.stockItemName,
      unit: entity.unit,
      systemStock: entity.systemStock,
      physicalCount: entity.physicalCount,
      difference: entity.difference,
      notes: entity.notes,
    );
  }

  OpnameItemEntity toEntity() {
    return OpnameItemEntity(
      id: id,
      opnameId: opnameId,
      stockItemId: stockItemId,
      stockItemName: stockItemName,
      unit: unit,
      systemStock: systemStock,
      physicalCount: physicalCount,
      difference: difference,
      notes: notes,
    );
  }
}
