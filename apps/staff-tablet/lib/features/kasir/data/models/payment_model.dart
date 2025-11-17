import '../../domain/entities/payment_entity.dart';

class PaymentModel extends PaymentEntity {
  const PaymentModel({
    required super.id,
    required super.orderId,
    required super.orderNumber,
    required super.amount,
    required super.paymentMethod,
    required super.status,
    super.proofImageUrl,
    super.verifiedBy,
    super.verifiedByName,
    super.verifiedAt,
    super.notes,
    required super.createdAt,
    required super.updatedAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    // Handle joined order data
    String orderNum = 'Unknown';
    if (json['order'] != null && json['order'] is Map) {
      orderNum = json['order']['order_number'] as String? ?? 'Unknown';
    } else if (json['order_number'] != null) {
      orderNum = json['order_number'] as String;
    }

    // Handle joined employee data for verification
    String? verifiedByName;
    if (json['verified_by_employee'] != null && json['verified_by_employee'] is Map) {
      verifiedByName = json['verified_by_employee']['name'] as String?;
    } else if (json['verified_by_name'] != null) {
      verifiedByName = json['verified_by_name'] as String?;
    }

    return PaymentModel(
      id: json['id'] as String,
      orderId: json['order_id'] as String,
      orderNumber: orderNum,
      amount: (json['amount'] as num).toDouble(),
      paymentMethod: json['payment_method'] as String,
      status: json['status'] as String,
      proofImageUrl: json['proof_image_url'] as String?,
      verifiedBy: json['verified_by'] as String?,
      verifiedByName: verifiedByName,
      verifiedAt: json['verified_at'] != null
          ? DateTime.parse(json['verified_at'] as String)
          : null,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_id': orderId,
      'amount': amount,
      'payment_method': paymentMethod,
      'status': status,
      if (proofImageUrl != null) 'proof_image_url': proofImageUrl,
      if (verifiedBy != null) 'verified_by': verifiedBy,
      if (verifiedAt != null) 'verified_at': verifiedAt!.toIso8601String(),
      if (notes != null) 'notes': notes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory PaymentModel.fromEntity(PaymentEntity entity) {
    return PaymentModel(
      id: entity.id,
      orderId: entity.orderId,
      orderNumber: entity.orderNumber,
      amount: entity.amount,
      paymentMethod: entity.paymentMethod,
      status: entity.status,
      proofImageUrl: entity.proofImageUrl,
      verifiedBy: entity.verifiedBy,
      verifiedByName: entity.verifiedByName,
      verifiedAt: entity.verifiedAt,
      notes: entity.notes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  PaymentEntity toEntity() => this;
}
