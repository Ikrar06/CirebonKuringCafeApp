import '../../domain/entities/order_entity.dart';
import 'order_item_model.dart';

class OrderModel extends OrderEntity {
  const OrderModel({
    required super.id,
    required super.orderNumber,
    required super.tableId,
    required super.tableNumber,
    required super.items,
    required super.status,
    required super.createdAt,
    super.confirmedAt,
    super.preparingAt,
    super.readyAt,
    super.deliveredAt,
    super.completedAt,
    super.customerNotes,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    // Get table info - might come from joined data or separate field
    String tableNum = 'Unknown';
    if (json['table'] != null && json['table'] is Map) {
      tableNum = 'Table ${json['table']['table_number']}';
    } else if (json['table_number'] != null) {
      tableNum = 'Table ${json['table_number']}';
    }

    return OrderModel(
      id: json['id'] as String,
      orderNumber: json['order_number'] as String,
      tableId: json['table_id'] as String,
      tableNumber: tableNum,
      items: (json['items'] as List? ?? [])
          .where((item) => item != null && item is Map<String, dynamic>)
          .map((item) => OrderItemModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      confirmedAt: json['confirmed_at'] != null
          ? DateTime.parse(json['confirmed_at'] as String)
          : null,
      preparingAt: json['preparing_at'] != null
          ? DateTime.parse(json['preparing_at'] as String)
          : null,
      readyAt: json['ready_at'] != null
          ? DateTime.parse(json['ready_at'] as String)
          : null,
      deliveredAt: json['delivered_at'] != null
          ? DateTime.parse(json['delivered_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      customerNotes: json['customer_notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_number': orderNumber,
      'table_id': tableId,
      'items': items.map((item) => (item as OrderItemModel).toJson()).toList(),
      'status': status,
      'created_at': createdAt.toIso8601String(),
      if (confirmedAt != null) 'confirmed_at': confirmedAt!.toIso8601String(),
      if (preparingAt != null) 'preparing_at': preparingAt!.toIso8601String(),
      if (readyAt != null) 'ready_at': readyAt!.toIso8601String(),
      if (deliveredAt != null) 'delivered_at': deliveredAt!.toIso8601String(),
      if (completedAt != null) 'completed_at': completedAt!.toIso8601String(),
      if (customerNotes != null) 'customer_notes': customerNotes,
    };
  }

  factory OrderModel.fromEntity(OrderEntity entity) {
    return OrderModel(
      id: entity.id,
      orderNumber: entity.orderNumber,
      tableId: entity.tableId,
      tableNumber: entity.tableNumber,
      items: entity.items
          .map((item) => OrderItemModel.fromEntity(item))
          .toList(),
      status: entity.status,
      createdAt: entity.createdAt,
      confirmedAt: entity.confirmedAt,
      preparingAt: entity.preparingAt,
      readyAt: entity.readyAt,
      deliveredAt: entity.deliveredAt,
      completedAt: entity.completedAt,
      customerNotes: entity.customerNotes,
    );
  }

  OrderEntity toEntity() {
    return OrderEntity(
      id: id,
      orderNumber: orderNumber,
      tableId: tableId,
      tableNumber: tableNumber,
      items: items,
      status: status,
      createdAt: createdAt,
      confirmedAt: confirmedAt,
      preparingAt: preparingAt,
      readyAt: readyAt,
      deliveredAt: deliveredAt,
      completedAt: completedAt,
      customerNotes: customerNotes,
    );
  }
}
