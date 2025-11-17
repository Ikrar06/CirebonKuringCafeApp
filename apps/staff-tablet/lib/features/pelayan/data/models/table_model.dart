import '../../domain/entities/table_entity.dart';

class TableModel extends TableEntity {
  const TableModel({
    required super.id,
    required super.tableNumber,
    required super.capacity,
    required super.status,
    super.currentOrderId,
    super.occupiedSince,
    required super.createdAt,
    required super.updatedAt,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    return TableModel(
      id: json['id'] as String,
      tableNumber: json['table_number'] as int,
      capacity: json['capacity'] as int,
      status: json['status'] as String,
      currentOrderId: json['current_order_id'] as String?,
      occupiedSince: json['occupied_since'] != null
          ? DateTime.parse(json['occupied_since'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'table_number': tableNumber,
      'capacity': capacity,
      'status': status,
      if (currentOrderId != null) 'current_order_id': currentOrderId,
      if (occupiedSince != null) 'occupied_since': occupiedSince!.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory TableModel.fromEntity(TableEntity entity) {
    return TableModel(
      id: entity.id,
      tableNumber: entity.tableNumber,
      capacity: entity.capacity,
      status: entity.status,
      currentOrderId: entity.currentOrderId,
      occupiedSince: entity.occupiedSince,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  TableEntity toEntity() => this;
}
