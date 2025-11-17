import 'package:equatable/equatable.dart';

/// Payment entity for order payments
class PaymentEntity extends Equatable {
  final String id;
  final String orderId;
  final String orderNumber;
  final double amount;
  final String paymentMethod; // cash, qris, transfer, card
  final String status; // pending, verified, completed, failed
  final String? proofImageUrl;
  final String? verifiedBy;
  final String? verifiedByName;
  final DateTime? verifiedAt;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PaymentEntity({
    required this.id,
    required this.orderId,
    required this.orderNumber,
    required this.amount,
    required this.paymentMethod,
    required this.status,
    this.proofImageUrl,
    this.verifiedBy,
    this.verifiedByName,
    this.verifiedAt,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Check if payment needs verification
  bool get needsVerification => status == 'pending' && proofImageUrl != null;

  /// Check if payment is completed
  bool get isCompleted => status == 'completed';

  /// Check if payment is verified
  bool get isVerified => status == 'verified';

  /// Get payment method display name
  String get paymentMethodLabel {
    switch (paymentMethod) {
      case 'cash':
        return 'Tunai';
      case 'qris':
        return 'QRIS';
      case 'transfer':
        return 'Transfer Bank';
      case 'card':
        return 'Kartu';
      default:
        return paymentMethod;
    }
  }

  @override
  List<Object?> get props => [
        id,
        orderId,
        orderNumber,
        amount,
        paymentMethod,
        status,
        proofImageUrl,
        verifiedBy,
        verifiedByName,
        verifiedAt,
        notes,
        createdAt,
        updatedAt,
      ];
}
