import 'package:equatable/equatable.dart';

import 'menu_item_entity.dart';

class OrderItemEntity extends Equatable {
  final String id;
  final String orderId;
  final String menuItemId;
  final MenuItemEntity menuItem;

  // Denormalized for order history
  final String itemName;
  final double itemPrice;

  final int quantity;
  final Map<String, dynamic>? customizations; // JSON for addons/customization
  final double customizationPrice;
  final double subtotal;
  final String? notes;
  final String status; // pending, preparing, ready, served, cancelled

  final DateTime? preparedAt;
  final DateTime? servedAt;

  const OrderItemEntity({
    required this.id,
    required this.orderId,
    required this.menuItemId,
    required this.menuItem,
    required this.itemName,
    required this.itemPrice,
    required this.quantity,
    this.customizations,
    this.customizationPrice = 0,
    required this.subtotal,
    this.notes,
    required this.status,
    this.preparedAt,
    this.servedAt,
  });

  @override
  List<Object?> get props => [
        id,
        orderId,
        menuItemId,
        menuItem,
        itemName,
        itemPrice,
        quantity,
        customizations,
        customizationPrice,
        subtotal,
        notes,
        status,
        preparedAt,
        servedAt,
      ];
}
