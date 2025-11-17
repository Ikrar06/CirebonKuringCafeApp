import '../../domain/entities/cash_summary_entity.dart';

class CashSummaryModel extends CashSummaryEntity {
  const CashSummaryModel({
    required super.id,
    required super.date,
    required super.openingBalance,
    required super.expectedCash,
    required super.actualCash,
    required super.difference,
    required super.totalCashTransactions,
    required super.totalQrisTransactions,
    required super.totalTransferTransactions,
    required super.totalCashAmount,
    required super.totalQrisAmount,
    required super.totalTransferAmount,
    super.notes,
    required super.employeeId,
    required super.employeeName,
    required super.createdAt,
  });

  factory CashSummaryModel.fromJson(Map<String, dynamic> json) {
    // Handle joined employee data
    String employeeName = 'Unknown';
    if (json['employee'] != null && json['employee'] is Map) {
      employeeName = json['employee']['name'] as String? ?? 'Unknown';
    } else if (json['employee_name'] != null) {
      employeeName = json['employee_name'] as String;
    }

    return CashSummaryModel(
      id: json['id'] as String,
      date: DateTime.parse(json['date'] as String),
      openingBalance: (json['opening_balance'] as num).toDouble(),
      expectedCash: (json['expected_cash'] as num).toDouble(),
      actualCash: (json['actual_cash'] as num).toDouble(),
      difference: (json['difference'] as num).toDouble(),
      totalCashTransactions: json['total_cash_transactions'] as int,
      totalQrisTransactions: json['total_qris_transactions'] as int,
      totalTransferTransactions: json['total_transfer_transactions'] as int,
      totalCashAmount: (json['total_cash_amount'] as num).toDouble(),
      totalQrisAmount: (json['total_qris_amount'] as num).toDouble(),
      totalTransferAmount: (json['total_transfer_amount'] as num).toDouble(),
      notes: json['notes'] as String?,
      employeeId: json['employee_id'] as String,
      employeeName: employeeName,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'opening_balance': openingBalance,
      'expected_cash': expectedCash,
      'actual_cash': actualCash,
      'difference': difference,
      'total_cash_transactions': totalCashTransactions,
      'total_qris_transactions': totalQrisTransactions,
      'total_transfer_transactions': totalTransferTransactions,
      'total_cash_amount': totalCashAmount,
      'total_qris_amount': totalQrisAmount,
      'total_transfer_amount': totalTransferAmount,
      if (notes != null) 'notes': notes,
      'employee_id': employeeId,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory CashSummaryModel.fromEntity(CashSummaryEntity entity) {
    return CashSummaryModel(
      id: entity.id,
      date: entity.date,
      openingBalance: entity.openingBalance,
      expectedCash: entity.expectedCash,
      actualCash: entity.actualCash,
      difference: entity.difference,
      totalCashTransactions: entity.totalCashTransactions,
      totalQrisTransactions: entity.totalQrisTransactions,
      totalTransferTransactions: entity.totalTransferTransactions,
      totalCashAmount: entity.totalCashAmount,
      totalQrisAmount: entity.totalQrisAmount,
      totalTransferAmount: entity.totalTransferAmount,
      notes: entity.notes,
      employeeId: entity.employeeId,
      employeeName: entity.employeeName,
      createdAt: entity.createdAt,
    );
  }

  CashSummaryEntity toEntity() => this;
}
