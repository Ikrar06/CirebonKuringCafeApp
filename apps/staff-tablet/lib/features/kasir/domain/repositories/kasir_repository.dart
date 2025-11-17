import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/cash_summary_entity.dart';
import '../entities/order_with_payment_entity.dart';
import '../entities/payment_entity.dart';

/// Repository interface for cashier operations
abstract class KasirRepository {
  /// Get orders pending payment
  Future<Either<Failure, List<OrderWithPaymentEntity>>> getPendingPayments();

  /// Get all orders with payments for today
  Future<Either<Failure, List<OrderWithPaymentEntity>>> getTodayOrders();

  /// Watch orders with payments stream (realtime)
  Stream<Either<Failure, List<OrderWithPaymentEntity>>> watchOrders();

  /// Verify payment
  Future<Either<Failure, PaymentEntity>> verifyPayment(String paymentId);

  /// Get payment by order ID
  Future<Either<Failure, PaymentEntity>> getPaymentByOrderId(String orderId);

  /// Create cash summary
  Future<Either<Failure, CashSummaryEntity>> createCashSummary(CashSummaryEntity summary);

  /// Get today's cash summary
  Future<Either<Failure, CashSummaryEntity?>> getTodayCashSummary();

  /// Get cash summaries by date range
  Future<Either<Failure, List<CashSummaryEntity>>> getCashSummaries({
    required DateTime startDate,
    required DateTime endDate,
  });
}
