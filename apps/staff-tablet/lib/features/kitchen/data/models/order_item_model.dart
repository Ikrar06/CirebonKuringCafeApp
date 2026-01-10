import 'dart:convert';

import '../../domain/entities/order_item_entity.dart';
import 'menu_item_model.dart';

class OrderItemModel extends OrderItemEntity {
  const OrderItemModel({
    required super.id,
    required super.orderId,
    required super.menuItemId,
    required MenuItemModel super.menuItem,
    required super.itemName,
    required super.itemPrice,
    required super.quantity,
    super.customizations,
    super.customizationPrice,
    required super.subtotal,
    super.notes,
    required super.status,
    super.preparedAt,
    super.servedAt,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    // Parse customizations from JSONB
    Map<String, dynamic>? customizations;
    if (json['customizations'] != null) {
      if (json['customizations'] is String) {
        customizations = jsonDecode(json['customizations']);
      } else {
        customizations = json['customizations'] as Map<String, dynamic>;
      }
    }

    // Parse menu_item - could be null if menu item was deleted
    MenuItemModel menuItem;
    if (json['menu_item'] != null && json['menu_item'] is Map<String, dynamic>) {
      menuItem = MenuItemModel.fromJson(json['menu_item'] as Map<String, dynamic>);
    } else {
      // Fallback: create a basic menu item from order item data
      final itemName = json['item_name'] as String;
      menuItem = MenuItemModel(
        id: json['menu_item_id'] as String,
        name: itemName,
        slug: itemName.toLowerCase().replaceAll(' ', '-'),
        description: 'Item tidak lagi tersedia',
        basePrice: (json['item_price'] as num).toDouble(),
        isAvailable: false,
        estimatedPrepTime: 15,
        categoryId: null,
        imageUrl: null,
        thumbnailUrl: null,
      );
    }

    return OrderItemModel(
      id: json['id'] as String,
      orderId: json['order_id'] as String,
      menuItemId: json['menu_item_id'] as String,
      menuItem: menuItem,
      itemName: json['item_name'] as String,
      itemPrice: (json['item_price'] as num).toDouble(),
      quantity: json['quantity'] as int,
      customizations: customizations,
      customizationPrice: (json['customization_price'] as num?)?.toDouble() ?? 0,
      subtotal: (json['subtotal'] as num).toDouble(),
      notes: json['notes'] as String?,
      status: json['status'] as String? ?? 'pending',
      preparedAt: json['prepared_at'] != null
          ? DateTime.parse(json['prepared_at'] as String)
          : null,
      servedAt: json['served_at'] != null
          ? DateTime.parse(json['served_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_id': orderId,
      'menu_item_id': menuItemId,
      'menu_item': (menuItem as MenuItemModel).toJson(),
      'item_name': itemName,
      'item_price': itemPrice,
      'quantity': quantity,
      if (customizations != null) 'customizations': customizations,
      'customization_price': customizationPrice,
      'subtotal': subtotal,
      if (notes != null) 'notes': notes,
      'status': status,
      if (preparedAt != null) 'prepared_at': preparedAt!.toIso8601String(),
      if (servedAt != null) 'served_at': servedAt!.toIso8601String(),
    };
  }

  factory OrderItemModel.fromEntity(OrderItemEntity entity) {
    return OrderItemModel(
      id: entity.id,
      orderId: entity.orderId,
      menuItemId: entity.menuItemId,
      menuItem: MenuItemModel.fromEntity(entity.menuItem),
      itemName: entity.itemName,
      itemPrice: entity.itemPrice,
      quantity: entity.quantity,
      customizations: entity.customizations,
      customizationPrice: entity.customizationPrice,
      subtotal: entity.subtotal,
      notes: entity.notes,
      status: entity.status,
      preparedAt: entity.preparedAt,
      servedAt: entity.servedAt,
    );
  }

  OrderItemEntity toEntity() {
    return OrderItemEntity(
      id: id,
      orderId: orderId,
      menuItemId: menuItemId,
      menuItem: menuItem,
      itemName: itemName,
      itemPrice: itemPrice,
      quantity: quantity,
      customizations: customizations,
      customizationPrice: customizationPrice,
      subtotal: subtotal,
      notes: notes,
      status: status,
      preparedAt: preparedAt,
      servedAt: servedAt,
    );
  }
}
