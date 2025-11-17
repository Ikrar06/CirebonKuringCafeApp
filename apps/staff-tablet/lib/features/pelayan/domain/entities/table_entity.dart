import 'package:equatable/equatable.dart';

/// Table entity for restaurant tables
class TableEntity extends Equatable {
  final String id;
  final int tableNumber;
  final int capacity;
  final String status; // available, occupied, reserved, cleaning
  final String? currentOrderId;
  final DateTime? occupiedSince;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TableEntity({
    required this.id,
    required this.tableNumber,
    required this.capacity,
    required this.status,
    this.currentOrderId,
    this.occupiedSince,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Check if table is available
  bool get isAvailable => status == 'available';

  /// Check if table is occupied
  bool get isOccupied => status == 'occupied';

  /// Check if table is reserved
  bool get isReserved => status == 'reserved';

  /// Check if table is being cleaned
  bool get isCleaning => status == 'cleaning';

  /// Get occupied duration in minutes
  int? get occupiedDurationMinutes {
    if (occupiedSince == null) return null;
    return DateTime.now().difference(occupiedSince!).inMinutes;
  }

  @override
  List<Object?> get props => [
        id,
        tableNumber,
        capacity,
        status,
        currentOrderId,
        occupiedSince,
        createdAt,
        updatedAt,
      ];
}
