import 'package:equatable/equatable.dart';

/// Cash summary entity for end-of-day reconciliation
class CashSummaryEntity extends Equatable {
  final String id;
  final DateTime date;
  final double openingBalance;
  final double expectedCash;
  final double actualCash;
  final double difference;
  final int totalCashTransactions;
  final int totalQrisTransactions;
  final int totalTransferTransactions;
  final double totalCashAmount;
  final double totalQrisAmount;
  final double totalTransferAmount;
  final String? notes;
  final String employeeId;
  final String employeeName;
  final DateTime createdAt;

  const CashSummaryEntity({
    required this.id,
    required this.date,
    required this.openingBalance,
    required this.expectedCash,
    required this.actualCash,
    required this.difference,
    required this.totalCashTransactions,
    required this.totalQrisTransactions,
    required this.totalTransferTransactions,
    required this.totalCashAmount,
    required this.totalQrisAmount,
    required this.totalTransferAmount,
    this.notes,
    required this.employeeId,
    required this.employeeName,
    required this.createdAt,
  });

  /// Check if cash matches expected amount
  bool get isBalanced => difference.abs() < 0.01;

  /// Check if there's a cash shortage
  bool get hasShortage => difference < -0.01;

  /// Check if there's a cash surplus
  bool get hasSurplus => difference > 0.01;

  /// Get total revenue
  double get totalRevenue => totalCashAmount + totalQrisAmount + totalTransferAmount;

  /// Get total transactions
  int get totalTransactions =>
      totalCashTransactions + totalQrisTransactions + totalTransferTransactions;

  @override
  List<Object?> get props => [
        id,
        date,
        openingBalance,
        expectedCash,
        actualCash,
        difference,
        totalCashTransactions,
        totalQrisTransactions,
        totalTransferTransactions,
        totalCashAmount,
        totalQrisAmount,
        totalTransferAmount,
        notes,
        employeeId,
        employeeName,
        createdAt,
      ];
}
